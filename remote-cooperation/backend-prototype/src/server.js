/**
 * server.js —— 轻量信令服务（方案A 后台原型）
 *
 * 职责（对齐规划文档 3.4 节"轻量信令服务设计"）：
 *   - 房间建立 / 成员进出通知
 *   - CRDT 同步消息转发（广播 + 定向）
 *   - 不做任何业务存储：房间状态仅存内存，连接断开即清理
 *
 * 运行方式：
 *   1) 独立启动：  node src/server.js            （默认端口 8090）
 *                 node src/server.js --port 9000
 *   2) 程序内启动（测试脚本使用）：startServer(port) 返回 { server, port, close }
 *
 * 与方案B 的关系：本服务职责将来被 SKY-Collab-Server 取代（见规划文档第 5 章），
 * 届时房间 API / 同步协议在其上扩展账号、持久化、版本历史即可。
 */

'use strict';

const { WebSocketServer } = require('ws');
const protocol = require('./protocol');

// 房间注册表：roomId -> Map<clientId, { ws, displayName }>
const rooms = new Map();

/**
 * 创建信令服务（可监听指定端口，或端口 0 自动分配）。
 * @param {number} port 监听端口；0 表示自动分配
 * @returns {Promise<{server: import('ws').WebSocketServer, port: number, close: () => Promise<void>, getRoom: (roomId:string)=>object|null}>}
 */
function startServer(port = 8090) {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port }, () => {
      const actualPort = wss.address().port;
      console.log(`[server] 轻量信令服务已启动 ws://localhost:${actualPort}`);
      resolve({
        server: wss,
        port: actualPort,
        close: () => closeServer(wss),
        getRoom: (roomId) => roomToJSON(roomId),
      });
    });
    wss.on('error', (err) => reject(err));

    wss.on('connection', (ws) => {
      ws.on('message', (raw) => onMessage(ws, raw));
      ws.on('close', () => onDisconnect(ws));
      ws.on('error', () => {}); // 防止未捕获的 socket 错误
    });
  });
}

// ---------------------------------------------------------------------------
// 消息处理
// ---------------------------------------------------------------------------

/**
 * 处理一条来自客户端的消息。
 */
function onMessage(ws, raw) {
  const msg = protocol.decode(raw.toString('utf-8'));
  if (!msg || typeof msg.type !== 'string') return;

  switch (msg.type) {
    case protocol.MSG_JOIN:
      handleJoin(ws, msg);
      break;
    case protocol.MSG_LEAVE:
      handleLeave(ws, msg);
      break;
    case protocol.MSG_RELAY:
      handleRelay(ws, msg);
      break;
    default:
      break; // 未知消息类型忽略
  }
}

/**
 * 处理 join：把客户端加入房间，通知新成员现状、广播新成员给他人。
 */
function handleJoin(ws, msg) {
  const { roomId, clientId, displayName } = msg;
  if (!roomId || !clientId) return;

  if (ws._clientId) {
    // 已注册的连接不允许重复 join，避免同一连接占用多个身份
    send(ws, protocol.encode({ type: 'error', message: 'already joined' }));
    return;
  }

  const room = getOrCreateRoom(roomId);
  if (room.has(clientId)) {
    send(ws, protocol.encode({ type: 'error', message: `clientId already in room: ${clientId}` }));
    return;
  }

  // 绑定连接身份
  ws._clientId = clientId;
  ws._roomId = roomId;
  room.set(clientId, { ws, displayName: displayName || `匿名-${clientId.slice(0, 4)}` });

  const member = { clientId, displayName: room.get(clientId).displayName };

  // 1) 回 welcome：通知新成员房间现状（成员列表）
  send(ws, protocol.encode(protocol.buildWelcome(roomId, clientId, roomMembersJSON(room))));

  // 2) 广播 member-joined：告诉房间内其他成员有新成员加入（携带新成员的初始状态）
  const state = typeof msg.state === 'string' ? msg.state : null;
  broadcast(room, clientId, protocol.encode(protocol.buildMemberJoined(roomId, member, state)));

  console.log(`[server] ${clientId} 加入房间 ${roomId}，当前成员 ${room.size} 人`);
}

/**
 * 处理 leave：把客户端移出房间并广播 member-left。
 */
function handleLeave(ws, msg) {
  const { roomId, clientId } = msg;
  if (ws._clientId !== clientId) return; // 身份不匹配，忽略
  removeClient(ws, roomId, clientId);
}

/**
 * 处理 relay：按目标转发消息。
 *   - msg.to 为空 => 广播给房间内除发送者外的所有成员
 *   - msg.to 指定 => 定向转发给目标成员
 */
function handleRelay(ws, msg) {
  const { roomId, from, to, kind, payload } = msg;
  if (!roomId || !from || !kind) return;
  if (ws._clientId !== from) return; // 防止伪造来源

  const room = rooms.get(roomId);
  if (!room) return;

  if (to) {
    // 定向转发
    const target = room.get(to);
    if (target) {
      send(target.ws, protocol.encode(protocol.buildSync(from, kind, payload)));
    }
  } else {
    // 广播转发
    const frame = protocol.encode(protocol.buildSync(from, kind, payload));
    broadcast(room, from, frame);
  }
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  return rooms.get(roomId);
}

/**
 * 向房间内除 excludeId 外的所有成员发送 frame。
 */
function broadcast(room, excludeId, frame) {
  for (const [cid, info] of room) {
    if (cid !== excludeId && info.ws.readyState === info.ws.OPEN) {
      send(info.ws, frame);
    }
  }
}

function send(ws, text) {
  if (ws.readyState === ws.OPEN) {
    ws.send(text);
  }
}

/**
 * 连接断开：自动清理其所在房间的成员身份并广播 member-left。
 */
function onDisconnect(ws) {
  if (!ws._roomId || !ws._clientId) return;
  removeClient(ws, ws._roomId, ws._clientId);
}

function removeClient(ws, roomId, clientId) {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(clientId);
    broadcast(room, clientId, protocol.encode(protocol.buildMemberLeft(roomId, clientId)));
    console.log(`[server] ${clientId} 离开房间 ${roomId}，当前成员 ${room.size} 人`);
    if (room.size === 0) {
      rooms.delete(roomId); // 房间无人时自动销毁
      console.log(`[server] 房间 ${roomId} 已销毁`);
    }
  }
  ws._roomId = null;
  ws._clientId = null;
}

function roomMembersJSON(room) {
  const members = [];
  for (const [cid, info] of room) {
    members.push({ clientId: cid, displayName: info.displayName });
  }
  return members;
}

function roomToJSON(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    roomId,
    memberCount: room.size,
    members: roomMembersJSON(room).map((m) => m.clientId),
  };
}

function closeServer(wss) {
  return new Promise((resolve) => {
    for (const client of wss.clients) {
      try {
        client.close();
      } catch (e) {
        /* ignore */
      }
    }
    wss.close(() => {
      rooms.clear();
      resolve();
    });
  });
}

// 命令行直接运行入口：node src/server.js [--port 8090]
if (require.main === module) {
  const argPort = process.argv.indexOf('--port');
  const port = argPort > -1 ? Number(process.argv[argPort + 1]) : 8090;
  startServer(port).catch((err) => {
    console.error('[server] 启动失败：', err.message);
    process.exit(1);
  });
}

module.exports = { startServer };
