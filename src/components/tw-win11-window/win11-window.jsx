import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import {connect} from 'react-redux';
import styles from './win11-window.css';
import twAdvancedIcon from '../menu-bar/tw-advanced.svg';
import {ACCENT_MAP} from '../../lib/themes/index.js';

// Shared window focus manager: tracks every open Win11Window instance so that
// clicking any window brings it to the front while the remaining windows are
// dimmed, mirroring the focus behavior of a native multi-window desktop.
const windowFocusManager = (() => {
    let counter = 0;
    let topZIndex = 510;
    let activeId = null;
    const instances = new Map();

    const notifyAll = () => {
        instances.forEach((entry, id) => {
            entry.listener(id === activeId, entry.zIndex);
        });
    };

    return {
        register (listener) {
            const id = ++counter;
            const zIndex = ++topZIndex;
            instances.set(id, {listener, zIndex});
            activeId = id;
            notifyAll();
            return id;
        },
        unregister (id) {
            instances.delete(id);
            if (activeId !== id) return;
            activeId = null;
            let highestZIndex = -1;
            let highestId = null;
            instances.forEach((entry, entryId) => {
                if (entry.zIndex > highestZIndex) {
                    highestZIndex = entry.zIndex;
                    highestId = entryId;
                }
            });
            if (highestId !== null) activeId = highestId;
            notifyAll();
        },
        activate (id) {
            if (activeId === id || !instances.has(id)) return;
            const entry = instances.get(id);
            entry.zIndex = ++topZIndex;
            activeId = id;
            notifyAll();
        }
    };
})();

// Exposes window interaction state and a bring-to-front callback to child
// content. The addons window uses this to focus the iframe and bring the
// window forward even though iframe clicks do not bubble to the parent.
export const Win11WindowInteractionContext = React.createContext({
    interacting: false,
    bringToFront: () => {}
});

// Build the SKYEditor titlebar style from the current accent theme color.
// Only applies when the UI theme is 'sky-editor'; otherwise returns undefined
// so the default CSS background is used.
const getSkyEditorTitlebarStyle = (uiTheme, accent) => {
    if (uiTheme !== 'sky-editor') return undefined;
    const accentColors = ACCENT_MAP[accent] ? ACCENT_MAP[accent].guiColors : null;
    if (!accentColors) return undefined;
    const gradient = accentColors['menu-bar-background-image'];
    const baseColor = accentColors['looks-secondary'];
    return {
        background: gradient || baseColor,
        // SKYEditor 下标题栏文字恒白（Bilup 等亮色主题也不再变黑）
        color: '#ffffff'
    };
};

