const STORAGE_KEY = 'sky:context-menu-style';
const DEFAULT_STYLE = 'tw';

// SE（SKYEditor）样式右键菜单的深色观感，通过 CSS 变量下发；
// 未设置任何变量时各菜单保持 TurboWarp 原始（浅色）样式，可回退。
// 观感对齐「调试器插件当前使用的那套菜单」（调试器标题栏右键弹出的系统菜单）：
// 深灰底 + 白字 + 8px 圆角 + 200px 最小宽度 + 12px 字号 + 紧凑留白。
const SE_VARS = {
    '--sky-ctx-menu-bg': '#2b2b2b',
    '--sky-ctx-menu-fg': '#fff',
    '--sky-ctx-menu-border': 'rgba(255, 255, 255, 0.12)',
    '--sky-ctx-menu-hover-bg': 'rgba(255, 255, 255, 0.1)',
    '--sky-ctx-menu-hover-fg': '#fff',
    '--sky-ctx-menu-divider': 'rgba(255, 255, 255, 0.15)',
    '--sky-ctx-menu-radius': '8px',
    '--sky-ctx-menu-shadow': '0 8px 24px rgba(0, 0, 0, 0.5)',
    '--sky-ctx-menu-min-width': '200px',
    '--sky-ctx-menu-padding': '4px',
    '--sky-ctx-menu-margin': '0',
    '--sky-ctx-menu-font-size': '12px',
    '--sky-ctx-menu-item-padding': '6px 12px',
    // 以下三项使「SKYEditor样式」与调试器菜单严格一致：
    // z-index 1000、菜单项 4px 圆角、无 hover 过渡动画（调试器菜单无 transition）
    '--sky-ctx-menu-z-index': '1000',
    '--sky-ctx-menu-item-radius': '4px',
    '--sky-ctx-menu-item-transition': 'none',
    // 禁用项在 SE 样式下与调试器菜单一致：不置灰、hover 同正常项
    '--sky-ctx-menu-disabled-opacity': '1',
    '--sky-ctx-menu-disabled-hover-bg': 'rgba(255, 255, 255, 0.1)',
    '--sky-ctx-menu-disabled-hover-fg': '#fff'
};

const applyContextMenuStyle = style => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (style === 'se') {
        for (const key of Object.keys(SE_VARS)) {
            root.style.setProperty(key, SE_VARS[key]);
        }
    } else {
        for (const key of Object.keys(SE_VARS)) {
            root.style.removeProperty(key);
        }
    }
};

const detectContextMenuStyle = () => {
    let value = DEFAULT_STYLE;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'tw' || stored === 'se') {
            value = stored;
        }
    } catch (e) {
        // ignore
    }
    // 模块加载（应用启动）即同步一次全局变量，保证已持久化的选择立即生效
    applyContextMenuStyle(value);
    return value;
};

const persistContextMenuStyle = style => {
    try {
        localStorage.setItem(STORAGE_KEY, style);
    } catch (e) {
        // ignore
    }
};

export {
    STORAGE_KEY,
    DEFAULT_STYLE,
    detectContextMenuStyle,
    persistContextMenuStyle,
    applyContextMenuStyle
};
