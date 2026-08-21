import {detectMenuBarPosition} from '../lib/menuBarPositionPersistance';

const SET_MENU_BAR_POSITION = 'scratch-gui/menu-bar-position/SET_MENU_BAR_POSITION';

const initialState = detectMenuBarPosition();

const reducer = (state = initialState, action) => {
    switch (action.type) {
    case SET_MENU_BAR_POSITION:
        return action.position;
    default:
        return state;
    }
};

const setMenuBarPosition = position => ({
    type: SET_MENU_BAR_POSITION,
    position
});

export {
    reducer as default,
    initialState as menuBarPositionInitialState,
    setMenuBarPosition
};