const Win11Window = ({
    title,
    onClose,
    children,
    icon,
    defaultWidth,
    defaultHeight,
    accent,
    uiTheme,
    disableMaximize,
    disableResize
}) => {
    const [minimized, setMinimized] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const [pos, setPos] = useState(() => ({
        left: Math.max(0, Math.round((window.innerWidth - defaultWidth) / 2)),
        top: Math.max(24, Math.round((window.innerHeight - defaultHeight) / 2 - 40))
    }));
    const [size, setSize] = useState({
        width: defaultWidth,
        height: defaultHeight
    });
    const [menu, setMenu] = useState(null);
    const [interactionMode, setInteractionMode] = useState(null);
    const [interacting, setInteracting] = useState(false);
    const [dragTransform, setDragTransform] = useState(null);
    const preMaximizeRef = useRef(null);
    const dragRef = useRef(null);
    const dragListenersRef = useRef(null);
    const lastClickRef = useRef(null);
    const resizeRef = useRef(null);
    const interactionRef = useRef(null);
    const windowRef = useRef(null);
    const menuRef = useRef(null);
    const windowIdRef = useRef(null);
    const [windowZIndex, setWindowZIndex] = useState(510);
    const [dimmed, setDimmed] = useState(false);

    useEffect(() => {
        const id = windowFocusManager.register((isActive, zIndex) => {
            setWindowZIndex(zIndex);
            setDimmed(!isActive);
        });
        windowIdRef.current = id;
        return () => {
            windowFocusManager.unregister(id);
            windowIdRef.current = null;
        };
    }, []);

    const handleWindowPointerDown = () => {
        if (windowIdRef.current !== null) {
            windowFocusManager.activate(windowIdRef.current);
        }
    };

    const bringToFront = useCallback(() => {
        if (windowIdRef.current !== null) {
            windowFocusManager.activate(windowIdRef.current);
        }
    }, []);

    const interactionContextValue = useMemo(() => ({
        interacting,
        bringToFront
    }), [interacting, bringToFront]);

    const closeMenu = () => setMenu(null);

    const handleToggleMaximize = () => {
        if (disableMaximize) return;
        if (maximized) {
            const pre = preMaximizeRef.current;
            if (pre) {
                setPos(pre.pos);
                setSize(pre.size);
            }
            setMaximized(false);
        } else {
            preMaximizeRef.current = {pos, size};
            setMaximized(true);
        }
    };

    const enterMoveMode = (startX, startY) => {
        if (maximized) return;
        interactionRef.current = {
            mode: 'move',
            startX, startY,
            dx: 0, dy: 0
        };
        setInteractionMode('move');
        setInteracting(true);
    };

    const enterResizeMode = (startX, startY) => {
        if (maximized) return;
        const rect = windowRef.current.getBoundingClientRect();
        interactionRef.current = {
            mode: 'resize',
            startX, startY,
            startLeft: rect.left, startTop: rect.top,
            startWidth: rect.width, startHeight: rect.height
        };
        setInteractionMode('resize');
        setInteracting(true);
    };

    const handleMenuRestore = () => {
        if (maximized) handleToggleMaximize();
        closeMenu();
    };
    const handleMenuMove = e => {
        enterMoveMode(e.clientX, e.clientY);
        closeMenu();
    };
    const handleMenuSize = e => {
        enterResizeMode(e.clientX, e.clientY);
        closeMenu();
    };
    const handleMenuMinimize = () => {
        setMinimized(true);
        closeMenu();
    };
    const handleMenuMaximize = () => {
        if (!maximized) handleToggleMaximize();
        closeMenu();
    };
    const handleMenuClose = () => {
        closeMenu();
        onClose();
    };

    useEffect(() => {
        const handleKeyDown = e => {
            if (e.key === 'Escape') {
                if (interactionMode) {
                    const d = interactionRef.current;
                    const wasMove = d && d.mode === 'move';
                    if (wasMove) {
                        setPos(prev => ({left: prev.left + d.dx, top: prev.top + d.dy}));
                    }
                    setDragTransform(null);
                    setInteractionMode(null);
                    interactionRef.current = null;
                    if (wasMove) {
                        requestAnimationFrame(() => setInteracting(false));
                    } else {
                        setInteracting(false);
                    }
                } else if (menu) {
                    setMenu(null);
                } else {
                    onClose();
                }
                return;
            }
            if (!menu) return;
            const getWindowCenter = () => {
                const rect = windowRef.current.getBoundingClientRect();
                return {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
            };
            switch (e.key) {
            case 'r':
            case 'R':
                if (maximized) {
                    handleMenuRestore();
                }
                break;
            case 'm':
            case 'M':
                if (!maximized) {
                    const center = getWindowCenter();
                    enterMoveMode(center.x, center.y);
                    setMenu(null);
                }
                break;
            case 's':
            case 'S':
                if (!maximized) {
                    const center = getWindowCenter();
                    enterResizeMode(center.x, center.y);
                    setMenu(null);
                }
                break;
            case 'n':
            case 'N':
                handleMenuMinimize();
                break;
            case 'x':
            case 'X':
                if (!maximized) {
                    handleMenuMaximize();
                }
                break;
            case 'c':
            case 'C':
                handleMenuClose();
                break;
            default:
                break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, menu, interactionMode, maximized, pos, size]);

    useEffect(() => {
        if (!menu) return undefined;
        const handleMouseDown = e => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenu(null);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [menu]);

    useEffect(() => {
        if (!interactionMode) return undefined;
        const handleMouseMove = ev => {
            const d = interactionRef.current;
            if (!d) return;
            if (d.mode === 'move') {
                d.dx = ev.clientX - d.startX;
                d.dy = ev.clientY - d.startY;
                setDragTransform({dx: d.dx, dy: d.dy});
            } else {
                const dx = ev.clientX - d.startX;
                const dy = ev.clientY - d.startY;
                const MIN_W = 500;
                const MIN_H = 300;
                const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
                const width = clamp(d.startWidth + dx, MIN_W, window.innerWidth - d.startLeft);
                const height = clamp(d.startHeight + dy, MIN_H, window.innerHeight - d.startTop);
                setSize({width, height});
            }
        };
        const handleMouseDown = () => {
            const d = interactionRef.current;
            const wasMove = d && d.mode === 'move';
            if (wasMove) {
                setPos(prev => ({left: prev.left + d.dx, top: prev.top + d.dy}));
            }
            setDragTransform(null);
            setInteractionMode(null);
            interactionRef.current = null;
            if (wasMove) {
                requestAnimationFrame(() => setInteracting(false));
            } else {
                setInteracting(false);
            }
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mousedown', handleMouseDown);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [interactionMode]);

    const beginDrag = (startX, startY) => {
        if (maximized) return;
        setInteracting(true);
        dragRef.current = {startX, startY, dx: 0, dy: 0};
        const handleMouseMove = ev => {
            const d = dragRef.current;
            if (!d) return;
            d.dx = ev.clientX - d.startX;
            d.dy = ev.clientY - d.startY;
            setDragTransform({dx: d.dx, dy: d.dy});
        };
        const handleMouseUp = () => {
            const d = dragRef.current;
            if (d) {
                setPos(prev => ({left: prev.left + d.dx, top: prev.top + d.dy}));
            }
            dragRef.current = null;
            setDragTransform(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            dragListenersRef.current = null;
            // Keep transition:none for one more frame so the left/top write-back
            // happens instantly without a transition animation.
            requestAnimationFrame(() => setInteracting(false));
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        dragListenersRef.current = {handleMouseMove, handleMouseUp};
    };

    const cancelDrag = () => {
        const listeners = dragListenersRef.current;
        if (listeners) {
            document.removeEventListener('mousemove', listeners.handleMouseMove);
            document.removeEventListener('mouseup', listeners.handleMouseUp);
            dragListenersRef.current = null;
        }
        dragRef.current = null;
        setDragTransform(null);
        setInteracting(false);
    };

    const handleTitlebarMouseDown = e => {
        if (e.button !== 0) return;
        e.preventDefault();
        const now = Date.now();
        const last = lastClickRef.current;
        const dx = last ? e.clientX - last.x : Infinity;
        const dy = last ? e.clientY - last.y : Infinity;
        const isDoubleClick = last &&
            (now - last.time) < 300 &&
            Math.sqrt(dx * dx + dy * dy) < 5;
        if (isDoubleClick) {
            lastClickRef.current = null;
            cancelDrag();
            handleToggleMaximize();
            return;
        }
        lastClickRef.current = {time: now, x: e.clientX, y: e.clientY};
        if (maximized) return;
        beginDrag(e.clientX, e.clientY);
    };

    const handleTitlebarContextMenu = e => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({
            left: Math.min(e.clientX, window.innerWidth - 180),
            top: Math.min(e.clientY, window.innerHeight - 240)
        });
    };

    const beginResize = (corner, startX, startY) => {
        if (maximized) return;
        setInteracting(true);
        const rect = windowRef.current.getBoundingClientRect();
        const startLeft = rect.left;
        const startTop = rect.top;
        const startWidth = rect.width;
        const startHeight = rect.height;
        const startRight = startLeft + startWidth;
        const startBottom = startTop + startHeight;
        resizeRef.current = {
            corner, startX, startY, startLeft, startTop, startWidth, startHeight,
            startRight, startBottom
        };
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const handleMouseMove = ev => {
            const d = resizeRef.current;
            if (!d) return;
            const dx = ev.clientX - d.startX;
            const dy = ev.clientY - d.startY;
            const MIN_W = 500;
            const MIN_H = 300;
            let left = d.startLeft;
            let top = d.startTop;
            let width = d.startWidth;
            let height = d.startHeight;
            switch (d.corner) {
            case 'e':
                width = clamp(d.startWidth + dx, MIN_W, window.innerWidth - left);
                break;
            case 'w':
                width = clamp(d.startWidth - dx, MIN_W, d.startRight);
                left = d.startRight - width;
                break;
            case 's':
                height = clamp(d.startHeight + dy, MIN_H, window.innerHeight - top);
                break;
            case 'n':
                height = clamp(d.startHeight - dy, MIN_H, d.startBottom);
                top = d.startBottom - height;
                break;
            case 'ne':
                width = clamp(d.startWidth + dx, MIN_W, window.innerWidth - left);
                height = clamp(d.startHeight - dy, MIN_H, d.startBottom);
                top = d.startBottom - height;
                break;
            case 'sw':
                width = clamp(d.startWidth - dx, MIN_W, d.startRight);
                left = d.startRight - width;
                height = clamp(d.startHeight + dy, MIN_H, window.innerHeight - top);
                break;
            case 'nw':
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
            setPos({left, top});
            setSize({width, height});
        };
        const handleMouseUp = () => {
            resizeRef.current = null;
            setInteracting(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleResizeMouseDown = corner => e => {
        if (maximized) return;
        e.preventDefault();
        e.stopPropagation();
        beginResize(corner, e.clientX, e.clientY);
    };

    const baseWindowStyle = maximized ? {
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh'
    } : {
        left: pos.left,
        top: pos.top,
        width: size.width,
        height: size.height,
        ...(dragTransform ? {transform: `translate(${dragTransform.dx}px, ${dragTransform.dy}px)`} : {})
    };
    const windowStyle = interacting ? {...baseWindowStyle, transition: 'none'} : baseWindowStyle;
    const titlebarStyle = getSkyEditorTitlebarStyle(uiTheme, accent);

    return (
        <div
            className={styles.win11Overlay}
            style={{zIndex: windowZIndex}}
        >
            <div
                ref={windowRef}
                className={classNames(styles.win11Window, {
                    [styles.win11Maximized]: maximized,
                    [styles.win11Dimmed]: dimmed,
                    [styles.win11Interacting]: interacting
                })}
                style={windowStyle}
                onMouseDownCapture={handleWindowPointerDown}
            >
                <div
                    className={styles.win11Titlebar}
                    style={titlebarStyle}
                    onMouseDown={handleTitlebarMouseDown}
                    onContextMenu={handleTitlebarContextMenu}
                >
                    <div className={styles.win11Title}>
                        <img
                            className={styles.win11TitleIcon}
                            src={icon}
                            draggable={false}
                            alt=""
                        />
                        <span>{title}</span>
                    </div>
                    <div
                        className={styles.win11Controls}
                        onMouseDown={e => e.stopPropagation()}
                        onContextMenu={e => e.stopPropagation()}
                    >
                        <button
                            className={styles.win11Button}
                            onClick={() => setMinimized(m => !m)}
                            title="Minimize"
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10">
                                <line x1="0.5" y1="5" x2="9.5" y2="5" stroke="currentColor" strokeWidth="1" />
                            </svg>
                        </button>
                        {!disableMaximize && (
                        <button
                            className={styles.win11Button}
                            onClick={handleToggleMaximize}
                            title="Maximize"
                        >
                            {maximized ? (
                                <svg width="10" height="10" viewBox="0 0 10 10">
                                    <rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
                                    <path d="M 0.5 0.5 H 7.5 V 2.5 H 2.5 V 7.5 H 0.5 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                                </svg>
                            ) : (
                                <svg width="10" height="10" viewBox="0 0 10 10">
                                    <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
                                </svg>
                            )}
                        </button>
                        )}
                        <button
                            className={classNames(styles.win11Button, styles.win11Close)}
                            onClick={onClose}
                            title="Close"
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10">
                                <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1" />
                                <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" stroke="currentColor" strokeWidth="1" />
                            </svg>
                        </button>
                    </div>
                </div>
                {!minimized && (
                    <div className={styles.win11Body}>
                        <Win11WindowInteractionContext.Provider value={interactionContextValue}>
                            {children}
                        </Win11WindowInteractionContext.Provider>
                    </div>
                )}
                {!maximized && !disableResize && (
                    <React.Fragment>
                        <div
                            className={styles.win11ResizeHandleN}
                            onMouseDown={handleResizeMouseDown('n')}
                        />
                        <div
                            className={styles.win11ResizeHandleS}
                            onMouseDown={handleResizeMouseDown('s')}
                        />
                        <div
                            className={styles.win11ResizeHandleW}
                            onMouseDown={handleResizeMouseDown('w')}
                        />
                        <div
                            className={styles.win11ResizeHandleE}
                            onMouseDown={handleResizeMouseDown('e')}
                        />
                        <div
                            className={styles.win11ResizeHandleNw}
                            onMouseDown={handleResizeMouseDown('nw')}
                        />
                        <div
                            className={styles.win11ResizeHandleNe}
                            onMouseDown={handleResizeMouseDown('ne')}
                        />
                        <div
                            className={styles.win11ResizeHandleSw}
                            onMouseDown={handleResizeMouseDown('sw')}
                        />
                        <div
                            className={styles.win11ResizeHandleSe}
                            onMouseDown={handleResizeMouseDown('se')}
                        />
                    </React.Fragment>
                )}
                <div className={styles.win11DimOverlay} />
            </div>
            {menu && (
                <div
                    ref={menuRef}
                    className={styles.win11ContextMenu}
                    style={{left: menu.left, top: menu.top}}
                >
                    <div
                        className={classNames(styles.win11MenuItem, {
                            [styles.win11MenuItemDisabled]: !maximized || disableMaximize
                        })}
                        onClick={maximized && !disableMaximize ? handleMenuRestore : undefined}
                    >
                        {'还原(R)'}
                    </div>
                    <div
                        className={classNames(styles.win11MenuItem, {
                            [styles.win11MenuItemDisabled]: maximized
                        })}
                        onClick={maximized ? undefined : handleMenuMove}
                    >
                        {'移动(M)'}
                    </div>
                    <div
                        className={classNames(styles.win11MenuItem, {
                            [styles.win11MenuItemDisabled]: maximized || disableResize
                        })}
                        onClick={!maximized && !disableResize ? handleMenuSize : undefined}
                    >
                        {'大小(S)'}
                    </div>
                    <div className={styles.win11MenuItemDivider} />
                    <div
                        className={styles.win11MenuItem}
                        onClick={handleMenuMinimize}
                    >
                        {'最小化(N)'}
                    </div>
                    <div
                        className={classNames(styles.win11MenuItem, {
                            [styles.win11MenuItemDisabled]: maximized || disableMaximize
                        })}
                        onClick={!maximized && !disableMaximize ? handleMenuMaximize : undefined}
                    >
                        {'最大化(X)'}
                    </div>
                    <div className={styles.win11MenuItemDivider} />
                    <div className={styles.win11MenuItem} onClick={handleMenuClose}>
                        {'关闭(C)'}
                    </div>
                </div>
            )}
        </div>
    );
};

Win11Window.propTypes = {
    title: PropTypes.node,
    onClose: PropTypes.func,
    children: PropTypes.node,
    icon: PropTypes.string,
    defaultWidth: PropTypes.number,
    defaultHeight: PropTypes.number,
    accent: PropTypes.string,
    uiTheme: PropTypes.string,
    disableMaximize: PropTypes.bool,
    disableResize: PropTypes.bool
};

Win11Window.defaultProps = {
    icon: twAdvancedIcon,
    defaultWidth: 750,
    defaultHeight: 820
};

const mapStateToProps = state => ({
    accent: state.scratchGui.theme.theme.accent,
    uiTheme: state.scratchGui.uiTheme
});

export default connect(mapStateToProps)(Win11Window);
