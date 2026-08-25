---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 8caf5a5285e38b1ae7e57554b1d0e672_7424fc089e8e11f1a238525400e6dd8f
    ReservedCode1: 7WfQQmDXPWv6hTIA/RYVCpqXoAv1J7a2fKr1eHjAVaCqEvjot2TwOL9Ajcemt58DtAUZQSx6rcp24KTQlQ6QWkvk2eR6CnDZUXZfwgYixF7MSN/dc27oBK2e0OPnAMhh4qoRV3TZNvVXQQ5dlkbxIBZzu2Ue63QEi340y8TuV1NSSfoYd7fRpzj2hZo=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 8caf5a5285e38b1ae7e57554b1d0e672_7424fc089e8e11f1a238525400e6dd8f
    ReservedCode2: 7WfQQmDXPWv6hTIA/RYVCpqXoAv1J7a2fKr1eHjAVaCqEvjot2TwOL9Ajcemt58DtAUZQSx6rcp24KTQlQ6QWkvk2eR6CnDZUXZfwgYixF7MSN/dc27oBK2e0OPnAMhh4qoRV3TZNvVXQQ5dlkbxIBZzu2Ue63QEi340y8TuV1NSSfoYd7fRpzj2hZo=
---

# SKY Editor 远程协作功能 · 架构调研报告

> 调研日期：2026-08-23
> 项目根目录：`E:\秦始皇计划\SKY Editor\scratch-gui`
> 目标：为方案A（addon + Yjs + 轻量信令）落地前的实现做准备，梳理与远程协作直接相关的 6 项架构信息。
> 原则：只读调研，未修改任何文件。

---

## 1. 项目整体目录结构概览

`src/` 顶层主要模块：

| 目录/文件 | 职责 |
|------|------|
| `src/addons/` | TurboWarp addon 扩展机制（本方案A的落点） |
| `src/containers/` | React 容器组件（连接 redux，如 gui、stage、blocks、menu-bar-hoc 等） |
| `src/components/` | React 展示组件（纯 UI，如 menu-bar、stage、gui 等，按模块分子目录） |
| `src/reducers/` | redux 状态切片（含 project-state、vm、project-changed、gui、mode 等 37 个） |
| `src/lib/` | 工具/HOC（vm-manager-hoc、vm-listener-hoc、project-saver-hoc、storage、tw-* 系列等） |
| `src/css/`、`src/examples/`、`src/playground/`、`src/generated/` | 样式 / 示例 / 调试入口 / 构建生成物 |

关键定位结论：
- 这是一个 **TurboWarp 修改版** scratch-gui（大量 `tw-*` 前缀的组件与 lib 文件），addon 机制完整保留。
- `src/reducers/` 共 37 个状态切片；与项目/VM 直接相关的是 `project-state.js`、`vm.js`、`project-changed.js`、`gui.js`、`mode.js`、`editor-tab.js`。
- `src/lib/` 中与保存/VM 数据流相关的核心：`vm-manager-hoc.jsx`（VM 创建与加载）、`vm-listener-hoc.jsx`（VM 事件绑定）、`project-saver-hoc.jsx`（自动保存）、`save-project-to-server.js`（服务端保存）、`tw-restore-point-api.js`（TW 恢复点，含项目 JSON 序列化参考实现）。

---

## 2. addon 扩展机制实现方式

### 2.1 目录结构与生命周期

本项目的 addon 机制是 **Scratch Addons 体系的 TurboWarp 改造版**。与上游标准不同，这里 addon 清单不是独立的 `addon.json`，而是**编译期由 `pull.js` 生成**的 `_manifest_entry.js` / `_runtime_entry.js` 成对文件。

一个典型 addon 目录（以 `src/addons/addons/editor-theme3/` 为例）：

```
editor-theme3/
├── _manifest_entry.js      # 由 pull.js 生成：addon 的 manifest（name/settings/userscripts/userstyles 声明）
├── _runtime_entry.js       # 由 pull.js 生成：资源打包清单（js/css/svg 的 import 映射）
├── theme3.js               # 实际入口脚本（userscript）
├── theme3.css              # 主样式
├── black_text.css 等        # 条件样式（随设置切换）
└── icons/…                 # 静态资源
```

`_manifest_entry.js`（manifest 关键字段）示例（`editor-theme3`）：

