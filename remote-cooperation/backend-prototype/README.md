---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 8caf5a5285e38b1ae7e57554b1d0e672_cd526b9f9e9811f1a413525400287e28
    ReservedCode1: aZHcZKT+nYQVCrvBASFo/IFf6pj2OVtC04paKQzuv/zrftBmK5Sj1ZEZeBMyqlivkMGPgUlkswcCx2ZgITo73G2lJlszfBNRiC4/m20w6T16L4+RTUJOxFQ4tU0MRLc3P91rvX/w0JF5psK/4W/eusuyGFVp4l2QKzC5ov263NAJzu9uzo3mdoFViCw=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 8caf5a5285e38b1ae7e57554b1d0e672_cd526b9f9e9811f1a413525400287e28
    ReservedCode2: aZHcZKT+nYQVCrvBASFo/IFf6pj2OVtC04paKQzuv/zrftBmK5Sj1ZEZeBMyqlivkMGPgUlkswcCx2ZgITo73G2lJlszfBNRiC4/m20w6T16L4+RTUJOxFQ4tU0MRLc3P91rvX/w0JF5psK/4W/eusuyGFVp4l2QKzC5ov263NAJzu9uzo3mdoFViCw=
---

# SKY Editor 远程协作（方案A）后台原型 — backend-prototype

SKY Editor 远程协作功能的**纯后台原型**，对应《SKY-Editor-远程协作规划.md》第 2 章新决策：

> **方案A 开发顺序：先做纯后台（信令服务 + CRDT 同步核心），用命令行/脚本自动化测试跑通、稳定后再开发前端 UI。**

本目录是一个**独立的小型 Node.js 工程**，自带 `package.json` 与 `node_modules`（仅依赖 `ws` 和 `yjs`），**不污染 scratch-gui 主项目**。原型验证通过后，前端（TW addon 的 `SyncEngineImplA`）可直接复用这里的 `client.js` 同步语义与 `protocol.js` 消息协议。

---

## 1. 目录结构

```
backend-prototype/
├── package.json          # 独立工程定义（仅 ws + yjs 两个运行时依赖）
├── README.md             # 本文档
├── node_modules/         # npm 安装的依赖（不进入 scratch-gui 主项目）
├── src/
│   ├── server.js         # 轻量信令服务（WebSocket：房间 + 成员进出通知 + 消息转发）
│   ├── protocol.js       # 消息协议（类型常量 + 消息构造/解析，服务端与客户端共用）
│   ├── yjs-engine.js     # CRDT 同步核心（Yjs 封装：createDoc/applyUpdate/增量/收敛检测）
│   └── client.js         # 协作客户端 SDK（真实 WebSocket + 本地 Yjs 文档，供测试/将来前端复用）
└── test/
    └── sync-test.js      # 自动化测试（模拟多客户端编辑并断言收敛）
```

## 2. 环境要求

- Node.js >= 16（开发验证环境：Node v24.19.0）
- 无需全局安装任何东西

## 3. 快速开始

### 3.1 安装依赖（首次）

```bash
cd backend-prototype
npm install          # 只在本目录生成 node_modules，不触碰 scratch-gui 主项目
```

### 3.2 启动信令服务

```bash
# 方式一：npm 脚本
npm start

# 方式二：直接运行（可指定端口）
node src/server.js
node src/server.js --port 9000
```

启动成功后输出：

```
[server] 轻量信令服务已启动 ws://localhost:8090
```

### 3.3 运行自动化测试

```bash
npm test             # 等价于 node test/sync-test.js
```

测试会真实启动一个信令服务（随机端口），模拟 2~3 个客户端加入同一房间、各自对共享 Yjs 文档做编辑，断言多端收敛一致与成员进出通知，最后打印汇总：

```
[test] 结果：PASS 13 / FAIL 0
```

任一用例失败时进程退出码为 1（便于 CI 接入）。

### 3.4 真实测试结果（2026-08-23）

