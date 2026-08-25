// Music player window state (SKY Editor React 化改造)
// reducer + action creators + initialState in one file (project convention,
// see src/reducers/context-menu-style.js as template).
import {SOURCE_BUILTIN, buildFavoriteKey} from '../components/music-player/utils';

const OPEN = 'scratch-gui/music-player/OPEN';
const CLOSE = 'scratch-gui/music-player/CLOSE';
const SET_TRACK = 'scratch-gui/music-player/SET_TRACK';
const SET_PLAY_MODE = 'scratch-gui/music-player/SET_PLAY_MODE';
const SET_MUTED = 'scratch-gui/music-player/SET_MUTED';
const SET_SOURCE = 'scratch-gui/music-player/SET_SOURCE';
const ADD_SOURCE = 'scratch-gui/music-player/ADD_SOURCE';
const REMOVE_SOURCE = 'scratch-gui/music-player/REMOVE_SOURCE';
const ADD_TRACK = 'scratch-gui/music-player/ADD_TRACK';
const REMOVE_TRACK = 'scratch-gui/music-player/REMOVE_TRACK';
const TOGGLE_FAVORITE = 'scratch-gui/music-player/TOGGLE_FAVORITE';

// sourceId: 'builtin' 表示内置曲库；'favorites' 表示「我的歌单」（收藏列表）；
// 否则指向 customSources 中的某一项。
// customSources: [{id, name, tracks: [{title, artist, album, seconds, file, lyrics}]}]
// favorites: [{track, sourceId}] 收藏的歌曲（保留来源，供「我的歌单」视图播放）。

// ===== 持久化（localStorage）=====
// 只持久化 customSources（含其中 tracks）与 favorites 两项；
// open/currentIndex/sourceId/playMode/muted 等会话态不存。内置曲库 TRACKS 在代码内，不存。
// 所有存取均 try/catch：环境无 localStorage（构建期/SSR/隐私模式）或脏数据时静默降级内存态，不抛错。
const STORAGE_KEY = 'sky-editor:music-player';

// 防御性清洗：反序列化数据可能被篡改/损坏，逐字段校验，非法项剔除、缺失字段补默认。
const sanitizeTrack = function (t) {
    if (!t || typeof t !== 'object' || typeof t.file !== 'string') return null;
    const sec = Number(t.seconds);
    return {
        title: typeof t.title === 'string' ? t.title : '',
        artist: typeof t.artist === 'string' ? t.artist : '未知歌手',
        album: typeof t.album === 'string' ? t.album : '',
        seconds: isFinite(sec) && sec >= 0 ? sec : 0,
        file: t.file,
        lyrics: typeof t.lyrics === 'string' ? t.lyrics : undefined
    };
};
const sanitizeSource = function (s) {
    if (!s || typeof s !== 'object' ||
        typeof s.id !== 'string' || typeof s.name !== 'string') return null;
    return {
        id: s.id,
        name: s.name,
        builtin: false,
        tracks: Array.isArray(s.tracks)
            ? s.tracks.map(sanitizeTrack).filter(t => t !== null)
            : []
    };
};
const sanitizeFavorite = function (f) {
    if (!f || typeof f !== 'object' || typeof f.sourceId !== 'string') return null;
    const track = sanitizeTrack(f.track);
    if (!track) return null;
    return {track, sourceId: f.sourceId};
};

// 从 localStorage 读取并清洗持久化的 customSources / favorites；失败返回 null。
const loadPersisted = function () {
    try {
        if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return null;
        const rawFavorites = Array.isArray(data.favorites)
            ? data.favorites.map(sanitizeFavorite).filter(f => f !== null)
            : [];
        return {
            customSources: Array.isArray(data.customSources)
                ? data.customSources.map(sanitizeSource).filter(s => s !== null)
                : [],
            // 兼容旧数据：键格式调整后，同一首歌可能残留多条（来源不同的旧键）。
            // 按新键 (title|artist|file) 去重，保留第一条，避免重复收藏。
            favorites: rawFavorites.filter((f, i, arr) =>
                arr.findIndex(x => buildFavoriteKey(x.track) === buildFavoriteKey(f.track)) === i)
        };
    } catch (e) {
        return null; // 不可用/损坏 → 静默降级
    }
};

// 将最新 customSources 与 favorites 序列化写回 localStorage；失败静默忽略。
const savePersisted = function (customSources, favorites) {
    try {
        if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({customSources, favorites}));
    } catch (e) {
        // 隐私模式/配额满等 → 静默降级，不阻断播放器运行
    }
};