```js
const manifest = {
  "editorOnly": true,
  "noTranslations": true,
  "name": "Customizable block colors",
  "dynamicDisable": true,               // 支持运行时开关
  "userscripts": [{ "url": "theme3.js" }],
  "userstyles": [
    { "url": "theme3.css" },
    { "url": "black_text.css", "if": { "settings": { "text": "black" } } }  // 条件样式
  ],
  "settings": [                          // 设置项声明
    { "dynamic": true, "name": "motion", "id": "motion-color", "type": "color", "default": "#4C97FF" },
    …
  ]
};
```

### 2.2 注册与运行流程

1. `src/addons/addons.js`：静态清单数组（仅被 `pull.js` 使用，非运行时）。
2. `src/addons/pull.js`：从清单生成 `src/addons/generated/` 下的 `addon-manifests.js`、`addon-entries.js`、`l10n-entries.js` 等。
3. `src/addons/entry.js`：运行时入口，仅一行 `import('./api')`（webpack 动态 chunk）。
4. `src/addons/api.js`：`AddonRunner` 类（api.js L750 附近）负责运行每个 addon——从 `addon-manifests` 取 manifest，构造 `publicAPI = { addon: { tab, settings, self }, msg, safeMsg }` 注入到 userscript 模块作用域。addon 的 userscript 入口即为 `export default async function ({addon, msg, …})`。

### 2.3 设置/开关读取

- 设置**定义**在 `_manifest_entry.js` 的 `manifest.settings` 数组（`id` / `type` / `default`）。
- 设置**存储**在 `src/addons/settings-store.js` + `settings-store-singleton.js`（浏览器 localStorage，按 addonId + settingId 存储）。
- 设置**读取**：`addon.settings.get(settingId)`（api.js 的 `Settings` 类 → `SettingsStore.getAddonSetting(this._addonId, id)`）；`addon.settings` 还派发 `'change'` 事件供运行时响应（api.js `settingsChanged`）。
- **开关（启用/禁用）**：`addon.self.disabled`；启用状态由设置 UI 与 `AddonRunner` 管理，`dynamicDisable` 支持运行时热切换。
- **静态资源**：`addon.self.getResource('/路径')` 从 `_runtime_entry.js` 的 `resources` 映射取 URL。

### 2.4 addon 运行时 API 清单（对方案A最关键）

| API | 位置（api.js） | 用途 |
|------|------|------|
| `addon.tab.traps.vm` | L199-202：`reduxInstance.state.scratchGui.vm` | **获取 VM 实例**（方案A绑定编辑器数据流的关键） |
| `addon.tab.traps.getBlockly()` | L204 | 异步获取 ScratchBlocks |
| `addon.tab.redux` | L247 + `src/addons/redux.js` | 订阅全局 redux `statechanged`（detail 含 action/prev/next），可 `dispatch`（方案A房间状态写入自定义 reducer 的通道） |
| `addon.tab.waitForElement(selector, {reduxCondition, reduxEvents})` | L251 | 等待 DOM/状态满足条件后挂载 UI |
| `addon.tab.appendToSharedSpace({space, element, order, scope})` | L305 | 向固定挂载点插入 UI 元素（详见第 5 章） |
| `addon.tab.createEditorContextMenu(cb, opts)` | L599 | 编辑器右键菜单 |
| `addon.settings.get(id)` | L750 | 读取设置 |
| `addon.self` / `addon.self.getResource()` | L760 | addon 自身元信息与资源 |

> 结论：方案A的 addon 骨架可直接套用上述结构——新建 `src/addons/addons/sky-collab/`（含 `_manifest_entry.js` 声明 settings、`userscript.js` 入口），并在 `addons.js` 清单追加条目，随后由 `pull.js` 重新生成。VM 数据流接入通过 `addon.tab.traps.vm` 完成。

---

## 3. 项目状态机（src/reducers/project-state.js）

文件：`src/reducers/project-state.js`（542 行）。

### 3.1 状态集合（LoadingState，16 个）

```
NOT_LOADED / ERROR / AUTO_UPDATING / CREATING_COPY / CREATING_NEW /
FETCHING_NEW_DEFAULT / FETCHING_WITH_ID / LOADING_VM_FILE_UPLOAD /
LOADING_VM_NEW_DEFAULT / LOADING_VM_WITH_ID / MANUAL_UPDATING /
REMIXING / SHOWING_WITH_ID / SHOWING_WITHOUT_ID /
UPDATING_BEFORE_COPY / UPDATING_BEFORE_NEW
```

