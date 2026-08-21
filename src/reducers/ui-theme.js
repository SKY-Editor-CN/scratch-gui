import {detectUiTheme} from '../lib/themes/uiThemePersistance';

const SET_UI_THEME = 'scratch-gui/ui-theme/SET_UI_THEME';

const initialState = detectUiTheme();

const reducer = (state = initialState, action) => {
    switch (action.type) {
    case SET_UI_THEME:
        return action.theme;
    default:
        return state;
    }
};

const setUiTheme = theme => ({
    type: SET_UI_THEME,
    theme
});

export {
    reducer as default,
    initialState as uiThemeInitialState,
    setUiTheme
};
