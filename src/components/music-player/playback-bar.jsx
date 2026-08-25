import React from 'react';
import styles from './music-player.css';
import {fmtTime} from './utils';
import {
    ListIcon,
    ListLoopIcon,
    NoteIcon,
    OrderIcon,
    PauseIcon,
    PlayIcon,
    PrevIcon,
    NextIcon,
    RepeatOneIcon,
    VolumeIcon,
    VolumeMutedIcon
} from './icons.jsx';

// 播放模式循环：manual(顺序播放) -> auto(列表循环) -> loop(单曲循环) -> manual
const MODE_ORDER = ['manual', 'auto', 'loop'];
const MODE_ICONS = {
    manual: OrderIcon,
    auto: ListLoopIcon,
    loop: RepeatOneIcon
};

const PlaybackBar = function ({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    playMode,
    onSetPlayMode,
    onToggle,
    onPrev,
    onNext,
    onSeek,
    onVolumeChange,
    onToggleMute,
    onOpenLyrics,
    nowCoverRef
}) {
    const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const ModeIcon = MODE_ICONS[playMode] || OrderIcon;
    const handleToggleMode = () => {
        const idx = MODE_ORDER.indexOf(playMode);
        onSetPlayMode(MODE_ORDER[(idx + 1) % MODE_ORDER.length]);
    };
    return (
        <div className={styles.bottom}>
            <div className={styles.now}>
                <div
                    className={styles.nowCover}
                    ref={nowCoverRef}
                    onClick={onOpenLyrics}
                    title="查看歌词"
                    style={{'--c1': currentTrack.c1, '--c2': currentTrack.c2}}
                >
                    <NoteIcon size={20} />
                </div>
                <div className={styles.nowInfo}>
                    <div className={styles.nowName}>{currentTrack.title}</div>
                    <div className={styles.nowArtist}>{currentTrack.artist}</div>
                </div>
            </div>
            {/* 播放模式按钮：紧贴中间控制区左侧，与右侧音量区对称（网易云 PC 布局） */}
            <button
                className={styles.modeBtn}
                onClick={handleToggleMode}
                title={playMode === 'loop' ? '单曲循环' : playMode === 'auto' ? '列表循环' : '顺序播放'}
            >
                <ModeIcon size={16} />
            </button>
            <div className={styles.center}>
                <div className={styles.controls}>
                    <button className={styles.ctrl} onClick={onPrev} title="上一首">
                        <PrevIcon size={16} />
                    </button>
                    <button
                        className={`${styles.ctrl} ${styles.playBtn}`}
                        onClick={onToggle}
                        title={isPlaying ? '暂停' : '播放'}
                    >
                        {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                    </button>
                    <button className={styles.ctrl} onClick={onNext} title="下一首">
                        <NextIcon size={16} />
                    </button>
                </div>
                <div className={styles.progress}>
                    <span className={styles.time}>{fmtTime(currentTime)}</span>
                    <input
                        className={styles.seek}
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={seekPct}
                        onChange={e => onSeek(Number(e.target.value))}
                        style={{'--mp-fill': `${seekPct}%`}}
                    />
                    <span className={styles.time}>{fmtTime(currentTrack.seconds)}</span>
                </div>
            </div>
            {/* 音量区：紧贴中间控制区右侧 */}
            <div className={styles.volume}>
                <button className={styles.volumeBtn} onClick={onToggleMute} title="静音">
                    {muted ? <VolumeMutedIcon size={16} /> : <VolumeIcon size={16} />}
                </button>
                <input
                    className={styles.volumeSlider}
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={e => onVolumeChange(Number(e.target.value))}
                    style={{'--mp-fill': `${volume}%`}}
                />
                <button className={styles.volumeBtn} title="播放列表">
                    <ListIcon size={16} />
                </button>
            </div>
        </div>
    );
};

export default PlaybackBar;
