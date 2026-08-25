/**
 * sync-test.js —— 方案A 后台原型自动化测试
 *
 * 真实运行信令服务 + 多个真实 WebSocket 客户端，模拟多人协作：
 *   1. 双端编辑不同 key -> 断言双方收敛到相同内容
 *   2. 三端并发编辑不同 key -> 断言三端收敛一致
 *   3. 成员进出通知 -> 断言 member-joined / member-left 事件正确送达
 *
 * 运行：node test/sync-test.js
 * 输出：逐条 PASS/FAIL，最后打印汇总；任一失败则进程退出码为 1。
 */

'use strict';

const { startServer } = require('../src/server');
const { CollabClient } = require('../src/client');
const engine = require('../src/yjs-engine');

// ---------------------------------------------------------------------------
// 最小测试框架
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 轮询等待条件满足。
 * @param {() => boolean} predicate
 * @param {number} timeoutMs
 */
async function waitFor(predicate, timeoutMs = 4000, intervalMs = 80) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await sleep(intervalMs);
  }
  return predicate();
}

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`[test] PASS ${name}${detail ? ` (${detail})` : ''}`);
  } else {
    failed += 1;
    console.log(`[test] FAIL ${name}${detail ? ` (${detail})` : ''}`);
  }
}

/**
 * 语义化比较两个共享文档快照（忽略 key 顺序，因为各端 Y.Map 的键插入
 * 顺序可能不同，JSON.stringify 直接比较字符串会误判）。
 */
function sameSnapshot(a, b) {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return false;
    if (JSON.stringify(a[ka[i]]) !== JSON.stringify(b[kb[i]])) return false;
  }
  return true;
}

/**
 * 断言所有客户端的 Yjs 状态向量一致（真正的 CRDT 收敛）。
 */
function allConverged(clients) {
  if (clients.length === 0) return false;
  const firstVec = engine.encodeStateVector(clients[0].doc);
  return clients.every((c) => {
    const v = engine.encodeStateVector(c.doc);
    if (v.length !== firstVec.length) return false;
    for (let i = 0; i < v.length; i++) if (v[i] !== firstVec[i]) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// 用例实现
// ---------------------------------------------------------------------------

/**
 * 用例1：双端编辑不同 key，断言最终收敛到相同内容。
 */
async function testTwoClientsConverge(wsUrl) {
  const A = new CollabClient({ url: wsUrl, roomId: 'room-1', clientId: 'A', displayName: '阿尔法' });
  const B = new CollabClient({ url: wsUrl, roomId: 'room-1', clientId: 'B', displayName: '贝塔' });

  try {
    await A.connect();
    // A 先写入自己的 key
    A.setKey('author-a', 'message from A');
    await sleep(120); // 让 A 的增量广播完成

    await B.connect();
    // 等 B 通过 init-state 学到 A 的初始内容
    const bLearnedA = await waitFor(() => B.getKey('author-a') === 'message from A');
    check('B 加入后学到 A 的初始内容', bLearnedA);

    // B 写入自己的 key
    B.setKey('author-b', 'message from B');
    const aLearnedB = await waitFor(() => A.getKey('author-b') === 'message from B');
    check('A 实时收到 B 的增量', aLearnedB);

    // 收敛断言
    const conv = await waitFor(() => allConverged([A, B]));
    check('双端 Yjs 状态向量收敛一致', conv);

    const sa = A.getSnapshot();
    const sb = B.getSnapshot();
    const same = sameSnapshot(sa, sb);
    check(
      '双端共享内容完全相同',
      same,
      `snapshot=${JSON.stringify(sa)}`
    );
    check('快照含双方 key', same && sa['author-a'] === 'message from A' && sa['author-b'] === 'message from B');
  } finally {
    A.leave();
    B.leave();
    await sleep(120); // 等 leave 消息送达服务端
  }
}

/**
 * 用例2：三端并发编辑不同 key，断言三端最终一致。
 */
async function testThreeClientsConcurrent(wsUrl) {
  const clients = ['A', 'B', 'C'].map(
    (id) => new CollabClient({ url: wsUrl, roomId: 'room-2', clientId: id, displayName: `用户${id}` })
  );
  try {
    await clients[0].connect();
    await clients[1].connect();
    await clients[2].connect();
    await sleep(150); // 三端完成初始状态交换

    // 三端"几乎同时"各自写入不同 key（模拟并发编辑）
    clients[0].setKey('k-a', 'va');
    clients[1].setKey('k-b', 'vb');
    clients[2].setKey('k-c', 'vc');

    const conv = await waitFor(() => allConverged(clients));
    check('三端 Yjs 状态向量收敛一致', conv);

    const snaps = clients.map((c) => c.getSnapshot());
    const allSame = snaps.every((s) => sameSnapshot(s, snaps[0]));
    const complete = ['k-a', 'k-b', 'k-c'].every(
      (k, i) => snaps[0][k] === ['va', 'vb', 'vc'][i]
    );
    check('三端共享内容完全相同', allSame && complete, `snapshot=${JSON.stringify(snaps[0])}`);
  } finally {
    clients.forEach((c) => c.leave());
    await sleep(150);
  }
}

/**
 * 用例3：成员进出通知（member-joined / member-left）。
 */
async function testMembershipEvents(wsUrl) {
  const A = new CollabClient({ url: wsUrl, roomId: 'room-3', clientId: 'A', displayName: 'A' });
  const B = new CollabClient({ url: wsUrl, roomId: 'room-3', clientId: 'B', displayName: 'B' });
  const joinedA = [];
  const leftA = [];
  A.onEvent = (event, data) => {
    if (event === 'member-joined') joinedA.push(data.clientId);
    if (event === 'member-left') leftA.push(data.clientId);
  };

  try {
    await A.connect();
    await B.connect();
    await sleep(100);
    check('A 的成员列表含 A、B', A.getMembers().length === 2);

    // C 加入
    const C = new CollabClient({ url: wsUrl, roomId: 'room-3', clientId: 'C', displayName: 'C' });
    const joinedB = [];
    B.onEvent = (event, data) => {
      if (event === 'member-joined') joinedB.push(data.clientId);
      if (event === 'member-left') leftA.push(data.clientId);
    };
    await C.connect();
    const aSawC = await waitFor(() => joinedA.includes('C'));
    check('A 收到 C 加入通知', aSawC);
    const bSawC = await waitFor(() => joinedB.includes('C'));
    check('B 收到 C 加入通知', bSawC);
    check('C 的成员列表含 A、B、C', C.getMembers().length === 3);

    // C 离开
    C.leave();
    const aSawLeft = await waitFor(() => leftA.includes('C'));
    check('A 收到 C 离开通知', aSawLeft);
    check('A 成员列表收缩为 2 人', waitForSyncMembers(A, 2));
    C.ws = null; // 避免重复 close
  } finally {
    A.leave();
    B.leave();
    await sleep(120);
  }
}

function waitForSyncMembers(client, n) {
  return client.getMembers().length === n;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  const srv = await startServer(0);
  const wsUrl = `ws://localhost:${srv.port}`;
  console.log(`[test] 信令服务已启动：${wsUrl}`);

  try {
    await testTwoClientsConverge(wsUrl);
    await testThreeClientsConcurrent(wsUrl);
    await testMembershipEvents(wsUrl);
  } finally {
    await srv.close();
  }

  console.log('\n========================================');
  console.log(`[test] 结果：PASS ${passed} / FAIL ${failed}`);
  console.log('========================================');
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[test] 测试执行异常：', err);
  process.exitCode = 1;
});
