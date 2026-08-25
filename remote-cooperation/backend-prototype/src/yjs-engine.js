/**
 * yjs-engine.js —— CRDT 同步核心（基于 Yjs 的封装）
 *
 * 本模块把 Yjs 的底层 API 封装成协作同步所需的最小能力集合：
 *   - createDoc           创建共享文档
 *   - encodeStateAsUpdate / encodeStateVector / createUpdate  序列化（全量 / 向量 / 增量）
 *   - applyUpdate         应用远端更新
 *   - observeUpdates      订阅本地文档变化（用于产生增量并广播）
 *   - toJSON / base64 编解码 辅助
 *
 * 设计考虑：
 *   - 这里不绑定任何传输层，纯做"文档状态计算"。上层（client.js / 将来的
 *     SyncEngineImplA）决定何时发送、发送给谁。
 *   - 增量采用 Yjs 标准的 "encodeStateAsUpdate(doc, stateVector)" 语义：
 *     只编码对方尚不知道的部分，网络开销小、天然去重，且多端并发修改
 *     由 Yjs 的 CRDT 机制自动收敛。
 *   - 升级方案B 时，可在此处保持同一套 API 语义，把底层换成服务端
 *     权威同步 / oplog，接口不动（对齐规划文档第 4.2 章 SyncEngine 抽象）。
 */

'use strict';

const Y = require('yjs');

/**
 * 创建一个新的共享文档（Y.Doc）。
 * @returns {Y.Doc}
 */
function createDoc() {
  return new Y.Doc();
}

/**
 * 获取文档根级 map（通用键值命名空间）。本原型用根 Y.Map 模拟
 * "协作者写入不同 key" 的场景；将来映射 Scratch 项目时，
 * 可在此扩展为 targets / blocks 等结构化 Yjs 类型（对齐规划文档 4.3 章）。
 * @param {Y.Doc} doc
 * @returns {Y.Map}
 */
function getRootMap(doc) {
  return doc.getMap('root');
}

/**
 * 编码文档的完整状态为一个 update（可完整恢复该文档）。
 * @param {Y.Doc} doc
 * @returns {Uint8Array}
 */
function encodeStateAsUpdate(doc) {
  return Y.encodeStateAsUpdate(doc);
}

/**
 * 编码文档的 state vector。两个文档的 state vector 相等 => 状态完全一致。
 * @param {Y.Doc} doc
 * @returns {Uint8Array}
 */
function encodeStateVector(doc) {
  return Y.encodeStateVector(doc);
}

/**
 * 生成相对某个 state vector 的增量 update（仅含对方缺失的部分）。
 * 若 stateVector 为 null，则等价于全量。
 * @param {Y.Doc} doc
 * @param {Uint8Array|null} stateVector 对方已知的状态向量；null 表示全量
 * @returns {Uint8Array}
 */
function createUpdate(doc, stateVector) {
  return Y.encodeStateAsUpdate(doc, stateVector);
}

/**
 * 把远端 update 应用到本地文档。Yjs 会自动合并并忽略冗余数据。
 * @param {Y.Doc} doc
 * @param {Uint8Array} update
 */
function applyUpdate(doc, update) {
  Y.applyUpdate(doc, update);
}

/**
 * 订阅文档变化。回调收到本次变化的增量 update（相对本地已有状态）。
 * @param {Y.Doc} doc
 * @param {(update: Uint8Array) => void} cb
 */
function observeUpdates(doc, cb) {
  doc.on('update', (update) => cb(update));
}

/**
 * 判断两个文档的 state vector 是否一致（用于收敛检测）。
 * @param {Y.Doc} a
 * @param {Y.Doc} b
 * @returns {boolean}
 */
function statesEqual(a, b) {
  const va = encodeStateVector(a);
  const vb = encodeStateVector(b);
  if (va.length !== vb.length) return false;
  for (let i = 0; i < va.length; i++) {
    if (va[i] !== vb[i]) return false;
  }
  return true;
}

/**
 * 把文档根 map 转成普通对象，便于断言与日志输出。
 * @param {Y.Doc} doc
 * @returns {object}
 */
function toPlainObject(doc) {
  return getRootMap(doc).toJSON();
}

// ---------- base64 <-> Uint8Array 编解码（用于 WebSocket 文本帧传输） ----------

/**
 * Uint8Array -> base64 字符串。
 */
function toBase64(uint8) {
  return Buffer.from(uint8).toString('base64');
}

/**
 * base64 字符串 -> Uint8Array。
 */
function fromBase64(b64) {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

module.exports = {
  createDoc,
  getRootMap,
  encodeStateAsUpdate,
  encodeStateVector,
  createUpdate,
  applyUpdate,
  observeUpdates,
  statesEqual,
  toPlainObject,
  toBase64,
  fromBase64,
};