### 3.2 关键事件（action type，25 个）

```
SET_PROJECT_ID / START_FETCHING_NEW / START_LOADING_VM_FILE_UPLOAD /
START_AUTO_UPDATING / START_MANUAL_UPDATING / START_CREATING_NEW / START_CREATING_COPY(经UPDATING_BEFORE_COPY) /
START_REMIXING / START_ERROR / RETURN_TO_SHOWING /
DONE_FETCHING_WITH_ID / DONE_FETCHING_DEFAULT / DONE_LOADING_VM_WITH_ID /
DONE_LOADING_VM_WITHOUT_ID / DONE_LOADING_VM_TO_SAVE / DONE_UPDATING /
DONE_UPDATING_BEFORE_COPY / DONE_UPDATING_BEFORE_NEW / DONE_CREATING_NEW / DONE_CREATING_COPY / DONE_REMIXING
```

### 3.3 加载/保存时机（对方案A的意义）

- **项目加载链路**：`SET_PROJECT_ID`（有 ID）→ `FETCHING_WITH_ID`（拉取 projectData）→ `LOADING_VM_WITH_ID`（写入 VM）→ `SHOWING_WITH_ID`。无 ID（新建/上传）走 `LOADING_VM_FILE_UPLOAD` / `LOADING_VM_NEW_DEFAULT` → `SHOWING_WITHOUT_ID`。
- **保存时机**：`START_AUTO_UPDATING` / `START_MANUAL_UPDATING` 均由 `SHOWING_WITH_ID` 触发，保存完成回 `SHOWING_WITH_ID`。
- **可供协作功能订阅的“就绪信号”**：当 `loadingState === SHOWING_WITH_ID || SHOWING_WITHOUT_ID` 时项目已在 VM 中可用（`getIsShowingProject()`）。方案A的 ProjectCodec 初始化（导入/合并协作文档）应挂在**首次进入 SHOWING 状态**之后，避免在加载中途读 VM。
- **错误处理**：`START_ERROR` 对拉取/加载类状态进入 `ERROR`（致命），对保存/更新类回退 `SHOWING_WITH_ID` 并记录 error（非致命）。

---

## 4. scratch-gui 与 scratch-vm 的数据流

### 4.1 VM 实例获取

- redux：`state.scratchGui.vm`（在 `containers/gui.jsx` 中经 `connect` 以 props 传入子组件）。
- addon：`addon.tab.traps.vm`（api.js L202 直接返回 `reduxInstance.state.scratchGui.vm`）。
- VM 创建与项目加载入口：`src/lib/vm-manager-hoc.jsx`（`new VM()`、`this.props.vm.loadProject(this.props.projectData)`、`this.props.vm.start()`）。

### 4.2 本地编辑事件（PROJECT_CHANGED 类）

核心监听器：`src/lib/vm-listener-hoc.jsx`（HOC，在 `src/containers/gui.jsx` 中使用）。它把 VM 事件桥接到 redux，典型绑定方式：

```js
this.props.vm.on('targetsUpdate', this.handleTargetsUpdate);
this.props.vm.on('MONITORS_UPDATE', this.props.onMonitorsUpdate);
this.props.vm.on('BLOCK_DRAG_UPDATE', this.props.onBlockDragUpdate);
this.props.vm.on('PROJECT_CHANGED', this.handleProjectChanged);  // ← 编辑变化核心信号
this.props.vm.on('PROJECT_RUN_START' / 'PROJECT_RUN_STOP' / 'PROJECT_START', …);
// TW 扩展事件：HAS_CLOUD_DATA_UPDATE / COMPILE_ERROR / FRAMERATE_CHANGED / INTERPOLATION_CHANGED 等
```

`handleProjectChanged` 会派发 `setProjectChanged()`（`src/reducers/project-changed.js`，reducer 仅存 boolean `changed`），用于驱动自动保存与“未保存”标记。

