// 公共工具与常量：音乐播放器各组件/ reducer 共享，避免魔数与重复逻辑。

// 特殊来源 id：'builtin' = 内置曲库；'favorites' = 我的歌单（收藏列表）
export const SOURCE_BUILTIN = 'builtin';
export const SOURCE_FAVORITES = 'favorites';

// 播放模式：manual=顺序播放（播完停止）、auto=列表循环、loop=单曲循环
export const PLAY_MODE = {
    MANUAL: 'manual',
    AUTO: 'auto',
    LOOP: 'loop'
};

// 曲目可排序字段白名单（与 track-list.jsx 表头列 key 一一对应）
export const SORT_KEYS = ['title', 'artist', 'album', 'seconds'];

// 收藏唯一键：sourceId|title|artist|file（与 reducer TOGGLE_FAVORITE 保持一致）
export const buildFavoriteKey = (track, sourceId) =>
    `${sourceId}|${track.title}|${track.artist}|${track.file}`;

// 秒数格式化为 mm:ss（非法/负数统一归零）
export const fmtTime = function (sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
