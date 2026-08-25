/**
 * client.js —— 协作客户端 SDK（方案A 后台原型）
 *
 * 一个客户端 = 一个 WebSocket 连接 + 一份本地 Yjs 共享文档。
 * 职责：
 *   - 连接信令服务并加入房间（携带本地初始状态）
 *   - 监听本地文档变化，把 Yjs 增量广播给房间内其他成员
 *   - 接收远端成员 / 数据，应用 CRDT 增量，最终多端收敛一致
 *
 * 本类面向"命令行/脚本自动化测试"与"将来 addon 的 SyncEngineImplA 移植"，
 * 事件通过 onEvent 回调暴露，便于上层接入（对齐规划文档第 4.2 章 SyncEngine 抽象）。
 */

'use strict';

const WebSocket = require('ws');
const engine = require('./yjs-engine');
const protocol = require('./protocol');

class CollabClient {
  /**
   * @param {object} opts
   * @param {string} opts.url 信令服务地址，如 ws://localhost:8090
   * @param {string} opts.roomId 房间号
   * @param {string} opts.clientId 本端唯一标识
   * @param {string} [opts.displayName] 展示名
   * @param {(event:string, data:any)=>void} [opts.onEvent] 事件回调
   */
  constructor(opts) {
    this.url = opts.url;
    this.roomId = opts.roomId;
    this.clientId = opts.clientId;
    this.displayName = opts.displayName || `匿名-${opts.clientId.slice(0, 4)}`;
    this.onEvent = opts.onEvent || (() => {});

    this.doc = engine.createDoc(); // 本地共享文档
    this.roomMembers = []; // 当前房间成员列表
    this.ws = null;
    this._closed = false;
  }

  /**
   * 建立连接并加入房间。返回 Promise，join 被服务端确认（welcome）后 resolve。
   */
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      const timer = setTimeout(() => {
        reject(new Error(`${this.clientId} 连接信令服务超时`));
        try {
          ws.terminate();
        } catch (e) {}
      }, 5000);

      ws.on('open', () => {
        // 1) 订阅本地文档变化：任何改动（含自己写入、远端应用）都会触发
        //    增量生成并广播给房间其他成员（Yjs update 事件自带自上次以来的增量）。
        engine.observeUpdates(this.doc, (update) => {
          if (this._closed || this.ws.readyState !== WebSocket.OPEN) return;
          const frame = protocol.encode(
            protocol.buildRelay(this.roomId, this.clientId, null, protocol.KIND_UPDATE, {
              update: engine.toBase64(update),
            })
          );
          this.ws.send(frame);
        });

        // 2) 发送 join（携带本地初始状态，让房间其他成员能学到本端已有内容）
        const fullState = engine.encodeStateAsUpdate(this.doc);
        const state = fullState.length > 0 ? engine.toBase64(fullState) : null;
        this.ws.send(
          protocol.encode(protocol.buildJoin(this.roomId, this.clientId, this.displayName, state))
        );
      });

      ws.on('message', (raw) => {
        const msg = protocol.decode(raw.toString('utf-8'));
        if (msg) this._handleMessage(msg);
      });

      ws.on('close', () => {
        this._closed = true;
        this.onEvent('disconnected', { clientId: this.clientId });
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      // welcome 到达后视为加入成功
      this._onWelcomeOnce = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case protocol.MSG_WELCOME: {
        this.roomMembers = msg.members || [];
        this.onEvent('welcome', { roomId: msg.roomId, members: this.roomMembers });
        if (this._onWelcomeOnce) {
          this._onWelcomeOnce();
          this._onWelcomeOnce = null;
        }
        break;
      }

      case protocol.MSG_MEMBER_JOINED: {
        const member = msg.member || {};
        if (!this.roomMembers.some((m) => m.clientId === member.clientId)) {
          this.roomMembers.push(member);
        }
        this.onEvent('member-joined', member);

        // 学习新成员携带的初始状态
        if (msg.state) {
          engine.applyUpdate(this.doc, engine.fromBase64(msg.state));
        }
        // 把自己的完整状态定向发给新成员，保证新成员能拿到房间现状
        const fullState = engine.encodeStateAsUpdate(this.doc);
        if (fullState.length > 0) {
          const frame = protocol.encode(
            protocol.buildRelay(
              this.roomId,
              this.clientId,
              member.clientId,
              protocol.KIND_INIT_STATE,
              { state: engine.toBase64(fullState) }
            )
          );
          if (this.ws.readyState === WebSocket.OPEN) this.ws.send(frame);
        }
        break;
      }

      case protocol.MSG_MEMBER_LEFT: {
        this.roomMembers = this.roomMembers.filter((m) => m.clientId !== msg.clientId);
        this.onEvent('member-left', { clientId: msg.clientId });
        break;
      }

      case protocol.MSG_SYNC: {
        const kind = msg.kind;
        const payload = msg.payload || {};
        if (kind === protocol.KIND_INIT_STATE && payload.state) {
          engine.applyUpdate(this.doc, engine.fromBase64(payload.state));
          this.onEvent('data', { from: msg.from, kind: 'init-state' });
        } else if (kind === protocol.KIND_UPDATE && payload.update) {
          engine.applyUpdate(this.doc, engine.fromBase64(payload.update));
          this.onEvent('data', { from: msg.from, kind: 'update' });
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * 向共享文档写入一个 key（模拟协作者的一次编辑）。
   * @param {string} key
   * @param {any} value
   */
  setKey(key, value) {
    engine.getRootMap(this.doc).set(key, value);
  }

  /**
   * 读取共享文档的 key。
   */
  getKey(key) {
    return engine.getRootMap(this.doc).get(key);
  }

  /**
   * 返回当前共享文档的完整快照（普通对象），用于断言收敛。
   */
  getSnapshot() {
    return engine.toPlainObject(this.doc);
  }

  /**
   * 当前房间成员列表（只读拷贝）。
   */
  getMembers() {
    return this.roomMembers.slice();
  }

  /**
   * 主动离开房间并断开连接。
   */
  leave() {
    this._closed = true;
    try {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          protocol.encode(protocol.buildLeave(this.roomId, this.clientId))
        );
      }
    } catch (e) {
      /* ignore */
    }
    try {
      this.ws.close();
    } catch (e) {
      /* ignore */
    }
  }
}

module.exports = { CollabClient };
