import {THEME_PRESETS} from './presets';

const STORAGE_KEY = 'tw:ui-theme';
const DEFAULT_UI_THEME = 'sky-editor';

/**
 * @returns {string} detected UI theme id
 */
const detectUiTheme = () => {
    try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local && THEME_PRESETS.some(preset => preset.id === local)) {
            return local;
        }
    } catch (e) {
        // ignore
    }
    return DEFAULT_UI_THEME;
};

/**
 * @param {string} themeId UI theme id
 */
const persistUiTheme = themeId => {
    try {
        localStorage.setItem(STORAGE_KEY, themeId);
    } catch (e) {
        // ignore
    }
};

export {
    detectUiTheme,
    persistUiTheme,
    DEFAULT_UI_THEME
};