> 方案A注意：`PROJECT_CHANGED` 在**所有改动**（含撤销/恢复、远端通过 loadProject 等触发）后都会触发。若用它驱动 `pushLocalChanges`，需额外做“自己产生的变更 vs 远端回放产生的变更”的区分，避免**回环同步**（把远端变更再推回远端）。这是设计 SyncEngine 时要处理的要点。

### 4.3 保存/导出数据入口

| 方法 | 位置 | 说明 |
|------|------|------|
| `vm.saveProjectSb3()` | `src/containers/sb3-downloader.jsx` L305（`state.scratchGui.vm.saveProjectSb3.bind(...)`） | 返回 sb3 ZIP（JSZip）字节 |
| `vm.saveProjectSb3Stream()` | 同上 L306 | 流式导出 |
| `vm.saveProjectSb3DontZip()` | `src/lib/tw-restore-point-api.js` L305 | 返回 `{ 'project.json': …, '<md5ext>': … }` 对象（含全部资源），**不做 ZIP**——最适合方案A做“本地项目快照 → 编码进协作文档”的原始数据源 |
| `vm.toJSON()` | `src/lib/project-saver-hoc.jsx` L228 | 返回当前项目 JSON（自动保存/服务端保存用） |
| `vm.loadProject(projectData)` | `src/lib/vm-manager-hoc.jsx` L74、`tw-restore-point-api.js` L594 | 加载项目（远端变更回写编辑器时用） |

- 自动保存链路：`src/lib/project-saver-hoc.jsx`（`projectChanged` 变化时调用 `updateProjectToStorage` → `saveProjectToServer`）；`src/lib/save-project-to-server.js` 为服务端保存实现。
- **TW 恢复点参考实现**：`src/lib/tw-restore-point-api.js` 已演示“用 `vm.saveProjectSb3DontZip()` 拿 project.json + assets → IndexedDB 持久化 → 重新 `vm.loadProject()` 恢复”的完整闭环，可作为方案A `ProjectCodec` 序列化与加载的现成参照。

---

## 5. 编辑器 UI 结构与协作面板挂载点

### 5.1 主布局（components/gui/gui.jsx，593 行）

`src/components/gui/gui.jsx` 是编辑器总布局，从上到下依次渲染：

| 区域 | 组件（文件） | 说明 |
|------|------|------|
| 全局 Modal/Manager | `TWSecurityManager`、`TWRestorePointManager`、`TW*Modal` | 顶层注入 |
| 菜单栏 | `<MenuBar>` → `src/components/menu-bar/menu-bar.jsx`（1336 行） | 文件/编辑/设置菜单 + TWSaveStatus、TWNews、账户信息组 |
| Tab 页签（工具栏区） | `<Tabs>` + `<TabList>`（react-tabs） | 积木/造型/声音三个 Tab |
| 积木区 | `<TabPanel>` → `<Blocks>` → `src/containers/blocks.jsx` | blocksWrapper |
| 造型区 / 声音区 | `<CostumeTab>` / `<SoundTab>` | TabPanel 内 |
| 舞台区 | `<StageWrapper>` → `src/containers/stage-wrapper.jsx` | 含 Alerts |
| 角色区 | `<TargetPane>` → `src/containers/target-pane.jsx` | stageAndTargetWrapper 内 |
| 其他 | `<Backpack>`、`<DragLayer>`、`<Watermark>` | 工具性组件 |

容器层：`src/containers/gui.jsx`（连接 redux，把 vm / projectData / projectChanged 等注入），是所有子组件的数据源。

### 5.2 addon 侧可直接用的挂载点（addon.tab.appendToSharedSpace）

`src/addons/api.js` 内置的 `SHARED_SPACES` 白名单（L306 起），**这是方案A协作面板 UI 的首选接入方式**（无需改 GUI 组件，符合铁律“能走扩展机制就别改内核”）：

| space 名称 | 挂载位置（DOM 锚点） | 适用 |
|------|------|------|
| `stageHeader` | 舞台头部 `stage-header_stage-size-row` | 协作按钮/成员指示 |
| `fullscreenStageHeader` | 全屏舞台头部按钮行 | 全屏态 |
| `afterGreenFlag` | 控制条（绿旗之后） | 工具栏型入口 |
| `afterStopButton` | 控制条（停止按钮之后） | 工具栏型入口 |
| `afterSoundTab` | TabList 声音 Tab 之后 | 新 Tab/入口（find-bar 也用此位置） |
| `monitor` | 变量监视器右键菜单 | 监视器扩展 |
| `paintEditorZoomControls` | 造型编辑器缩放控件 | 造型编辑态 |

