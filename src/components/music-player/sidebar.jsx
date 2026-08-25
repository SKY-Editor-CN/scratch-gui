import React, {memo, useState} from 'react';
import styles from './music-player.css';
import {GearIcon, MusicIcon, HeartIcon, PlusIcon} from './icons.jsx';
import {SOURCE_BUILTIN, SOURCE_FAVORITES} from './utils';

// 左侧导航：本地音乐（内置曲库）→ 自定义歌单 → 我的歌单（收藏）→ 底部「新建歌单 / 设置」。
// activeId 语义：SOURCE_BUILTIN=本地音乐、SOURCE_FAVORITES=我的歌单、自定义歌单用其 sourceId。
// React.memo：onSelect/onOpenSettings/onCreateSource 均由上层以稳定引用注入，
// 播放进度等高频 state 变化时可整体跳过（内部 creating/newName 状态仍正常驱动渲染）。
const Sidebar = memo(function Sidebar ({
    activeId,
    customSources,
    onSelect,
    onOpenSettings,
    onCreateSource
}) {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    const navItemClass = id =>
        activeId === id ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem;

    // 确认创建：空名称不创建；成功后由 window 层自动切换到新歌单
    const confirmCreate = () => {
        const name = newName.trim();
        if (!name) return;
        onCreateSource(name);
        setNewName('');
        setCreating(false);
    };
    const cancelCreate = () => {
        setNewName('');
        setCreating(false);
    };

    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarNav}>
                <div
                    key="builtin"
                    className={navItemClass(SOURCE_BUILTIN)}
                    onClick={() => onSelect(SOURCE_BUILTIN)}
                    title="本地音乐（内置曲库）"
                >
                    <MusicIcon size={15} />
                    <span>本地音乐</span>
                </div>
                {customSources.map(s => (
                    <div
                        key={s.id}
                        className={navItemClass(s.id)}
                        onClick={() => onSelect(s.id)}
                        title={s.name}
                    >
                        <MusicIcon size={15} />
                        <span>{s.name}</span>
                    </div>
                ))}
                <div
                    key="favorites"
                    className={navItemClass(SOURCE_FAVORITES)}
                    onClick={() => onSelect(SOURCE_FAVORITES)}
                    title="我的歌单（收藏）"
                >
                    <HeartIcon size={15} />
                    <span>我的歌单</span>
                </div>
            </div>
            <div className={styles.sidebarSettings}>
                <button className={styles.navItem} onClick={() => setCreating(true)} title="新建歌单">
                    <PlusIcon size={15} />
                    <span>新建歌单</span>
                </button>
                <button className={styles.navItem} onClick={onOpenSettings}>
                    <GearIcon size={15} />
                    <span>设置</span>
                </button>
            </div>
            {creating && (
                <div className={styles.sidebarCreateModal}>
                    <input
                        className={styles.sidebarCreateInput}
                        value={newName}
                        autoFocus
                        placeholder="输入歌单名称"
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') confirmCreate();
                            else if (e.key === 'Escape') cancelCreate();
                        }}
                    />
                    <div className={styles.sidebarCreateActions}>
                        <button className={styles.sidebarCreateCancel} onClick={cancelCreate}>取消</button>
                        <button className={styles.sidebarCreateBtn} onClick={confirmCreate}>创建</button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default Sidebar;
