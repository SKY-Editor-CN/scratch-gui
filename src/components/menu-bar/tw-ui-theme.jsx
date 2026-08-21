import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';

import check from './check.svg';
import dropdownCaret from './dropdown-caret.svg';
import {MenuItem, Submenu} from '../menu/menu.jsx';
import {THEME_PRESETS} from '../../lib/themes/presets.js';
import {openUiThemeMenu, uiThemeMenuOpen, closeSettingsMenu} from '../../reducers/menus.js';
import {setUiTheme} from '../../reducers/ui-theme.js';
import {persistUiTheme} from '../../lib/themes/uiThemePersistance.js';
import styles from './settings-menu.css';

const getPresetById = id => THEME_PRESETS.find(preset => preset.id === id) || THEME_PRESETS[0];

const ThemeColorIcon = ({color}) => (
    <div
        className={styles.accentIconOuter}
        style={{
            backgroundColor: color
        }}
    />
);

ThemeColorIcon.propTypes = {
    color: PropTypes.string
};

const ThemePresetMenuItem = ({preset, isSelected, onClick}) => (
    <MenuItem onClick={onClick}>
        <div className={styles.option}>
            <img
                className={classNames(styles.check, {[styles.selected]: isSelected})}
                width={15}
                height={12}
                src={check}
                draggable={false}
            />
            <ThemeColorIcon color={preset.iconColor} />
            <span>{preset.name}</span>
        </div>
    </MenuItem>
);

ThemePresetMenuItem.propTypes = {
    preset: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        iconColor: PropTypes.string
    }),
    isSelected: PropTypes.bool,
    onClick: PropTypes.func
};

const UiThemeMenu = ({
    isOpen,
    isRtl,
    onChangeTheme,
    onOpen,
    uiTheme
}) => (
    <MenuItem expanded={isOpen}>
        <div
            className={styles.option}
            onClick={onOpen}
        >
            <ThemeColorIcon color={getPresetById(uiTheme).iconColor} />
            <span className={styles.submenuLabel}>
                <FormattedMessage
                    defaultMessage="Theme"
                    description="Label for menu to choose editor UI theme preset"
                    id="tw.menuBar.theme"
                />
            </span>
            <img
                className={styles.expandCaret}
                src={dropdownCaret}
                draggable={false}
            />
        </div>
        <Submenu place={isRtl ? 'left' : 'right'}>
            {THEME_PRESETS.map(preset => (
                <ThemePresetMenuItem
                    key={preset.id}
                    preset={preset}
                    isSelected={uiTheme === preset.id}
                    // eslint-disable-next-line react/jsx-no-bind
                    onClick={() => onChangeTheme(preset.id)}
                />
            ))}
        </Submenu>
    </MenuItem>
);

UiThemeMenu.propTypes = {
    isOpen: PropTypes.bool,
    isRtl: PropTypes.bool,
    onChangeTheme: PropTypes.func,
    onOpen: PropTypes.func,
    uiTheme: PropTypes.string
};

const mapStateToProps = state => ({
    isOpen: uiThemeMenuOpen(state),
    isRtl: state.locales.isRtl,
    uiTheme: state.scratchGui.uiTheme
});

const mapDispatchToProps = dispatch => ({
    onChangeTheme: themeId => {
        dispatch(setUiTheme(themeId));
        dispatch(closeSettingsMenu());
        persistUiTheme(themeId);
        document.documentElement.setAttribute('data-ui-theme', themeId);
    },
    onOpen: () => dispatch(openUiThemeMenu())
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(UiThemeMenu);