```
[test] PASS B 加入后学到 A 的初始内容
[test] PASS A 实时收到 B 的增量
[test] PASS 双端 Yjs 状态向量收敛一致
[test] PASS 双端共享内容完全相同 (snapshot={"author-a":"message from A","author-b":"message from B"})
[test] PASS 快照含双方 key
[test] PASS 三端 Yjs 状态向量收敛一致
[test] PASS 三端共享内容完全相同 (snapshot={"k-a":"va","k-b":"vb","k-c":"vc"})
[test] PASS A 收到 C 加入通知
[test] PASS B 收到 C 加入通知
[test] PASS C 的成员列表含 A、B、C
[test] PASS A 收到 C 离开通知
[test] PASS A 成员列表收缩为 2 人
[test] 结果：PASS 13 / FAIL 0
```

## 4. 协议约定

所有 WebSocket 消息均为 **JSON 文本帧**（UTF-8）。类型常量定义在 `src/protocol.js`，服务端与客户端共用同一套定义。

### 4.1 客户端 → 服务端

| 消息类型 | 字段 | 说明 |
|---------|------|------|
| `join` | `roomId`, `clientId`, `displayName`, `state?` | 加入房间；`state` 为本端 Yjs 文档全量状态（base64），可为 null |
| `leave` | `roomId`, `clientId` | 主动离开房间 |
| `relay` | `roomId`, `from`, `to?`, `kind`, `payload` | 转发消息；`to` 为空则广播给房间内除 `from` 外的所有成员，`to` 指定则定向转发 |

### 4.2 服务端 → 客户端

| 消息类型 | 字段 | 说明 |
|---------|------|------|
| `welcome` | `roomId`, `clientId`, `members[]` | 加入成功，返回成员列表 |
| `member-joined` | `roomId`, `member{clientId,displayName}`, `state?` | 有新成员加入（携带其初始状态） |
| `member-left` | `roomId`, `clientId` | 有成员离开 |
| `sync` | `from`, `kind`, `payload` | 定向转发数据（relay 的目标接收形态） |

### 4.3 relay / sync 内部的业务子类型（kind）

| kind | 方向语义 | payload |
|------|---------|---------|
| `init-state` | 新成员加入时，其他成员把自己的**全量** Yjs 状态定向发给新成员 | `{ state: base64 }` |
| `yjs-update` | 日常实时同步：文档变化产生的**增量** update 广播给房间其他成员 | `{ update: base64 }` |

### 4.4 状态同步机制（关键设计）

1. **加入即交换**：新成员 `join` 时携带自己的初始状态；服务端把该状态广播给房间内其他成员，其他成员再把自己的全量状态（`init-state`）定向回发，保证新成员拿到房间现状。
2. **增量同步**：每个客户端监听本地 Yjs 文档的 `update` 事件，把增量（Yjs 自上次以来变化）打包为 `yjs-update` 广播；收到远端 `sync` 后调用 `Y.applyUpdate` 应用。
3. **天然收敛**：Yjs 是 CRDT，各端并发编辑不同内容后，通过互相交换增量最终收敛到一致状态（测试用"状态向量相等 + 快照内容一致"双重断言验证）。

## 5. 设计说明与方案B 演进

- **协议层（`protocol.js`）**：消息骨架与具体业务解耦，`kind` 字段为将来扩展更多同步数据类型（如在线光标 Awareness、版本号、鉴权字段）预留位置。
- **同步核心（`yjs-engine.js`）**：仅做"文档状态计算"，不绑定传输层，接口语义（createDoc/applyUpdate/增量/收敛检测）可直接对齐规划文档第 4.2 章 `SyncEngine` 抽象。
- **信令服务（`server.js`）**：房间状态仅存内存、无持久化，职责单一（房间 + 转发）。方案B（SKY-Collab-Server）上线后，可在同一协议栈上扩展账号、持久化、版本历史与权限，前端通过第 4 章接口无缝替换实现（规划文档第 5 章）。

## 6. 后续工作（不在本原型范围）

- 前端 addon 接入：把 `client.js` 的同步语义移植为 `SyncEngineImplA`，对接 `addon.tab.traps.vm` 与 `PROJECT_CHANGED` 数据流。
- sb3 项目数据 ↔ Yjs 文档映射（规划文档第 4.3 章 `ProjectCodec`）：把 Scratch 的 `targets/blocks/costumes` 结构化映射为 Yjs 类型。
- 在线光标 / 成员面板等 UI（方案A 前端阶段）。
*（内容由AI生成，仅供参考）*
