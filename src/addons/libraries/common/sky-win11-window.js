// SKYEditor 仿 Win11 窗口交互引擎（纯 DOM，供 addons 复用）
// 逻辑逐行提炼自 src/components/tw-win11-window/win11-window.jsx（Win11Window）：
// 标题栏 transform 拖动 + mouseup 写回、双击最大化、右键系统菜单
// （还原/移动/大小/最小化/最大化/关闭 + 快捷键 m/s/n/x/c + Esc）、
// 8 向 resize（最小 500×300）、最小化仅标题栏、最大化铺满视口。
// 交互元素类名与 win11-window.css 语义一致：win11-controls / win11-button /
// win11-close / win11-resize-handle-* / win11-context-menu / win11-menu-item-*；
// 具体样式由宿主 addon 的 style.css 按 win11-window.css 观感提供。
// root 上由引擎维护 win11-maximized / win11-minimized / win11-interacting 状态类。

const MIN_W = 500;
const MIN_H = 300;
const CORNERS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const SVG = {
  min: '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0.5" y1="5" x2="9.5" y2="5" stroke="currentColor" stroke-width="1"/></svg>',
  max: '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
  restore: '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M 0.5 0.5 H 7.5 V 2.5 H 2.5 V 7.5 H 0.5 Z" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
  close: '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" stroke-width="1"/><line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" stroke-width="1"/></svg>',
};

