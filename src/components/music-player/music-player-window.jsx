import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {connect} from 'react-redux';
import Win11Window from '../tw-win11-window/win11-window.jsx';
import styles from './music-player.css';
import {TRACKS} from './tracks';
import {SOURCE_BUILTIN, SOURCE_FAVORITES, buildFavoriteKey} from './utils';
import Sidebar from './sidebar.jsx';
import TrackList from './track-list.jsx';
import PlaybackBar from './playback-bar.jsx';
import SourceSettings from './music-source-settings.jsx';
import LyricPage from './lyric-page.jsx';
import {SearchIcon} from './icons.jsx';
import {
    closeMusicPlayer,
    setCurrentTrack,
    setMuted,
    setPlayMode,
    setSource,
    addSource,
    removeSource,
    addTrackToSource,
    removeTrackFromSource,
    toggleFavorite
} from '../../reducers/music-player';


// 窗口标题栏图标（内联 music 图标转 data URI，React 版 Win11Window icon prop）
const WINDOW_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#4c97ff"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>'
)}`;

// 内置曲库来源（tracks 直接引用内置 TRACKS 数组）
const BUILTIN_SOURCE = {id: SOURCE_BUILTIN, name: '内置曲库', builtin: true, tracks: TRACKS};

const MusicPlayerWindow = function ({
    open,
    currentIndex,
    playMode,
    muted,
    sourceId,
    customSources,
    favorites,
    onClose,
    onSetCurrentTrack,
    onSetPlayMode,
    onSetMuted,
    onSetSource,
    onAddSource,
    onRemoveSource,
    onAddTrack,
    onRemoveTrack,
    onToggleFavorite
}) {
    const audioRef = useRef(null);
    const playModeRef = useRef(playMode);
    const currentIndexRef = useRef(currentIndex);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(70);
    const [sortKey, setSortKey] = useState('title');
    const [sortAsc, setSortAsc] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [lyricsOpen, setLyricsOpen] = useState(false);
    const [lyricsCoverInit, setLyricsCoverInit] = useState(null);
    const nowCoverRef = useRef(null);
    // 正在播放的曲目（与当前显示列表解耦）：切换歌单只是换列表视图，
    // 正在播放的音乐不中断，播放栏/歌词页始终跟随这里。
    const [nowPlaying, setNowPlaying] = useState({track: null, list: [], index: -1});
    const nowPlayingRef = useRef(nowPlaying);

    // 收藏唯一键集合（用于行内红心状态判断），键仅基于歌曲本身（与来源无关）
    const favoriteKeys = useMemo(() => new Set(
        favorites.map(f => buildFavoriteKey(f.track))
    ), [favorites]);

    // 新建歌单：dispatch 创建后拿到新歌单 id，立即切换到该歌单
    const handleAddSource = useCallback((name) => {
        const action = onAddSource(name);
        if (action && action.id) onSetSource(action.id);
    }, [onAddSource, onSetSource]);

    // 打开歌词页：先记录播放栏封面当前位置（FLIP 起点），再渲染歌词页
    const handleOpenLyrics = useCallback(() => {
        const el = nowCoverRef.current;
        if (el) {
            const r = el.getBoundingClientRect();
            setLyricsCoverInit({left: r.left, top: r.top, width: r.width, height: r.height});
        } else {
            setLyricsCoverInit(null);
        }
        setLyricsOpen(true);
    }, []);

    // 「我的歌单」：收藏列表（favorites）视为一个可播放来源
    const favoritesSource = useMemo(() => ({
        id: SOURCE_FAVORITES,
        name: '我的歌单',
        builtin: false,
        tracks: favorites.map(f => f.track)
    }), [favorites]);

    // 当前歌单来源：builtin -> 内置曲库；favorites -> 我的歌单；否则从 customSources 查找
    const currentSource = useMemo(() => {
        if (sourceId === SOURCE_FAVORITES) return favoritesSource;
        if (sourceId === SOURCE_BUILTIN) return BUILTIN_SOURCE;
        return customSources.find(s => s.id === sourceId) || BUILTIN_SOURCE;
    }, [sourceId, customSources, favoritesSource]);
    const currentTracks = currentSource.tracks;
    const currentTracksRef = useRef(currentTracks);

    // 保持 ref 与最新 props 同步（audio 事件回调的空依赖闭包需要读到最新值）
    useEffect(() => { playModeRef.current = playMode; }, [playMode]);
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { currentTracksRef.current = currentTracks; }, [currentTracks]);
    // 保持 nowPlaying ref 最新（ended 空依赖回调需要读到正在播放的曲目与来源列表）
    useEffect(() => { nowPlayingRef.current = nowPlaying; }, [nowPlaying]);

    // Audio 单例：常驻 gui 顶层，关闭窗口不销毁（保留播放），组件卸载时清理
    useEffect(() => {
        const audio = new Audio();
        audio.volume = 0.7;
        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onLoadedMetadata = () => setDuration(audio.duration || 0);
        const onDurationChange = () => setDuration(audio.duration || 0);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => {
            const mode = playModeRef.current;
            // 基于正在播放的曲目（nowPlaying）在其所属列表里切下一首，
            // 不依赖当前显示列表 currentTracks/currentIndex（它们会随歌单切换而变）。
            const np = nowPlayingRef.current;
            if (mode === 'loop') {
                audio.currentTime = 0;
                audio.play().catch(() => {});
            } else if (mode === 'auto' && np.list.length > 0) {
                const i = (np.index + 1) % np.list.length;
                loadTrackRef.current(i, np.list);
                audio.play().catch(() => {});
            }
        };
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('durationchange', onDurationChange);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);
        audioRef.current = audio;
        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('durationchange', onDurationChange);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
            audio.pause();
            audioRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // muted 同步到 audio 实例
    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = muted;
    }, [muted]);

    // 切换音乐来源：只换列表视图，正在播放的曲目不中断（不暂停/不清空 audio）。
    // 当前下标由 reducer SET_SOURCE 置 0，一般不会越界；这里仅做兜底复位，
    // 不再 pause / 清空 src / 归零进度 / 置 isPlaying(false)。
    useEffect(() => {
        if (currentTracks.length > 0 && currentIndex >= currentTracks.length) {
            onSetCurrentTrack(0);
        }
    }, [sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

    // 歌单内容变化（如收藏增减）导致当前下标越界时复位到第一首
    useEffect(() => {
        if (currentTracks.length > 0 && currentIndex >= currentTracks.length) {
            onSetCurrentTrack(0);
        }
    }, [currentTracks.length, currentIndex, onSetCurrentTrack]);

    // 加载曲目：list 缺省用当前显示列表；ended 自动下一首时传入正在播放曲目
    // 所属的列表（nowPlaying.list），避免误从切换后的当前显示列表加载。
    const loadTrack = useCallback((index, list) => {
        const tracks = list || currentTracksRef.current;
        if (!tracks || tracks.length === 0) return;
        const safeIndex = Math.max(0, Math.min(index, tracks.length - 1));
        onSetCurrentTrack(safeIndex);
        const track = tracks[safeIndex];
        const audio = audioRef.current;
        if (audio) {
            audio.src = track.file;
            setCurrentTime(0);
            setDuration(track.seconds || 0);
        }
        // 同步正在播放信息（切歌单后播放栏/歌词页/列表高亮均以此为准）
        setNowPlaying({track, list: tracks, index: safeIndex});
    }, [onSetCurrentTrack]);
    // 供空依赖 audio effect 的 ended 回调引用（始终拿到最新闭包）
    const loadTrackRef = useRef(null);
    loadTrackRef.current = loadTrack;

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (currentTracksRef.current.length === 0) return;
        if (audio.paused) {
            if (!audio.src) loadTrack(currentIndexRef.current);
            audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    }, [loadTrack]);
    const handleSelectTrack = useCallback((index) => {
        const list = currentTracksRef.current;
        if (list.length === 0) return;
        loadTrack(index);
        const audio = audioRef.current;
        if (audio) audio.play().catch(() => {});
    }, [loadTrack]);
    const handleNext = useCallback(() => {
        const list = currentTracksRef.current;
        if (list.length === 0) return;
        loadTrack((currentIndexRef.current + 1) % list.length);
        const audio = audioRef.current;
        if (audio) audio.play().catch(() => {});
    }, [loadTrack]);
    const handlePrev = useCallback(() => {
        const list = currentTracksRef.current;
        if (list.length === 0) return;
        loadTrack((currentIndexRef.current - 1 + list.length) % list.length);
        const audio = audioRef.current;
        if (audio) audio.play().catch(() => {});
    }, [loadTrack]);
    const handleSeek = useCallback((value) => {
        const audio = audioRef.current;
        if (!audio || !audio.src) return;
        // 元数据未就绪时 duration 为 NaN/0，此时 seek 无意义，忽略避免污染 currentTime
        if (!isFinite(audio.duration) || audio.duration <= 0) return;
        audio.currentTime = (value / 100) * audio.duration;
        setCurrentTime(audio.currentTime);
    }, []);
    const handleVolumeChange = useCallback((value) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.volume = value / 100;
        setVolume(value);
        onSetMuted(value === 0);
    }, [onSetMuted]);
    const toggleMute = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const nextMuted = !muted;
        audio.muted = nextMuted;
        onSetMuted(nextMuted);
    }, [muted, onSetMuted]);

    const sortedTracks = useMemo(() => {
        const list = currentTracks.map((track, index) => ({track, index}));
        list.sort((a, b) => {
            let r = 0;
            if (sortKey === 'seconds') r = (a.track.seconds || 0) - (b.track.seconds || 0);
            else r = String(a.track[sortKey] || '').localeCompare(String(b.track[sortKey] || ''), 'zh-Hans-CN');
            return sortAsc ? r : -r;
        });
        return list;
    }, [currentTracks, sortKey, sortAsc]);

    // 标题栏搜索：按标题 / 歌手实时过滤，清空恢复全部
    const filteredTracks = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) return sortedTracks;
        return sortedTracks.filter(({track}) =>
            String(track.title || '').toLowerCase().indexOf(q) !== -1 ||
            String(track.artist || '').toLowerCase().indexOf(q) !== -1
        );
    }, [sortedTracks, searchText]);

    // 汇总来源列表供设置弹窗使用（内置 + 自定义）。useMemo 稳定引用，
    // 避免每次渲染重建导致 SourceSettings 内部 useEffect 反复执行。
    const settingsSources = useMemo(() => [
        BUILTIN_SOURCE,
        ...customSources.map(s => Object.assign({}, s, {builtin: false}))
    ], [customSources]);

    // 稳定回调（供 memo 子组件复用，避免父级高频重渲染连带子组件重渲染）
    const handleToggleSortOrder = useCallback(() => setSortAsc(prev => !prev), []);
    const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
    const closeSettings = useCallback(() => setSettingsOpen(false), []);
    const closeLyrics = useCallback(() => setLyricsOpen(false), []);

    const nowTrack = nowPlaying.track;

    // 列表高亮：按 file 匹配正在播放的曲目在当前显示列表中的位置；
    // 切歌单后若正在播的歌不在新列表则不高亮（-1），不强制高亮第一行。
    const activeIndex = useMemo(() => {
        if (!nowTrack) return -1;
        const idx = currentTracks.findIndex(t => t.file === nowTrack.file);
        return idx;
    }, [currentTracks, nowTrack]);

    if (!open) return null;

    // 播放栏/歌词页显示的曲目：优先当前正在播放的（nowTrack），
    // 无播放记录时回退到当前显示列表第一首（保持原观感）。
    const currentTrack = nowTrack || currentTracks[currentIndex] || currentTracks[0];

    return (
        <Win11Window
            title={
                <span>
                    {'音乐播放器'}
                    <span
                        className={styles.titlebarSearch}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <SearchIcon size={13} />
                        <input
                            className={styles.titlebarSearchInput}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            placeholder="搜索音乐、歌手"
                        />
                    </span>
                </span>
            }
            onClose={onClose}
            icon={WINDOW_ICON}
            defaultWidth={980}
            defaultHeight={680}
        >
            <div className={styles.content}>
                <div className={styles.body}>
                    <Sidebar
                        activeId={sourceId}
                        customSources={customSources}
                        onSelect={onSetSource}
                        onOpenSettings={handleOpenSettings}
                        onCreateSource={handleAddSource}
                    />
                    <TrackList
                        tracks={filteredTracks}
                        currentIndex={activeIndex}
                        sourceName={currentSource.name}
                        sortKey={sortKey}
                        sortAsc={sortAsc}
                        onSortKeyChange={setSortKey}
                        onToggleSortOrder={handleToggleSortOrder}
                        onSelectTrack={handleSelectTrack}
                        sourceId={sourceId}
                        favoriteKeys={favoriteKeys}
                        onToggleFavorite={onToggleFavorite}
                    />
                </div>
                <PlaybackBar
                    currentTrack={currentTrack || {title: '无歌曲', artist: '', c1: '#888888', c2: '#888888', seconds: 0}}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    muted={muted}
                    playMode={playMode}
                    onSetPlayMode={onSetPlayMode}
                    onToggle={togglePlay}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onSeek={handleSeek}
                    onVolumeChange={handleVolumeChange}
                    onToggleMute={toggleMute}
                    onOpenLyrics={handleOpenLyrics}
                    nowCoverRef={nowCoverRef}
                />
                {settingsOpen && (
                    <SourceSettings
                        sources={settingsSources}
                        currentSourceId={sourceId}
                        onSelectSource={onSetSource}
                        onAddSource={onAddSource}
                        onRemoveSource={onRemoveSource}
                        onAddTrack={onAddTrack}
                        onRemoveTrack={onRemoveTrack}
                        onClose={closeSettings}
                    />
                )}
                {lyricsOpen && currentTrack && (
                    <LyricPage
                        track={currentTrack}
                        currentTime={currentTime}
                        coverInit={lyricsCoverInit}
                        onClose={closeLyrics}
                    />
                )}
            </div>
        </Win11Window>
    );
};

const mapStateToProps = state => ({
    open: state.scratchGui.musicPlayer.open,
    currentIndex: state.scratchGui.musicPlayer.currentIndex,
    playMode: state.scratchGui.musicPlayer.playMode,
    muted: state.scratchGui.musicPlayer.muted,
    sourceId: state.scratchGui.musicPlayer.sourceId,
    customSources: state.scratchGui.musicPlayer.customSources,
    favorites: state.scratchGui.musicPlayer.favorites
});
const mapDispatchToProps = dispatch => ({
    onClose: () => dispatch(closeMusicPlayer()),
    onSetCurrentTrack: index => dispatch(setCurrentTrack(index)),
    onSetPlayMode: mode => dispatch(setPlayMode(mode)),
    onSetMuted: value => dispatch(setMuted(value)),
    onSetSource: id => dispatch(setSource(id)),
    onAddSource: name => dispatch(addSource(name)),
    onRemoveSource: id => dispatch(removeSource(id)),
    onAddTrack: (sid, track) => dispatch(addTrackToSource(sid, track)),
    onRemoveTrack: (sid, index) => dispatch(removeTrackFromSource(sid, index)),
    onToggleFavorite: (track, sourceId) => dispatch(toggleFavorite(track, sourceId))
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(MusicPlayerWindow);
