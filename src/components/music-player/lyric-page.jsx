import React, {useEffect, useMemo, useRef} from 'react';
import styles from './music-player.css';
import {CloseIcon, NoteIcon} from './icons.jsx';

// LRC 解析：[mm:ss(.xx)]歌词
export const parseLRC = (lrc) => {
    if (!lrc) return [];
    const out = [];
    const re = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]\s*(.*)/;
    for (const line of lrc.split('\n')) {
        const m = re.exec(line);
        if (!m) continue;
        const min = parseInt(m[1], 10);
        const sec = parseInt(m[2], 10);
        const frac = m[3] ? parseFloat(`0.${m[3]}`) : 0;
        out.push({time: min * 60 + sec + frac, text: m[4]});
    }
    return out.sort((a, b) => a.time - b.time);
};

// 歌词页（曲谱）：覆盖在播放器内容区之上的全窗口层（参照网易云 PC 歌词页）。
// 打开动画：封面从播放栏左下角（coverInit，getBoundingClientRect 记录）FLIP 放大
// 平移到窗口左侧居中位置，背景从透明渐变为深黑；关闭时反向移回。
const LyricPage = function ({track, currentTime, coverInit, onClose}) {
    const lyrics = useMemo(() => parseLRC(track.lyrics), [track.lyrics]);
    const listRef = useRef(null);
    const coverRef = useRef(null);
    const bgRef = useRef(null);
    const initRef = useRef(coverInit || null);

    // 当前播放句 index（按 currentTime 定位 LRC 时间戳）
    let activeIndex = -1;
    if (lyrics.length > 0) {
        for (let i = lyrics.length - 1; i >= 0; i--) {
            if (currentTime >= lyrics[i].time) {
                activeIndex = i;
                break;
            }
        }
    }

    // 歌词区滚动到当前句并保持居中
    useEffect(() => {
        const container = listRef.current;
        if (!container) return;
        const active = container.children[activeIndex];
        if (!active) return;
        container.scrollTop = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
    }, [activeIndex]);

    // 进入动画：FLIP —— 封面初始位移对齐播放栏封面，双 rAF 后过渡回最终位置；
    // 背景 opacity 从 0 过渡到 1。
    useEffect(() => {
        const cover = coverRef.current;
        const bg = bgRef.current;
        const init = initRef.current;
        if (cover) {
            const final = cover.getBoundingClientRect();
            const dx = init ? init.left - final.left : 0;
            const dy = init ? init.top - final.top : 0;
            const scale = init ? init.width / final.width : 1;
            cover.style.transition = 'none';
            cover.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
            cover.style.opacity = '0.4';
        }
        if (bg) bg.style.opacity = '0';
        const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
            if (cover) {
                cover.style.transition = 'transform 0.55s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.45s ease';
                cover.style.transform = 'translate(0px, 0px) scale(1)';
                cover.style.opacity = '1';
            }
            if (bg) bg.style.opacity = '1';
        }));
        return () => cancelAnimationFrame(raf);
    }, []);

    // 关闭：反向动画（封面移回播放栏位置 + 背景淡出），结束后卸载
    const handleClose = () => {
        const cover = coverRef.current;
        const bg = bgRef.current;
        const init = initRef.current;
        if (cover) {
            const final = cover.getBoundingClientRect();
            const dx = init ? init.left - final.left : 0;
            const dy = init ? init.top - final.top : 0;
            const scale = init ? init.width / final.width : 1;
            cover.style.transition = 'transform 0.35s ease, opacity 0.3s ease';
            cover.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
            cover.style.opacity = '0';
        }
        if (bg) {
            bg.style.transition = 'opacity 0.3s ease';
            bg.style.opacity = '0';
        }
        setTimeout(onClose, 340);
    };

    return (
        <div className={styles.lyricOverlay} onClick={handleClose}>
            <div className={styles.lyricBg} ref={bgRef} />
            <div className={styles.lyricContent} onClick={e => e.stopPropagation()}>
                <button className={styles.lyricClose} onClick={handleClose} title="关闭歌词页">
                    <CloseIcon size={16} />
                </button>
                <div className={styles.lyricCoverWrap}>
                    <div
                        className={styles.lyricCover}
                        ref={coverRef}
                        style={{'--c1': track.c1, '--c2': track.c2}}
                    >
                        <NoteIcon size={42} />
                    </div>
                </div>
                <div className={styles.lyricSide}>
                    <div className={styles.lyricTitle}>{track.title}</div>
                    <div className={styles.lyricArtist}>{track.artist}</div>
                    <div className={styles.lyricList} ref={listRef}>
                    {lyrics.length > 0 ? (
                        lyrics.map((l, i) => (
                            <div
                                key={i}
                                className={i === activeIndex ?
                                    `${styles.lyricLine} ${styles.lyricLineActive}` :
                                    styles.lyricLine}
                            >
                                {l.text}
                            </div>
                        ))
                    ) : (
                        <div className={`${styles.lyricLine} ${styles.lyricLineActive}`}>纯音乐</div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LyricPage;