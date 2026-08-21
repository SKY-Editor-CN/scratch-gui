const STORAGE_KEY = 'sky:tab-layout';
const DEFAULT_LAYOUT = 'vertical';

const detectTabLayout = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'vertical' || stored === 'horizontal') {
            return stored;
        }
    } catch (e) {
        // ignore
    }
    return DEFAULT_LAYOUT;
};

const persistTabLayout = layout => {
    try {
        localStorage.setItem(STORAGE_KEY, layout);
    } catch (e) {
        // ignore
    }
};

export {
    STORAGE_KEY,
    DEFAULT_LAYOUT,
    detectTabLayout,
    persistTabLayout
};