const persisted = loadPersisted() || {};
const initialState = {
    open: false,          // 窗口是否打开（驱动 Win11Window 显隐 + 悬浮球显隐）
    currentIndex: 0,      // 当前曲目下标（相对当前显示歌单 tracks 列表）
    playMode: 'auto',     // auto: 播完自动下一首; loop: 循环当前; manual: 播完停止
    muted: false,
    sourceId: 'builtin',  // 当前选中的歌单 id（内置曲库 / 我的歌单 / 自定义来源）
    customSources: persisted.customSources || [],  // 用户自定义来源（localStorage 恢复）
    favorites: persisted.favorites || []           // 收藏列表（localStorage 恢复）
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case OPEN:
        return Object.assign({}, state, {open: true});
    case CLOSE:
        return Object.assign({}, state, {open: false});
    case SET_TRACK:
        return Object.assign({}, state, {currentIndex: action.index});
    case SET_PLAY_MODE:
        return Object.assign({}, state, {playMode: action.playMode});
    case SET_MUTED:
        return Object.assign({}, state, {muted: action.muted});
    case SET_SOURCE:
        return Object.assign({}, state, {
            sourceId: action.sourceId,
            currentIndex: 0
        });
    case ADD_SOURCE: {
        const next = Object.assign({}, state, {
            customSources: state.customSources.concat({
                id: action.id,
                name: action.name,
                tracks: []
            })
        });
        savePersisted(next.customSources, next.favorites);
        return next;
    }
    case REMOVE_SOURCE: {
        const next = Object.assign({}, state, {
            customSources: state.customSources.filter(s => s.id !== action.id),
            // 删除的是当前来源时自动切回内置曲库
            sourceId: state.sourceId === action.id ? SOURCE_BUILTIN : state.sourceId,
            currentIndex: 0
        });
        savePersisted(next.customSources, next.favorites);
        return next;
    }
    case ADD_TRACK: {
        const next = Object.assign({}, state, {
            customSources: state.customSources.map(s =>
                s.id === action.sourceId ?
                    Object.assign({}, s, {tracks: s.tracks.concat(action.track)}) :
                    s
            )
        });
        savePersisted(next.customSources, next.favorites);
        return next;
    }
    case REMOVE_TRACK: {
        const next = Object.assign({}, state, {
            customSources: state.customSources.map(s =>
                s.id === action.sourceId ?
                    Object.assign({}, s, {
                        tracks: s.tracks.filter((t, i) => i !== action.index)
                    }) :
                    s
            )
        });
        savePersisted(next.customSources, next.favorites);
        return next;
    }
    case TOGGLE_FAVORITE: {
        // 用 (title|artist|file) 作为收藏唯一键（仅基于歌曲本身，与来源无关），
        // 重复点击则取消收藏。收藏记录保留 sourceId 字段用于展示/追溯。
        // 键构建与组件端 favoriteKeys 共用 utils.buildFavoriteKey，保证两端一致。
        const key = buildFavoriteKey(action.track);
        const existing = state.favorites.find(f =>
            buildFavoriteKey(f.track) === key);
        const next = Object.assign({}, state, {
            favorites: existing ?
                state.favorites.filter(f => f !== existing) :
                state.favorites.concat({track: action.track, sourceId: action.sourceId})
        });
        savePersisted(next.customSources, next.favorites);
        return next;
    }
    default:
        return state;
    }
};

const openMusicPlayer = function () {
    return {type: OPEN};
};
const closeMusicPlayer = function () {
    return {type: CLOSE};
};
const setCurrentTrack = function (index) {
    return {type: SET_TRACK, index};
};
const setPlayMode = function (playMode) {
    return {type: SET_PLAY_MODE, playMode};
};
const setMuted = function (muted) {
    return {type: SET_MUTED, muted};
};
const setSource = function (sourceId) {
    return {type: SET_SOURCE, sourceId};
};
let sourceCounter = 0;
const addSource = function (name) {
    const id = `custom-${Date.now()}-${++sourceCounter}`;
    return {type: ADD_SOURCE, id, name};
};
const removeSource = function (id) {
    return {type: REMOVE_SOURCE, id};
};
const addTrackToSource = function (sourceId, track) {
    return {type: ADD_TRACK, sourceId, track};
};
const removeTrackFromSource = function (sourceId, index) {
    return {type: REMOVE_TRACK, sourceId, index};
};
const toggleFavorite = function (track, sourceId) {
    return {type: TOGGLE_FAVORITE, track, sourceId};
};

export {
    reducer as default,
    initialState as musicPlayerInitialState,
    openMusicPlayer,
    closeMusicPlayer,
    setCurrentTrack,
    setPlayMode,
    setMuted,
    setSource,
    addSource,
    removeSource,
    addTrackToSource,
    removeTrackFromSource,
    toggleFavorite
};
