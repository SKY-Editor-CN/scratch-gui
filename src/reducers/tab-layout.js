import {detectTabLayout} from '../lib/tabLayoutPersistance';

const SET_TAB_LAYOUT = 'scratch-gui/tab-layout/SET_TAB_LAYOUT';

const initialState = detectTabLayout();

const reducer = (state = initialState, action) => {
    switch (action.type) {
    case SET_TAB_LAYOUT:
        return action.layout;
    default:
        return state;
    }
};

const setTabLayout = layout => ({
    type: SET_TAB_LAYOUT,
    layout
});

export {
    reducer as default,
    initialState as tabLayoutInitialState,
    setTabLayout
};
