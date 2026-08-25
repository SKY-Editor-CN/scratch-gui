import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import styles from './music-player.css';
import {CloseIcon, MusicIcon} from './icons.jsx';
import {SOURCE_BUILTIN, SOURCE_FAVORITES} from './utils';

// 音乐来源配置弹窗（轻量 Modal，非 Win11Window）：
//  - 音乐来源：内置曲库 + 用户自定义歌单，点击即切换播放来源；自定义歌单支持删除
//  - 「选择歌单添加歌曲」：先选一个自定义歌单（默认/内置曲库除外），再向该歌单添加歌曲
// 新建歌单入口已移至左侧栏底部按钮，弹窗内不再提供「新建来源」。
// 所有写入动作通过 redux action 落到 reducers/music-player.js。
// React.memo：sources 等 props 由上层以稳定引用注入，播放进度高频变化时弹窗整体跳过重渲染。
const SourceSettings = memo(function SourceSettings ({
    sources,           // [{id, name, builtin, tracks}]
    currentSourceId,
    onSelectSource,
    onRemoveSource,
    onAddTrack,
    onRemoveTrack,
    onClose
}) {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [url, setUrl] = useState('');
    const [targetSourceId, setTargetSourceId] = useState(null);

    const customSources = useMemo(() => sources.filter(s => !s.builtin), [sources]);

    // 目标歌单默认选中：当前是自定义歌单则选它；当前为内置曲库/我的歌单时选第一个自定义歌单
    useEffect(() => {
        if (customSources.length === 0) {
            setTargetSourceId(null);
            return;
        }
        const isCurrentCustom = currentSourceId !== SOURCE_BUILTIN &&
            currentSourceId !== SOURCE_FAVORITES &&
            customSources.some(s => s.id === currentSourceId);
        setTargetSourceId(isCurrentCustom ? currentSourceId : customSources[0].id);
    }, [sources, currentSourceId]); // eslint-disable-line react-hooks/exhaustive-deps

    const targetSource = customSources.find(s => s.id === targetSourceId) || null;
    const tracks = targetSource ? targetSource.tracks : [];

    const handleAddTrack = useCallback(() => {
        if (!targetSource || !title.trim() || !url.trim()) return;
        onAddTrack(targetSource.id, {
            title: title.trim(),
            artist: artist.trim() || '未知歌手',
            album: '自定义',
            seconds: 0,
            file: url.trim()
        });
        setTitle('');
        setArtist('');
        setUrl('');
    }, [targetSource, title, artist, url, onAddTrack]);

    return (
        <div
            className={styles.settingsOverlay}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={styles.settingsPanel}>
                <div className={styles.settingsHeader}>
                    <span>音乐来源设置</span>
                    <button className={styles.settingsClose} onClick={onClose} title="关闭">
                        <CloseIcon size={14} />
                    </button>
                </div>
                <div className={styles.settingsBody}>
                    <div className={styles.settingsSectionTitle}>音乐来源</div>
                    <div className={styles.sourceList}>
                        {sources.map(s => (
                            <div
                                key={s.id}
                                className={s.id === currentSourceId ?
                                    `${styles.sourceRow} ${styles.sourceRowActive}` :
                                    styles.sourceRow}
                                onClick={() => onSelectSource(s.id)}
                            >
                                <MusicIcon size={14} />
                                <span className={styles.sourceRowName}>{s.name}</span>
                                <span className={styles.sourceRowCount}>
                                    {s.tracks ? s.tracks.length : 0} 首
                                </span>
                                {!s.builtin && (
                                    <button
                                        className={styles.sourceRowRemove}
                                        onClick={e => { e.stopPropagation(); onRemoveSource(s.id); }}
                                        title="删除该歌单"
                                    >
                                        <CloseIcon size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className={styles.settingsDivider} />

                    <div className={styles.settingsSectionTitle}>选择歌单添加歌曲</div>
                    {customSources.length === 0 ? (
                        <div className={styles.settingsHint}>
                            暂无自定义歌单，请在左侧栏底部点击「新建歌单」创建后，再向其添加歌曲。
                        </div>
                    ) : (
                        <div>
                            <div className={styles.targetSourceList}>
                                {customSources.map(s => (
                                    <button
                                        key={s.id}
                                        className={s.id === targetSourceId ?
                                            `${styles.targetSourceChip} ${styles.targetSourceChipActive}` :
                                            styles.targetSourceChip}
                                        onClick={() => setTargetSourceId(s.id)}
                                        title={s.name}
                                    >
                                        <span>{s.name}</span>
                                        <span className={styles.targetSourceCount}>
                                            {s.tracks ? s.tracks.length : 0} 首
                                        </span>
                                    </button>
                                ))}
                            </div>
                            {targetSource && (
                                <div style={{marginTop: 12}}>
                                    <div className={styles.settingsTrackList}>
                                        {tracks.length === 0 && (
                                            <div className={styles.settingsHint}>暂无歌曲，请在下方添加。</div>
                                        )}
                                        {tracks.map((t, i) => (
                                            <div key={i} className={styles.settingsTrackRow}>
                                                <span className={styles.settingsTrackTitle}>{t.title}</span>
                                                <span className={styles.settingsTrackArtist}>{t.artist}</span>
                                                <button
                                                    className={styles.sourceRowRemove}
                                                    onClick={() => onRemoveTrack(targetSource.id, i)}
                                                    title="删除歌曲"
                                                >
                                                    <CloseIcon size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.settingsAddTrack}>
                                        <input
                                            className={styles.settingsInput}
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="标题"
                                        />
                                        <input
                                            className={styles.settingsInput}
                                            value={artist}
                                            onChange={e => setArtist(e.target.value)}
                                            placeholder="歌手"
                                        />
                                        <input
                                            className={styles.settingsInput}
                                            value={url}
                                            onChange={e => setUrl(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleAddTrack(); }}
                                            placeholder="音频 URL"
                                        />
                                        <button className={styles.settingsBtn} onClick={handleAddTrack}>添加歌曲</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default SourceSettings;
