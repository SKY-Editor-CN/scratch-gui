import {detectContextMenuStyle} from '../lib/contextMenuStylePersistance';

const SET_CONTEXT_MENU_STYLE = 'scratch-gui/context-menu-style/SET_CONTEXT_MENU_STYLE';

const initialState = detectContextMenuStyle();

const reducer = (state = initialState, action) => {
    switch (action.type) {
    case SET_CONTEXT_MENU_STYLE:
        return action.style;
    default:
        return state;
    }
};

const setContextMenuStyle = style => ({
    type: SET_CONTEXT_MENU_STYLE,
    style
});

export {
    reducer as default,
    initialState as contextMenuStyleInitialState,
    setContextMenuStyle
};
