import React, {memo} from 'react';
import styles from './music-player.css';
import TrackRow from './track-row.jsx';
import {buildFavoriteKey} from './utils';

const COLUMNS = [
    ['title', '标题'],
    ['artist', '歌手'],
    ['album', '专辑'],
    ['seconds', '时长']
];

// 内容页：标题 + 描述 + 歌曲表格（表头 + 歌曲行），不渲染卡片网格。
// favoriteKeys 为收藏唯一键集合；onToggleFavorite(track, sourceId) 由上层注入（稳定引用）。
// React.memo：所有 props 由上层稳定化（useMemo / useCallback），
// 父级播放进度等高频 state 变化时可整体跳过，避免连带全部歌曲行重渲染。
const TrackList = memo(function TrackList ({
    tracks,
    currentIndex,
    sourceName,
    sortKey,
    sortAsc,
    onSortKeyChange,
    onToggleSortOrder,
    onSelectTrack,
    sourceId,
    favoriteKeys,
    onToggleFavorite
}) {
    return (
        <div className={styles.main}>
            <div className={styles.mainTitle}>{sourceName}</div>
            <div className={styles.mainDesc}>共 {tracks.length} 首歌曲</div>
            <div className={styles.tableHeader}>
                {COLUMNS.map(([key, label]) => (
                    <div
                        key={key}
                        className={key === sortKey ? `${styles.headerCell} ${styles.headerCellActive}` : styles.headerCell}
                        onClick={() => {
                            if (key === sortKey) {
                                onToggleSortOrder();
                            } else {
                                onSortKeyChange(key);
                            }
                        }}
                    >
                        <span>{label}</span>
                        {key === sortKey && <span className={styles.sortArrow}>{sortAsc ? '↑' : '↓'}</span>}
                    </div>
                ))}
                <div className={styles.headerCell} />
            </div>
            <div className={styles.tracklist}>
                {tracks.map(({track, index}) => (
                    <TrackRow
                        key={index}
                        track={track}
                        index={index}
                        isActive={index === currentIndex}
                        onSelect={onSelectTrack}
                        isFavorite={favoriteKeys.has(buildFavoriteKey(track))}
                        sourceId={sourceId}
                        onToggleFavorite={onToggleFavorite}
                    />
                ))}
            </div>
        </div>
    );
});

export default TrackList;
