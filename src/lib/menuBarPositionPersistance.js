const STORAGE_KEY = 'sky:menu-bar-position';
const DEFAULT_POSITION = 'center';

const detectMenuBarPosition = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'left' || stored === 'center') {
            return stored;
        }
    } catch (e) {
        // ignore
    }
    return DEFAULT_POSITION;
};

const persistMenuBarPosition = position => {
    try {
        localStorage.setItem(STORAGE_KEY, position);
    } catch (e) {
        // ignore
    }
};

export {
    STORAGE_KEY,
    DEFAULT_POSITION,
    detectMenuBarPosition,
    persistMenuBarPosition
};
