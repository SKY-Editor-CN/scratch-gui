/**
 * protocol.js —— SKY Editor 远程协作（方案A 后台原型）消息协议定义
 *
 * 所有 WebSocket 消息均为 JSON 文本帧（utf-8 编码的字符串）。
 * 本文件只定义消息类型常量与消息构造/解析辅助函数，服务端与客户端共用，
 * 保证收发双方对协议的理解一致。
 *
 * 设计目标：轻量、可扩展。将来升级方案B（SKY-Collab-Server）时，
 * 只需在同一协议栈上新增鉴权 / 版本号 / 持久化字段，不必推翻消息骨架。
 */

'use strict';

// ---------------------------------------------------------------------------
// 消息类型常量
// ---------------------------------------------------------------------------
// client -> server
const MSG_JOIN = 'join'; // 加入房间
const MSG_LEAVE = 'leave'; // 离开房间
const MSG_RELAY = 'relay'; // 转发消息（CRDT 增量 / 初始化状态等）

// server -> client
const MSG_WELCOME = 'welcome'; // 加入成功，返回房间信息与成员列表
const MSG_MEMBER_JOINED = 'member-joined'; // 房间有新成员加入（含其初始状态）
const MSG_MEMBER_LEFT = 'member-left'; // 房间有成员离开
const MSG_SYNC = 'sync'; // 定向转发到某个客户端（CRDT 数据）

// relay / sync 消息内部的 kind（业务子类型），便于将来扩展更多同步数据类型
const KIND_INIT_STATE = 'init-state'; // 全量初始状态（新成员加入时拉取房间现状）
const KIND_UPDATE = 'yjs-update'; // Yjs 增量更新（日常实时同步）

// ---------------------------------------------------------------------------
// 消息构造辅助函数
// ---------------------------------------------------------------------------

/**
 * 构造 client -> server 的 join 消息。
 * @param {string} roomId 房间号
 * @param {string} clientId 客户端唯一标识
 * @param {string} displayName 展示名（方案A 匿名昵称）
 * @param {string|null} state 本地 Yjs 文档的全量状态（base64），可为 null
 * @returns {object}
 */
function buildJoin(roomId, clientId, displayName, state) {
  return { type: MSG_JOIN, roomId, clientId, displayName, state: state || null };
}

/**
 * 构造 client -> server 的 leave 消息。
 */
function buildLeave(roomId, clientId) {
  return { type: MSG_LEAVE, roomId, clientId };
}

/**
 * 构造 client -> server 的 relay 消息。
 * @param {string} roomId
 * @param {string} from 发送方 clientId
 * @param {string|null} to 目标 clientId；为 null 表示广播给房间内除 from 外的所有成员
 * @param {string} kind 业务子类型（KIND_INIT_STATE / KIND_UPDATE ...）
 * @param {*} payload 业务数据
 */
function buildRelay(roomId, from, to, kind, payload) {
  return { type: MSG_RELAY, roomId, from, to: to || null, kind, payload };
}

/**
 * 构造 server -> client 的 welcome 消息。
 */
function buildWelcome(roomId, clientId, members) {
  return { type: MSG_WELCOME, roomId, clientId, members };
}

/**
 * 构造 server -> client 的 member-joined 消息。
 * @param {string} roomId
 * @param {{clientId:string, displayName:string}} member 新成员信息
 * @param {string|null} state 新成员携带的初始 Yjs 状态（base64）
 */
function buildMemberJoined(roomId, member, state) {
  return { type: MSG_MEMBER_JOINED, roomId, member, state: state || null };
}

/**
 * 构造 server -> client 的 member-left 消息。
 */
function buildMemberLeft(roomId, clientId) {
  return { type: MSG_MEMBER_LEFT, roomId, clientId };
}

/**
 * 构造 server -> client 的 sync 消息（定向转发）。
 * @param {string} from 原始发送方 clientId
 * @param {string} kind 业务子类型
 * @param {*} payload 业务数据
 */
function buildSync(from, kind, payload) {
  return { type: MSG_SYNC, from, kind, payload };
}

/**
 * 把对象序列化为 WebSocket 文本帧。
 * @param {object} obj
 * @returns {string}
 */
function encode(obj) {
  return JSON.stringify(obj);
}

/**
 * 解析 WebSocket 文本帧。
 * @param {string} raw
 * @returns {object|null} 解析失败返回 null
 */
function decode(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

module.exports = {
  MSG_JOIN,
  MSG_LEAVE,
  MSG_RELAY,
  MSG_WELCOME,
  MSG_MEMBER_JOINED,
  MSG_MEMBER_LEFT,
  MSG_SYNC,
  KIND_INIT_STATE,
  KIND_UPDATE,
  buildJoin,
  buildLeave,
  buildRelay,
  buildWelcome,
  buildMemberJoined,
  buildMemberLeft,
  buildSync,
  encode,
  decode,
};