`appendToSharedSpace({space, element, order, scope})` 通过 `order` 控制 addon 元素之间的排序，支持 `from`/`until` 锚点。

### 5.3 协作面板 UI 可选挂载位置建议（判断）

| 候选位置 | 方式 | 评价 |
|------|------|------|
| **菜单栏** | `MenuBar` 的 `accountInfoGroup`/`menuBarButton`（components/menu-bar/menu-bar.jsx） | 需改 GUI 组件（违背铁律），**不推荐**；除非用 `afterSoundTab` 等共享空间间接实现 |
| **TabList（工具栏）** | `appendToSharedSpace('afterSoundTab', …)` 插入“协作”入口 | **推荐**：addon 直达，无需改内核，与 find-bar 同款 |
| **控制条** | `appendToSharedSpace('afterGreenFlag'/'afterStopButton', …)` | 适合放“在线状态/成员数”小徽标 |
| **舞台头部** | `appendToSharedSpace('stageHeader', …)` | 适合放“房间号/在线成员”胶囊 |
| **全局弹层（房间面板主体）** | `addon.tab.waitForElement` + 自定义挂载（如 `document.body` 下浮层 / Modal） | 房间创建/加入/成员列表的主面板，**不依赖 appendToSharedSpace**，自由布局 |

> 结论：**入口用 `appendToSharedSpace('afterSoundTab')`，房间面板主体用独立浮层/Modal，成员/在线状态用 `stageHeader` 或 `afterGreenFlag`**，全部在 addon 作用域内完成，无需改 `components/gui/gui.jsx` 等上游文件。

---

## 6. addons 下协作相关代码痕迹确认

**结论：无。** 具体排查结果：

1. `src/addons/addons/` 下共 **82 个 addon**，全部是 Scratch Addons/TurboWarp 上游标准插件（find-bar、editor-theme3、folders、debugger、gamepad、cloud 相关等），**没有任何与协作/同步/房间/多人相关的 addon**。
2. 对 addon 目录内全部 js/css 做关键词扫描（collab/cooperat/room/remote/multiplayer/presence/sync/yjs），仅 `debugger/threads.js` 命中单词 `room`，为普通变量命名，与协作无关。
3. `package.json` 中**无** yjs、y-websocket、socket.io、ws 等协作/信令依赖（后续方案A需新增 `yjs` + 信令库，或自实现轻量 WebSocket 客户端）。
4. `src/` 下无任何目录/文件名含协作关键词；`remote-cooperation` 目录仅含本调研报告与《SKY-Editor-远程协作规划.md》文档，无代码。

---

## 附：方案A落点速查（关键文件绝对路径）

| 事项 | 路径 |
|------|------|
| addon 机制核心 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\addons\api.js` |
| addon 清单（pull.js 用） | `E:\秦始皇计划\SKY Editor\scratch-gui\src\addons\addons.js` |
| addon 设置存储 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\addons\settings-store.js` |
| addon redux 桥接 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\addons\redux.js` |
| 项目状态机 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\reducers\project-state.js` |
| 项目变更标记 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\reducers\project-changed.js` |
| VM 创建/加载 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\lib\vm-manager-hoc.jsx` |
| VM 事件绑定（PROJECT_CHANGED） | `E:\秦始皇计划\SKY Editor\scratch-gui\src\lib\vm-listener-hoc.jsx` |
| 自动保存链路 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\lib\project-saver-hoc.jsx` |
| 序列化/加载参考（saveProjectSb3DontZip / loadProject） | `E:\秦始皇计划\SKY Editor\scratch-gui\src\lib\tw-restore-point-api.js` |
| 编辑器主布局 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\components\gui\gui.jsx` |
| 菜单栏 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\components\menu-bar\menu-bar.jsx` |
| 舞台容器 / 角色区 | `E:\秦始皇计划\SKY Editor\scratch-gui\src\containers\stage-wrapper.jsx` / `target-pane.jsx` |
| 规划文档 | `E:\秦始皇计划\SKY Editor\scratch-gui\remote-cooperation\SKY-Editor-远程协作规划.md` |
*（内容由AI生成，仅供参考）*
