// 内置曲库：三首真实 MP3（来源 E:\秦始皇计划\SKY Editor\Music）。
// 音频经 url-loader 打包（与既有 `!url-loader!./audio/xx.wav` 用法一致），
// file 字段直接为 webpack 资源 URL。
// 三首均无歌词（歌词页按既有逻辑显示「纯音乐」）。

import strikes from '!url-loader!./audio/3-strikes.mp3';
import dawm from '!url-loader!./audio/dawm.mp3';
import flirtingJune from '!url-loader!./audio/flirting-with-june.mp3';

export const TRACKS = [
    {
        title: '3 Strikes',
        artist: '未知歌手',
        album: '本地音乐',
        seconds: 176,
        c1: '#ff9a56',
        c2: '#ff2e63',
        file: strikes
    },
    {
        title: 'Dawm',
        artist: '未知歌手',
        album: '本地音乐',
        seconds: 243,
        c1: '#4c6ef5',
        c2: '#9b5de5',
        file: dawm
    },
    {
        title: 'Flirting With June',
        artist: '未知歌手',
        album: '本地音乐',
        seconds: 167,
        c1: '#43c6ac',
        c2: '#5a8f7b',
        file: flirtingJune
    }
];