export default function createSkyWin11Window (root, options) {
  const {
    headerElement,
    onClose,
    defaultWidth = 720,
    defaultHeight = 512,
    disableMaximize = false,
    disableResize = false,
  } = options;

  let enabled = false;
  let positioned = false;
  let minimized = false;
  let maximized = false;
  let pos = null;
  let size = { width: defaultWidth, height: defaultHeight };
  let preMaximize = null;
  let drag = null; // 标题栏拖动
  let interaction = null; // 菜单移动/大小
  let menuOpen = false;
  let lastClick = null;

  // ---- 标题栏窗口控件（最小化/最大化/关闭）----
  const controls = document.createElement("div");
  controls.className = "win11-controls";
  const makeButton = (html, title, cls, onClick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.title = title;
    b.className = cls;
    b.innerHTML = html;
    b.addEventListener("click", onClick);
    return b;
  };
  const minButton = makeButton(SVG.min, "最小化", "win11-button", () => toggleMinimized());
  const maxButton = makeButton(SVG.max, "最大化", "win11-button", () => toggleMaximize());
  const closeButton = makeButton(SVG.close, "关闭", "win11-button win11-close", onClose);
  controls.append(minButton, maxButton, closeButton);
  // 注入由 attachChrome/detachChrome 管理：仅 enabled（sky 主题）时挂载到 DOM，
  // 禁用时彻底移除，避免其他主题（如 TurboWarp）残留 win11 元素。
  ["mousedown", "contextmenu", "dblclick"].forEach((type) => {
    controls.addEventListener(type, (e) => e.stopPropagation());
  });

  // ---- 8 向 resize 热区 ----
  const resizeHandles = {};
  for (const corner of CORNERS) {
    const handle = document.createElement("div");
    handle.className = `win11-resize-handle win11-resize-handle-${corner}`;
    handle.addEventListener("mousedown", (e) => {
      if (!enabled || maximized || minimized) return;
      e.preventDefault();
      e.stopPropagation();
      beginResize(corner, e.clientX, e.clientY);
    });
    resizeHandles[corner] = handle;
  }

  // ---- 右键系统菜单 ----
  const menu = document.createElement("div");
  menu.className = "win11-context-menu";
  menu.style.display = "none";
  const addDivider = () => {
    const d = document.createElement("div");
    d.className = "win11-menu-item-divider";
    menu.appendChild(d);
  };
  const addMenuItem = (label, onClick, isDisabled) => {
    const item = document.createElement("div");
    item.className = "win11-menu-item";
    item.textContent = label;
    item.addEventListener("click", (e) => {
      if (isDisabled()) return;
      e.stopPropagation();
      closeMenu();
      onClick(e);
    });
    menu.appendChild(item);
  };
  addMenuItem("还原(R)", () => toggleMaximize(), () => !maximized || disableMaximize);
  addMenuItem("移动(M)", (e) => enterMoveMode(e.clientX, e.clientY), () => maximized);
  addMenuItem("大小(S)", (e) => enterResizeMode(e.clientX, e.clientY), () => maximized || disableResize);
  addDivider();
  addMenuItem("最小化(N)", () => setMinimized(true), () => false);
  addMenuItem("最大化(X)", () => toggleMaximize(), () => maximized || disableMaximize);
  addDivider();
  addMenuItem("关闭(C)", () => onClose(), () => false);

  const closeMenu = () => {
    menu.style.display = "none";
    menuOpen = false;
  };
  const openMenu = (x, y) => {
    drag && cancelDrag();
    commitInteraction();
    menu.style.left = Math.min(x, window.innerWidth - 180) + "px";
    menu.style.top = Math.min(y, window.innerHeight - 240) + "px";
    menu.style.display = "block";
    menuOpen = true;
  };
  document.addEventListener("mousedown", (e) => {
    if (menuOpen && !menu.contains(e.target)) closeMenu();
  });

  // ---- 布局 ----
  const applyLayout = () => {
    if (maximized) {
      root.style.left = "";
      root.style.top = "";
      root.style.width = "";
      root.style.height = "";
      root.style.transform = "";
      return; // 铺满视口由 .win11-maximized 的 CSS 控制
    }
    root.style.left = (pos ? pos.left : 0) + "px";
    root.style.top = (pos ? pos.top : 0) + "px";
    root.style.width = size.width + "px";
    root.style.height = size.height + "px";
  };
  const setMinimized = (v) => {
    if (v && maximized) toggleMaximize(); // 最大化状态下最小化先还原
    minimized = v;
    root.classList.toggle("win11-minimized", minimized && !maximized);
    closeMenu();
  };
  const toggleMinimized = () => setMinimized(!minimized);
  const toggleMaximize = () => {
    if (disableMaximize) return;
    if (maximized) {
      if (preMaximize) {
        pos = preMaximize.pos;
        size = preMaximize.size;
      }
      maximized = false;
      root.classList.remove("win11-maximized");
      applyLayout();
    } else {
      preMaximize = { pos: pos || { left: 0, top: 0 }, size };
      maximized = true;
      root.classList.add("win11-maximized");
      root.classList.remove("win11-minimized");
      minimized = false;
    }
    closeMenu();
  };

  // ---- 标题栏拖动（transform 位移，mouseup 写回）----
  const beginDrag = (startX, startY) => {
    if (maximized) return;
    drag = { startX, startY, dx: 0, dy: 0 };
    root.classList.add("win11-interacting");
    const handleMouseMove = (ev) => {
      if (!drag) return;
      // 边界 clamp：不允许拖出视口（对齐 win11-window.jsx）
      const maxX = Math.max(0, window.innerWidth - root.offsetWidth - pos.left);
      const maxY = Math.max(0, window.innerHeight - root.offsetHeight - pos.top);
      drag.dx = Math.max(-pos.left, Math.min(ev.clientX - drag.startX, maxX));
      drag.dy = Math.max(-pos.top, Math.min(ev.clientY - drag.startY, maxY));
      root.style.transform = `translate(${drag.dx}px, ${drag.dy}px)`;
    };
    const handleMouseUp = () => {
      if (!drag) return;
      pos = { left: pos.left + drag.dx, top: pos.top + drag.dy };
      root.style.left = pos.left + "px";
      root.style.top = pos.top + "px";
      drag = null;
      root.style.transform = "";
      cleanup();
      // 写回后下一帧再恢复 transition，保证跳变无动画
      requestAnimationFrame(() => root.classList.remove("win11-interacting"));
    };
    const cleanup = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    drag.cleanup = cleanup;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const cancelDrag = () => {
    if (drag) {
      if (drag.cleanup) drag.cleanup();
      drag = null;
    }
    root.style.transform = "";
    root.classList.remove("win11-interacting");
  };

  // ---- 菜单移动/大小（document 级 mousedown 提交）----
  const commitInteraction = () => {
    if (!interaction) return;
    const d = interaction;
    const wasMove = d.mode === "move";
    if (wasMove) {
      pos = { left: pos.left + d.dx, top: pos.top + d.dy };
      root.style.left = pos.left + "px";
      root.style.top = pos.top + "px";
    }
    root.style.transform = "";
    if (d.cleanup) d.cleanup();
    interaction = null;
    if (wasMove) {
      requestAnimationFrame(() => root.classList.remove("win11-interacting"));
    } else {
      root.classList.remove("win11-interacting");
    }
  };
  const enterMoveMode = (startX, startY) => {
    if (maximized) return;
    interaction = { mode: "move", startX, startY, dx: 0, dy: 0 };
    root.classList.add("win11-interacting");
    const handleMouseMove = (ev) => {
      if (!interaction || interaction.mode !== "move") return;
      interaction.dx = ev.clientX - interaction.startX;
      interaction.dy = ev.clientY - interaction.startY;
      root.style.transform = `translate(${interaction.dx}px, ${interaction.dy}px)`;
    };
    const handleMouseDown = () => commitInteraction();
    const cleanup = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
    };
    interaction.cleanup = cleanup;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
  };
  const enterResizeMode = (startX, startY) => {
    if (maximized) return;
    const rect = root.getBoundingClientRect();
    interaction = { mode: "resize", startX, startY, startLeft: rect.left, startTop: rect.top, startWidth: rect.width, startHeight: rect.height };
    root.classList.add("win11-interacting");
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const handleMouseMove = (ev) => {
      if (!interaction || interaction.mode !== "resize") return;
      const dx = ev.clientX - interaction.startX;
      const dy = ev.clientY - interaction.startY;
      size = {
        width: clamp(interaction.startWidth + dx, MIN_W, window.innerWidth - interaction.startLeft),
        height: clamp(interaction.startHeight + dy, MIN_H, window.innerHeight - interaction.startTop),
      };
      applyLayout();
    };
    const handleMouseDown = () => commitInteraction();
    const cleanup = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousedown", handleMouseDown);
    };
    interaction.cleanup = cleanup;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mousedown", handleMouseDown);
  };

  // ---- 8 向 resize（四角/四边热区直接拖动）----
  const beginResize = (corner, startX, startY) => {
    if (maximized) return;
    const rect = root.getBoundingClientRect();
    const d = { corner, startX, startY, startLeft: rect.left, startTop: rect.top, startWidth: rect.width, startHeight: rect.height, startRight: rect.right, startBottom: rect.bottom };
    root.classList.add("win11-interacting");
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const handleMouseMove = (ev) => {
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      let left = d.startLeft;
      let top = d.startTop;
      let width = d.startWidth;
      let height = d.startHeight;
      switch (corner) {
      case "e":
        width = clamp(d.startWidth + dx, MIN_W, window.innerWidth - left);
        break;
      case "w":
        width = clamp(d.startWidth - dx, MIN_W, d.startRight);
        left = d.startRight - width;
        break;
      case "s":
        height = clamp(d.startHeight + dy, MIN_H, window.innerHeight - top);
        break;
      case "n":
        height = clamp(d.startHeight - dy, MIN_H, d.startBottom);
        top = d.startBottom - height;
        break;
      case "ne":
        width = clamp(d.startWidth + dx, MIN_W, window.innerWidth - left);
        height = clamp(d.startHeight - dy, MIN_H, d.startBottom);
        top = d.startBottom - height;
        break;
      case "sw":
        width = clamp(d.startWidth - dx, MIN_W, d.startRight);
        left = d.startRight - width;
        height = clamp(d.startHeight + dy, MIN_H, window.innerHeight - top);
        break;
      case "nw":
        width = clamp(d.startWidth - dx, MIN_W, d.startRight);
        left = d.startRight - width;
        height = clamp(d.startHeight - dy, MIN_H, d.startBottom);
        top = d.startBottom - height;
        break;
      default: // se
        width = clamp(d.startWidth + dx, MIN_W, window.innerWidth - left);
        height = clamp(d.startHeight + dy, MIN_H, window.innerHeight - top);
        break;
      }
      pos = { left, top };
      size = { width, height };
      applyLayout();
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      root.classList.remove("win11-interacting");
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // ---- 标题栏交互：双击最大化 + 拖动（排除控件/标签/按钮区）----
  const handleHeaderMouseDown = (e) => {
    if (!enabled) return;
    if (e.target.closest(".win11-controls")) return;
    if (e.target.closest(".sa-debugger-tabs")) return;
    if (e.target.closest(".sa-debugger-header-buttons")) return;
    if (e.button !== 0) return;
    e.preventDefault();
    const now = Date.now();
    const last = lastClick;
    const dx = last ? e.clientX - last.x : Infinity;
    const dy = last ? e.clientY - last.y : Infinity;
    const isDoubleClick = last && (now - last.time) < 300 && Math.sqrt(dx * dx + dy * dy) < 5;
    if (isDoubleClick) {
      lastClick = null;
      cancelDrag();
      toggleMaximize();
      return;
    }
    lastClick = { time: now, x: e.clientX, y: e.clientY };
    if (maximized) return;
    beginDrag(e.clientX, e.clientY);
  };
  const handleHeaderContextMenu = (e) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    openMenu(e.clientX, e.clientY);
  };
  headerElement.addEventListener("mousedown", handleHeaderMouseDown);
  headerElement.addEventListener("contextmenu", handleHeaderContextMenu);

  // ---- 键盘：Esc（交互>菜单>关闭）+ 菜单快捷键 r/m/s/n/x/c ----
  const handleKeyDown = (e) => {
    if (!enabled) return;
    if (e.key === "Escape") {
      if (interaction) {
        commitInteraction();
      } else if (menuOpen) {
        closeMenu();
      } else {
        onClose();
      }
      return;
    }
    if (!menuOpen) return;
    const getWindowCenter = () => {
      const rect = root.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    switch (e.key.toLowerCase()) {
    case "r":
      if (maximized) toggleMaximize();
      break;
    case "m":
      if (!maximized) {
        const c = getWindowCenter();
        closeMenu();
        enterMoveMode(c.x, c.y);
      }
      break;
    case "s":
      if (!maximized) {
        const c = getWindowCenter();
        closeMenu();
        enterResizeMode(c.x, c.y);
      }
      break;
    case "n":
      closeMenu();
      setMinimized(true);
      break;
    case "x":
      if (!maximized) {
        closeMenu();
        toggleMaximize();
      }
      break;
    case "c":
      closeMenu();
      onClose();
      break;
    default:
      break;
    }
  };
  document.addEventListener("keydown", handleKeyDown);

  // ---- 挂载/卸载引擎交互元素（对齐主题作用域）----
  const attachChrome = () => {
    if (controls.parentNode !== headerElement) {
      headerElement.appendChild(controls);
    }
    for (const corner of CORNERS) {
      const h = resizeHandles[corner];
      if (h.parentNode !== root) {
        root.appendChild(h);
      }
    }
    if (menu.parentNode !== document.body) {
      document.body.appendChild(menu);
    }
  };
  const detachChrome = () => {
    if (controls.parentNode) {
      controls.parentNode.removeChild(controls);
    }
    for (const corner of CORNERS) {
      const h = resizeHandles[corner];
      if (h.parentNode) {
        h.parentNode.removeChild(h);
      }
    }
    if (menu.parentNode) {
      menu.parentNode.removeChild(menu);
    }
  };

  // ---- 对外 API ----
  const setEnabled = (on) => {
    enabled = on;
    if (!on) {
      cancelDrag();
      commitInteraction();
      closeMenu();
      root.classList.remove("win11-maximized", "win11-minimized", "win11-interacting");
      root.style.transform = "";
      root.style.left = "";
      root.style.top = "";
      root.style.width = "";
      root.style.height = "";
      detachChrome();
      return;
    }
    attachChrome();
    if (!positioned) {
      positioned = true;
      pos = {
        left: Math.max(0, Math.round((window.innerWidth - defaultWidth) / 2)),
        top: Math.max(24, Math.round((window.innerHeight - defaultHeight) / 2 - 40)),
      };
    }
    applyLayout();
  };
  const destroy = () => {
    setEnabled(false);
    detachChrome();
    headerElement.removeEventListener("mousedown", handleHeaderMouseDown);
    headerElement.removeEventListener("contextmenu", handleHeaderContextMenu);
    document.removeEventListener("keydown", handleKeyDown);
  };

  return { setEnabled, destroy, isMaximized: () => maximized, isMinimized: () => minimized };
}
