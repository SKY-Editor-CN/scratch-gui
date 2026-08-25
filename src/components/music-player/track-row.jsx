import React, {memo} from 'react';
import styles from './music-player.css';
import {MusicIcon, NoteIcon, HeartIcon, HeartFilledIcon} from './icons.jsx';
import {fmtTime} from './utils';

// 歌曲行：标题/歌手/专辑/时长 + 行尾收藏按钮（红心，空心=未收藏、实心红=已收藏）。
// React.memo 浅比较 props：track/index/isActive/isFavorite/onSelect/sourceId/onToggleFavorite。
// onSelect 与 onToggleFavorite 由上层以稳定引用注入（useCallback / mapDispatch），
// 播放/暂停等高频重渲染时可跳过整表行级重渲染，收藏仅重渲染受影响行。
const TrackRow = memo(function TrackRow ({track, index, isActive, isFavorite, onToggleFavorite, onSelect, sourceId}) {
    return (
        <div
            className={isActive ? `${styles.track} ${styles.trackPlaying}` : styles.track}
            onClick={() => onSelect(index)}
        >
            <div className={styles.colTitle}>
                <div className={styles.cover} style={{'--c1': track.c1, '--c2': track.c2}}>
                    <NoteIcon size={15} />
                </div>
                <div className={styles.titleWrap}>
                    {isActive && <MusicIcon size={13} />}
                    <span className={styles.trackTitle}>{track.title}</span>
                </div>
            </div>
            <div className={styles.colArtist}>{track.artist}</div>
            <div className={styles.colAlbum}>{track.album}</div>
            <div className={styles.colDuration}>{fmtTime(track.seconds)}</div>
            <div className={styles.colFav}>
                <button
                    className={styles.favBtn}
                    onClick={e => { e.stopPropagation(); onToggleFavorite(track, sourceId); }}
                    title={isFavorite ? '取消收藏' : '收藏'}
                >
                    {isFavorite ? <HeartFilledIcon size={14} /> : <HeartIcon size={14} />}
                </button>
            </div>
        </div>
    );
});

export default TrackRow;
