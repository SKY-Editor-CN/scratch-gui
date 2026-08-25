import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useEffect, useRef, useState} from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import {connect} from 'react-redux';
import bindAll from 'lodash.bindall';

import locales from '@turbowarp/scratch-l10n';

import Win11Window from '../tw-win11-window/win11-window.jsx';
import {SettingsModalBody} from '../tw-settings-modal/settings-modal.jsx';
import {defaultStageSize} from '../../reducers/custom-stage-size';

import check from './check.svg';
import lightModeIcon from './tw-sun.svg';
import darkModeIcon from './tw-moon.svg';
import themePaletteIcon from './tw-theme-palette.svg';
import threeIcon from './tw-blocks-three.svg';
import highContrastIcon from './tw-blocks-high-contrast.svg';
import darkIcon from './tw-blocks-dark.svg';
import customIcon from './tw-blocks-custom.svg';
import openLinkIcon from './tw-open-link.svg';
import rainbowIcon from './tw-accent-rainbow.svg';
import desktopIcon from './tw-desktop-icon.svg';
import settingsIcon from './icon--settings.svg';
import languageIcon from '../language-selector/language-icon.svg';
import advancedIcon from './tw-advanced.svg';
import layoutIcon from './tw-layout.svg';
import wallpaperIcon from './tw-wallpaper.svg';
import fontIcon from './tw-font.svg';
import loadingIcon from './tw-loading.svg';
import menuBarIcon from './tw-menu-bar.svg';
import tabsIcon from './tw-tabs.svg';
import contextMenuIcon from './tw-context-menu.svg';

import {
    GUI_DARK,
    GUI_LIGHT,
    BLOCKS_CUSTOM,
    BLOCKS_DARK,
    BLOCKS_HIGH_CONTRAST,
    BLOCKS_THREE,
    Theme
} from '../../lib/themes/index.js';
import {accentOptions, ColorIcon} from '../../lib/themes/accent-options.jsx';
import {THEME_PRESETS} from '../../lib/themes/presets.js';
import {selectLocale} from '../../reducers/locales.js';
import {setTheme} from '../../reducers/theme.js';
import {setUiTheme} from '../../reducers/ui-theme.js';
import {setMenuBarPosition} from '../../reducers/menu-bar-position.js';
import {setTabLayout} from '../../reducers/tab-layout.js';
import {setContextMenuStyle} from '../../reducers/context-menu-style.js';
import {persistTheme} from '../../lib/themes/themePersistance.js';
import {persistUiTheme} from '../../lib/themes/uiThemePersistance.js';
import {persistMenuBarPosition} from '../../lib/menuBarPositionPersistance.js';
import {persistTabLayout} from '../../lib/tabLayoutPersistance.js';
import {persistContextMenuStyle, applyContextMenuStyle} from '../../lib/contextMenuStylePersistance.js';

import styles from './settings-menu.css';

const messages = defineMessages({
    newFramerate: {
        defaultMessage: 'New framerate:',
        description: 'Prompt shown to choose a new framerate',
        id: 'tw.menuBar.newFramerate'
    },
    settingsTitle: {
        defaultMessage: 'Settings',
        description: 'Title of the combined settings window',
        id: 'gui.menuBar.settings'
    },
    languageTab: {
        defaultMessage: 'Language',
        description: 'Tab label for language settings in the combined settings window',
        id: 'tw.settingsWindow.languageTab'
    },
    themeTab: {
        defaultMessage: 'Theme',
        description: 'Tab label for theme settings in the combined settings window',
        id: 'tw.settingsWindow.themeTab'
    },
    blocksTab: {
        defaultMessage: 'Block Colors',
        description: 'Tab label for block color settings in the combined settings window',
        id: 'tw.settingsWindow.blocksTab'
    },
    accentTab: {
        defaultMessage: 'Accent',
        description: 'Tab label for accent settings in the combined settings window',
        id: 'tw.settingsWindow.accentTab'
    },
    skyAppearanceTab: {
        defaultMessage: 'SKYEditor 外观',
        description: 'Tab label for SKYEditor appearance settings in the combined settings window',
        id: 'tw.settingsWindow.skyAppearanceTab'
    },
    layoutTab: {
        defaultMessage: '布局',
        description: 'Tab label for layout settings in the combined settings window',
        id: 'tw.settingsWindow.layoutTab'
    },
    wallpaperTab: {
        defaultMessage: '壁纸',
        description: 'Tab label for wallpaper settings in the combined settings window',
        id: 'tw.settingsWindow.wallpaperTab'
    },
    fontTab: {
        defaultMessage: '字体',
        description: 'Tab label for font settings in the combined settings window',
        id: 'tw.settingsWindow.fontTab'
    },
    loadingTab: {
        defaultMessage: '加载动画',
        description: 'Tab label for loading animation settings in the combined settings window',
        id: 'tw.settingsWindow.loadingTab'
    },
    wallpaperPlaceholder: {
        defaultMessage: '壁纸设置功能开发中，敬请期待',
        description: 'Placeholder text shown in the wallpaper settings tab',
        id: 'tw.settingsWindow.wallpaperPlaceholder'
    },
    fontPlaceholder: {
        defaultMessage: '字体设置功能开发中，敬请期待',
        description: 'Placeholder text shown in the font settings tab',
        id: 'tw.settingsWindow.fontPlaceholder'
    },
    loadingPlaceholder: {
        defaultMessage: '加载动画设置功能开发中，敬请期待',
        description: 'Placeholder text shown in the loading animation settings tab',
        id: 'tw.settingsWindow.loadingPlaceholder'
    },
    skyAppearancePlaceholder: {
        defaultMessage: 'SKYEditor 外观设置功能开发中，敬请期待',
        description: 'Placeholder text shown in the SKYEditor appearance settings tab',
        id: 'tw.settingsWindow.skyAppearancePlaceholder'
    },
    menuBarPositionLabel: {
        defaultMessage: '菜单栏位置',
        description: 'Label for the menu bar position setting in the combined settings window',
        id: 'tw.settingsWindow.menuBarPosition'
    },
    tabLayoutLabel: {
        defaultMessage: '标签栏布局',
        description: 'Label for the tab layout setting in the combined settings window',
        id: 'tw.settingsWindow.tabLayout'
    },
    contextMenuStyleLabel: {
        defaultMessage: '右键菜单样式',
        description: 'Label for the context menu style setting in the combined settings window',
        id: 'tw.settingsWindow.contextMenuStyle'
    },
    advancedTab: {
        defaultMessage: 'General',
        description: 'Tab label for general settings in the combined settings window',
        id: 'tw.settingsWindow.advancedTab'
    },
    generalCategory: {
        defaultMessage: 'General',
        description: 'Category name for the general settings group in the combined settings window',
        id: 'tw.settingsWindow.generalCategory'
    },
    appearanceCategory: {
        defaultMessage: 'Appearance',
        description: 'Category name for the appearance settings group in the combined settings window',
        id: 'tw.settingsWindow.appearanceCategory'
    },
    toolsCategory: {
        defaultMessage: 'Tools',
        description: 'Category name for the tools settings group in the combined settings window',
        id: 'tw.settingsWindow.toolsCategory'
    },
    experimentalCategory: {
        defaultMessage: 'Experimental Features',
        description: 'Category name for the experimental settings group in the combined settings window',
        id: 'tw.settingsWindow.experimentalCategory'
    }
});

const SETTINGS_CATEGORIES = [
    {
        id: 'general',
        message: messages.generalCategory,
        icon: settingsIcon,
        items: [
            {id: 'advanced', message: messages.advancedTab, icon: advancedIcon},
            {id: 'language', message: messages.languageTab, icon: languageIcon}
        ]
    },
    {
        id: 'appearance',
        message: messages.appearanceCategory,
        icon: threeIcon,
        items: [
            {id: 'theme', message: messages.themeTab, icon: themePaletteIcon},
            {id: 'layout', message: messages.layoutTab, icon: layoutIcon},
            {id: 'wallpaper', message: messages.wallpaperTab, icon: wallpaperIcon},
            {id: 'font', message: messages.fontTab, icon: fontIcon},
            {id: 'loading', message: messages.loadingTab, icon: loadingIcon},
            {id: 'sky-appearance', message: messages.skyAppearanceTab, icon: settingsIcon}
        ]
    },
    {
        id: 'tools',
        message: messages.toolsCategory,
        icon: advancedIcon,
        items: []
    },
    {
        id: 'experimental',
        message: messages.experimentalCategory,
        icon: desktopIcon,
        items: []
    }
];

const normalizeTab = tab => (tab === 'advanced' ? 'advanced' : 'language');

const blockOptions = defineMessages({
    three: {
        defaultMessage: 'Original',
        description: 'Name of normal Scratch block colors.',
        id: 'tw.blockColors.three'
    },
    'high-contrast': {
        defaultMessage: 'High Contrast',
        description: 'Name of the high contrast block colors.',
        id: 'tw.blockColors.highContrast'
    },
    dark: {
        defaultMessage: 'Dark (Beta)',
        description: 'Name of the dark block colors',
        id: 'tw.blockColors.dark'
    },
    custom: {
        defaultMessage: 'Customize in Addon Settings',
        description: 'Link in block color list to open addon settings for more customization',
        id: 'tw.blockColors.custom'
    }
});

const blockIcons = {
    [BLOCKS_THREE]: threeIcon,
    [BLOCKS_HIGH_CONTRAST]: highContrastIcon,
    [BLOCKS_DARK]: darkIcon,
    [BLOCKS_CUSTOM]: customIcon
};

const menuBarPositionOptions = defineMessages({
    left: {
        defaultMessage: '靠左',
        description: 'Option to align the menu bar to the left',
        id: 'tw.settingsWindow.menuBarPositionLeft'
    },
    center: {
        defaultMessage: '居中',
        description: 'Option to center the menu bar',
        id: 'tw.settingsWindow.menuBarPositionCenter'
    }
});

const tabLayoutOptions = defineMessages({
    vertical: {
        defaultMessage: '竖向',
        description: 'Option to display the editor tabs vertically',
        id: 'tw.settingsWindow.tabLayoutVertical'
    },
    horizontal: {
        defaultMessage: '横向',
        description: 'Option to display the editor tabs horizontally',
        id: 'tw.settingsWindow.tabLayoutHorizontal'
    }
});

const contextMenuStyleOptions = defineMessages({
    tw: {
        defaultMessage: '经典样式',
        description: 'Option to use the original classic context menu style',
        id: 'tw.settingsWindow.contextMenuStyleTw'
    },
    se: {
        defaultMessage: 'SKYEditor样式',
        description: 'Option to use the SKYEditor context menu style',
        id: 'tw.settingsWindow.contextMenuStyleSe'
    }
});



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

const SquareColorIcon = ({color}) => (
    <div
        className={styles.squareColorIcon}
        style={{
            backgroundColor: color
        }}
    />
);

SquareColorIcon.propTypes = {
    color: PropTypes.string
};

const Check = ({selected}) => (
    <img
        className={classNames(styles.check, {[styles.selected]: selected})}
        src={check}
        draggable={false}
        width={15}
        height={12}
        alt=""
    />
);

Check.propTypes = {
    selected: PropTypes.bool
};

const ThemeCard = ({
    selected,
    disabled,
    onClick,
    icon,
    label,
    extra
}) => (
    <div
        className={classNames(styles.themeCard, {
            [styles.themeCardSelected]: selected,
            [styles.disabled]: disabled
        })}
        // eslint-disable-next-line react/jsx-no-bind
        onClick={onClick}
    >
        <div className={styles.themeCardIcon}>
            {icon}
        </div>
        <div className={styles.themeCardLabel}>
            {label}
        </div>
        {extra}
    </div>
);

ThemeCard.propTypes = {
    disabled: PropTypes.bool,
    extra: PropTypes.node,
    icon: PropTypes.node,
    label: PropTypes.node,
    onClick: PropTypes.func,
    selected: PropTypes.bool
};

const PlaceholderTab = ({
    title,
    description,
    icon
}) => (
    <div className={styles.windowSettings}>
        <div className={styles.windowSectionHeader}>
            <img
                className={styles.windowTabIcon}
                src={icon}
                draggable={false}
                width={16}
                height={16}
                alt=""
            />
            <FormattedMessage {...title} />
            <div className={styles.windowSectionDivider} />
        </div>
        <div className={styles.windowPlaceholder}>
            <FormattedMessage {...description} />
        </div>
    </div>
);

PlaceholderTab.propTypes = {
    title: PropTypes.shape({
        id: PropTypes.string
    }),
    description: PropTypes.shape({
        id: PropTypes.string
    }),
    icon: PropTypes.string
};

const LanguageTab = ({
    canChangeLanguage,
    currentLocale,
    onChangeLanguage,
    onClickDesktopSettings
}) => {
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
    const languageMenuRef = useRef(null);

    useEffect(() => {
        if (!languageMenuOpen) return undefined;
        const handleMouseDown = e => {
            if (languageMenuRef.current && !languageMenuRef.current.contains(e.target)) {
                setLanguageMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [languageMenuOpen]);

    const currentLanguageName = locales[currentLocale] ?
        locales[currentLocale].name :
        '';

    return (
        <div className={styles.windowSettings}>
            <div className={styles.windowSectionHeader}>
                <img
                    className={styles.windowTabIcon}
                    src={languageIcon}
                    draggable={false}
                    width={16}
                    height={16}
                    alt=""
                />
                <FormattedMessage {...messages.languageTab} />
                <div className={styles.windowSectionDivider} />
            </div>
            {canChangeLanguage && (
                <div
                    ref={languageMenuRef}
                    className={styles.languageDropdown}
                >
                    <button
                        className={styles.languageDropdownButton}
                        onClick={() => setLanguageMenuOpen(open => !open)}
                    >
                        <span>{currentLanguageName}</span>
                        <span
                            className={classNames(styles.languageDropdownCaret, {
                                [styles.languageDropdownCaretOpen]: languageMenuOpen
                            })}
                        >
                            {'▾'}
                        </span>
                    </button>
                    {languageMenuOpen && (
                        <div className={styles.languageDropdownMenu}>
                            {Object.keys(locales).map(locale => (
                                <div
                                    key={locale}
                                    className={styles.windowOption}
                                    // eslint-disable-next-line react/jsx-no-bind
                                    onClick={() => {
                                        onChangeLanguage(locale);
                                        setLanguageMenuOpen(false);
                                    }}
                                >
                                    <Check selected={currentLocale === locale} />
                                    <span>{locales[locale].name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {onClickDesktopSettings && (
                <div
                    className={styles.windowOption}
                    onClick={onClickDesktopSettings}
                >
                    <img
                        src={desktopIcon}
                        draggable={false}
                        width={24}
                        height={24}
                        alt=""
                    />
                    <FormattedMessage
                        defaultMessage="Desktop Settings"
                        description="Button in menu bar under settings to open desktop app settings"
                        id="tw.menuBar.desktopSettings"
                    />
                </div>
            )}
        </div>
    );
};

LanguageTab.propTypes = {
    canChangeLanguage: PropTypes.bool,
    currentLocale: PropTypes.string,
    onChangeLanguage: PropTypes.func,
    onClickDesktopSettings: PropTypes.func
};

const LayoutTab = ({
    menuBarPosition,
    onChangeMenuBarPosition,
    tabLayout,
    onChangeTabLayout,
    contextMenuStyle,
    onChangeContextMenuStyle
}) => {
    const [positionMenuOpen, setPositionMenuOpen] = useState(false);
    const positionMenuRef = useRef(null);
    const [tabLayoutMenuOpen, setTabLayoutMenuOpen] = useState(false);
    const tabLayoutMenuRef = useRef(null);
    const [contextMenuStyleOpen, setContextMenuStyleOpen] = useState(false);
    const contextMenuStyleRef = useRef(null);

    useEffect(() => {
        if (!positionMenuOpen && !tabLayoutMenuOpen && !contextMenuStyleOpen) return undefined;
        const handleMouseDown = e => {
            if (positionMenuRef.current && !positionMenuRef.current.contains(e.target)) {
                setPositionMenuOpen(false);
            }
            if (tabLayoutMenuRef.current && !tabLayoutMenuRef.current.contains(e.target)) {
                setTabLayoutMenuOpen(false);
            }
            if (contextMenuStyleRef.current && !contextMenuStyleRef.current.contains(e.target)) {
                setContextMenuStyleOpen(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [positionMenuOpen, tabLayoutMenuOpen, contextMenuStyleOpen]);

    const positionOptions = [
        {id: 'left', message: menuBarPositionOptions.left},
        {id: 'center', message: menuBarPositionOptions.center}
    ];
    const currentPosition = positionOptions.find(o => o.id === menuBarPosition) ||
        positionOptions[1];

    const tabLayoutOptionsList = [
        {id: 'vertical', message: tabLayoutOptions.vertical},
        {id: 'horizontal', message: tabLayoutOptions.horizontal}
    ];
    const currentTabLayout = tabLayoutOptionsList.find(o => o.id === tabLayout) ||
        tabLayoutOptionsList[0];

    const contextMenuStyleOptionsList = [
        {id: 'tw', message: contextMenuStyleOptions.tw},
        {id: 'se', message: contextMenuStyleOptions.se}
    ];
    const currentContextMenuStyle = contextMenuStyleOptionsList.find(o => o.id === contextMenuStyle) ||
        contextMenuStyleOptionsList[0];

    return (
        <div className={styles.windowSettings}>
            <div className={styles.windowSectionHeader}>
                <img
                    className={styles.windowTabIcon}
                    src={menuBarIcon}
                    draggable={false}
                    width={16}
                    height={16}
                    alt=""
                />
                <FormattedMessage {...messages.menuBarPositionLabel} />
                <div className={styles.windowSectionDivider} />
            </div>
            <div
                ref={positionMenuRef}
                className={styles.languageDropdown}
            >
                <button
                    className={styles.languageDropdownButton}
                    onClick={() => setPositionMenuOpen(open => !open)}
                >
                    <span><FormattedMessage {...currentPosition.message} /></span>
                    <span
                        className={classNames(styles.languageDropdownCaret, {
                            [styles.languageDropdownCaretOpen]: positionMenuOpen
                        })}
                    >
                        {'▾'}
                    </span>
                </button>
                {positionMenuOpen && (
                    <div className={styles.languageDropdownMenu}>
                        {positionOptions.map(option => (
                            <div
                                key={option.id}
                                className={styles.windowOption}
                                // eslint-disable-next-line react/jsx-no-bind
                                onClick={() => {
                                    onChangeMenuBarPosition(option.id);
                                    setPositionMenuOpen(false);
                                }}
                            >
                                <Check selected={menuBarPosition === option.id} />
                                <FormattedMessage {...option.message} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className={styles.windowSectionHeader}>
                <img
                    className={styles.windowTabIcon}
                    src={tabsIcon}
                    draggable={false}
                    width={16}
                    height={16}
                    alt=""
                />
                <FormattedMessage {...messages.tabLayoutLabel} />
                <div className={styles.windowSectionDivider} />
            </div>
            <div
                ref={tabLayoutMenuRef}
                className={styles.languageDropdown}
            >
                <button
                    className={styles.languageDropdownButton}
                    onClick={() => setTabLayoutMenuOpen(open => !open)}
                >
                    <span><FormattedMessage {...currentTabLayout.message} /></span>
                    <span
                        className={classNames(styles.languageDropdownCaret, {
                            [styles.languageDropdownCaretOpen]: tabLayoutMenuOpen
                        })}
                    >
                        {'▾'}
                    </span>
                </button>
                {tabLayoutMenuOpen && (
                    <div className={styles.languageDropdownMenu}>
                        {tabLayoutOptionsList.map(option => (
                            <div
                                key={option.id}
                                className={styles.windowOption}
                                // eslint-disable-next-line react/jsx-no-bind
                                onClick={() => {
                                    onChangeTabLayout(option.id);
                                    setTabLayoutMenuOpen(false);
                                }}
                            >
                                <Check selected={tabLayout === option.id} />
                                <FormattedMessage {...option.message} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className={styles.windowSectionHeader}>
                <img
                    className={styles.windowTabIcon}
                    src={contextMenuIcon}
                    draggable={false}
                    width={16}
                    height={16}
                    alt=""
                />
                <FormattedMessage {...messages.contextMenuStyleLabel} />
                <div className={styles.windowSectionDivider} />
            </div>
            <div
                ref={contextMenuStyleRef}
                className={styles.languageDropdown}
            >
                <button
                    className={styles.languageDropdownButton}
                    onClick={() => setContextMenuStyleOpen(open => !open)}
                >
                    <span><FormattedMessage {...currentContextMenuStyle.message} /></span>
                    <span
                        className={classNames(styles.languageDropdownCaret, {
                            [styles.languageDropdownCaretOpen]: contextMenuStyleOpen
                        })}
                    >
                        {'▾'}
                    </span>
                </button>
                {contextMenuStyleOpen && (
                    <div className={styles.languageDropdownMenu}>
                        {contextMenuStyleOptionsList.map(option => (
                            <div
                                key={option.id}
                                className={styles.windowOption}
                                // eslint-disable-next-line react/jsx-no-bind
                                onClick={() => {
                                    onChangeContextMenuStyle(option.id);
                                    setContextMenuStyleOpen(false);
                                }}
                            >
                                <Check selected={contextMenuStyle === option.id} />
                                <FormattedMessage {...option.message} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

LayoutTab.propTypes = {
    menuBarPosition: PropTypes.string,
    onChangeMenuBarPosition: PropTypes.func,
    tabLayout: PropTypes.string,
    onChangeTabLayout: PropTypes.func,
    contextMenuStyle: PropTypes.string,
    onChangeContextMenuStyle: PropTypes.func
};

const ThemeTab = ({
    canChangeTheme,
    onChangeTheme,
    onChangeUiTheme,
    theme,
    uiTheme
}) => (
    <div className={styles.windowSettings}>
        {canChangeTheme && (
            <React.Fragment>
                {THEME_PRESETS.map(preset => (
                    <div
                        key={preset.id}
                        className={styles.windowOption}
                        // eslint-disable-next-line react/jsx-no-bind
                        onClick={() => onChangeUiTheme(preset.id)}
                    >
                        <Check selected={uiTheme === preset.id} />
                        <ThemeColorIcon color={preset.iconColor} />
                        <span>{preset.name}</span>
                    </div>
                ))}
                <div
                    className={styles.windowOption}
                    // eslint-disable-next-line react/jsx-no-bind
                    onClick={() => onChangeTheme(theme.set('gui', theme.gui === GUI_DARK ? GUI_LIGHT : GUI_DARK))}
                >
                    <Check selected={false} />
                    <img
                        src={theme.gui === GUI_DARK ? lightModeIcon : darkModeIcon}
                        draggable={false}
                        width={24}
                        height={24}
                        alt=""
                    />
                    <span>
                        {theme.gui === GUI_DARK ? (
                            <FormattedMessage
                                defaultMessage="Switch To Light Mode"
                                description="Menu item to change color scheme to light (it is currently dark)"
                                id="tw.darkMode"
                            />
                        ) : (
                            <FormattedMessage
                                defaultMessage="Switch To Dark Mode"
                                description="Menu item to change color scheme to dark (it is currently light)"
                                id="tw.lightMode"
                            />
                        )}
                    </span>
                </div>
            </React.Fragment>
        )}
    </div>
);

ThemeTab.propTypes = {
    canChangeTheme: PropTypes.bool,
    onChangeTheme: PropTypes.func,
    onChangeUiTheme: PropTypes.func,
    theme: PropTypes.instanceOf(Theme),
    uiTheme: PropTypes.string
};

const MergedThemeTab = ({
    canChangeTheme,
    onChangeTheme,
    onChangeUiTheme,
    onOpenCustomSettings,
    theme,
    uiTheme
}) => {
    const [accentMenuOpen, setAccentMenuOpen] = useState(false);
    const accentMenuRef = useRef(null);

    useEffect(() => {
        if (!accentMenuOpen) return undefined;
        const handleMouseDown = e => {
            if (accentMenuRef.current && !accentMenuRef.current.contains(e.target)) {
                setAccentMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [accentMenuOpen]);

    const currentAccent = accentOptions[theme.accent] ?
        <FormattedMessage {...accentOptions[theme.accent]} /> :
        theme.accent;

    return (
        <div className={styles.windowSettings}>
            {canChangeTheme && (
                <React.Fragment>
                    <div className={styles.windowSectionHeader}>
                        <img
                            className={styles.windowTabIcon}
                            src={rainbowIcon}
                            draggable={false}
                            width={16}
                            height={16}
                            alt=""
                        />
                        <FormattedMessage {...messages.accentTab} />
                        <div className={styles.windowSectionDivider} />
                    </div>
                    <div
                        ref={accentMenuRef}
                        className={styles.languageDropdown}
                    >
                        <button
                            className={styles.languageDropdownButton}
                            onClick={() => setAccentMenuOpen(open => !open)}
                        >
                            <span>{currentAccent}</span>
                            <span
                                className={classNames(styles.languageDropdownCaret, {
                                    [styles.languageDropdownCaretOpen]: accentMenuOpen
                                })}
                            >
                                {'▾'}
                            </span>
                        </button>
                        {accentMenuOpen && (
                            <div className={styles.languageDropdownMenu}>
                                {Object.keys(accentOptions).map(id => (
                                    <div
                                        key={id}
                                        className={styles.windowOption}
                                        // eslint-disable-next-line react/jsx-no-bind
                                        onClick={() => {
                                            onChangeTheme(theme.set('accent', id));
                                            setAccentMenuOpen(false);
                                        }}
                                    >
                                        <Check selected={theme.accent === id} />
                                        <ColorIcon id={id} />
                                        <FormattedMessage {...accentOptions[id]} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className={styles.windowSectionHeader}>
                        <img
                            className={styles.windowTabIcon}
                            src={themePaletteIcon}
                            draggable={false}
                            width={16}
                            height={16}
                            alt=""
                        />
                        <FormattedMessage {...messages.themeTab} />
                        <div className={styles.windowSectionDivider} />
                    </div>
                    <div className={styles.themeCardRow}>
                        <ThemeCard
                            selected={false}
                            onClick={() => onChangeTheme(theme.set('gui', theme.gui === GUI_DARK ? GUI_LIGHT : GUI_DARK))}
                            icon={
                                <img
                                    src={theme.gui === GUI_DARK ? lightModeIcon : darkModeIcon}
                                    className={theme.gui === GUI_DARK ? undefined : styles.themeCardIconInvert}
                                    draggable={false}
                                    width={24}
                                    height={24}
                                    alt=""
                                />
                            }
                            label={
                                theme.gui === GUI_DARK ? (
                                    <FormattedMessage
                                        defaultMessage="Switch To Light Mode"
                                        description="Menu item to change color scheme to light (it is currently dark)"
                                        id="tw.darkMode"
                                    />
                                ) : (
                                    <FormattedMessage
                                        defaultMessage="Switch To Dark Mode"
                                        description="Menu item to change color scheme to dark (it is currently light)"
                                        id="tw.lightMode"
                                    />
                                )
                            }
                        />
                    </div>
                    <div className={styles.themeCardRow}>
                        {THEME_PRESETS.map(preset => (
                            <ThemeCard
                                key={preset.id}
                                selected={uiTheme === preset.id}
                                onClick={() => onChangeUiTheme(preset.id)}
                                icon={<SquareColorIcon color={preset.iconColor} />}
                                label={<span>{preset.name}</span>}
                            />
                        ))}
                    </div>
                    <div className={styles.windowSectionHeader}>
                        <img
                            className={styles.windowTabIcon}
                            src={threeIcon}
                            draggable={false}
                            width={16}
                            height={16}
                            alt=""
                        />
                        <FormattedMessage {...messages.blocksTab} />
                        <div className={styles.windowSectionDivider} />
                    </div>
                    <div className={styles.themeCardRow}>
                        {[
                            BLOCKS_THREE,
                            BLOCKS_HIGH_CONTRAST,
                            BLOCKS_DARK,
                            ...(onOpenCustomSettings ? [BLOCKS_CUSTOM] : [])
                        ].map(id => {
                            const disabled = id !== BLOCKS_CUSTOM && theme.blocks === BLOCKS_CUSTOM;
                            return (
                                <ThemeCard
                                    key={id}
                                    selected={theme.blocks === id}
                                    disabled={disabled}
                                    onClick={
                                        id === BLOCKS_CUSTOM ?
                                            onOpenCustomSettings :
                                            (disabled ? undefined : () => onChangeTheme(theme.set('blocks', id)))
                                    }
                                    icon={
                                        <img
                                            src={blockIcons[id]}
                                            className={id === BLOCKS_CUSTOM ? styles.themeCardIconInvert : undefined}
                                            draggable={false}
                                            width={24}
                                            height={24}
                                            alt=""
                                        />
                                    }
                                    label={<FormattedMessage {...blockOptions[id]} />}
                                    extra={id === BLOCKS_CUSTOM ? (
                                        <img
                                            className={styles.openLink}
                                            src={openLinkIcon}
                                            draggable={false}
                                            width={16}
                                            height={16}
                                            alt=""
                                        />
                                    ) : null}
                                />
                            );
                        })}
                    </div>
                </React.Fragment>
            )}
        </div>
    );
};

MergedThemeTab.propTypes = {
    canChangeTheme: PropTypes.bool,
    onChangeTheme: PropTypes.func,
    onChangeUiTheme: PropTypes.func,
    onOpenCustomSettings: PropTypes.func,
    theme: PropTypes.instanceOf(Theme),
    uiTheme: PropTypes.string
};

class SettingsWindow extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleFramerateChange',
            'handleCustomizeFramerate',
            'handleHighQualityPenChange',
            'handleInterpolationChange',
            'handleInfiniteClonesChange',
            'handleRemoveFencingChange',
            'handleRemoveLimitsChange',
            'handleWarpTimerChange',
            'handleStageWidthChange',
            'handleStageHeightChange',
            'handleDisableCompilerChange',
            'handleStoreProjectOptions',
            'handleSelectTab',
            'handleToggleCategory'
        ]);
        this.state = {
            activeTab: normalizeTab(props.defaultTab),
            collapsedCategories: {}
        };
    }
    componentDidUpdate (prevProps) {
        const nextTab = normalizeTab(this.props.defaultTab);
        const prevTab = normalizeTab(prevProps.defaultTab);
        if (this.props.defaultTab && nextTab !== prevTab) {
            this.setState({activeTab: nextTab});
        }
    }
    handleFramerateChange (e) {
        this.props.vm.setFramerate(e.target.checked ? 60 : 30);
    }
    async handleCustomizeFramerate () {
        // prompt() returns Promise in desktop app
        // eslint-disable-next-line no-alert
        const newFramerate = await prompt(this.props.intl.formatMessage(messages.newFramerate), this.props.framerate);
        const parsed = parseFloat(newFramerate);
        if (isFinite(parsed)) {
            this.props.vm.setFramerate(parsed);
        }
    }
    handleHighQualityPenChange (e) {
        this.props.vm.renderer.setUseHighQualityRender(e.target.checked);
    }
    handleInterpolationChange (e) {
        this.props.vm.setInterpolation(e.target.checked);
    }
    handleInfiniteClonesChange (e) {
        this.props.vm.setRuntimeOptions({
            maxClones: e.target.checked ? Infinity : 300
        });
    }
    handleRemoveFencingChange (e) {
        this.props.vm.setRuntimeOptions({
            fencing: !e.target.checked
        });
    }
    handleRemoveLimitsChange (e) {
        this.props.vm.setRuntimeOptions({
            miscLimits: !e.target.checked
        });
    }
    handleWarpTimerChange (e) {
        this.props.vm.setCompilerOptions({
            warpTimer: e.target.checked
        });
    }
    handleDisableCompilerChange (e) {
        this.props.vm.setCompilerOptions({
            enabled: !e.target.checked
        });
    }
    handleStageWidthChange (value) {
        this.props.vm.setStageSize(value, this.props.customStageSize.height);
    }
    handleStageHeightChange (value) {
        this.props.vm.setStageSize(this.props.customStageSize.width, value);
    }
    handleStoreProjectOptions () {
        this.props.vm.storeProjectOptions();
    }
    handleSelectTab (tab) {
        this.setState({activeTab: tab});
    }
    handleToggleCategory (categoryId) {
        this.setState(prevState => ({
            collapsedCategories: {
                ...prevState.collapsedCategories,
                [categoryId]: !prevState.collapsedCategories[categoryId]
            }
        }));
    }
    render () {
        const {
            canChangeLanguage,
            canChangeTheme,
            currentLocale,
            menuBarPosition,
            tabLayout,
            contextMenuStyle,
            onClickDesktopSettings,
            onChangeLanguage,
            onChangeMenuBarPosition,
            onChangeTabLayout,
            onChangeContextMenuStyle,
            onChangeTheme,
            onChangeUiTheme,
            onOpenCustomSettings,
            onClose,
            theme,
            uiTheme,
            isEmbedded,
            framerate,
            highQualityPen,
            interpolation,
            infiniteClones,
            removeFencing,
            removeLimits,
            warpTimer,
            customStageSize,
            disableCompiler
        } = this.props;

        const {activeTab} = this.state;

        const advancedProps = {
            isEmbedded,
            framerate,
            onFramerateChange: this.handleFramerateChange,
            onCustomizeFramerate: this.handleCustomizeFramerate,
            interpolation,
            onInterpolationChange: this.handleInterpolationChange,
            highQualityPen,
            onHighQualityPenChange: this.handleHighQualityPenChange,
            warpTimer,
            onWarpTimerChange: this.handleWarpTimerChange,
            infiniteClones,
            onInfiniteClonesChange: this.handleInfiniteClonesChange,
            removeFencing,
            onRemoveFencingChange: this.handleRemoveFencingChange,
            removeLimits,
            onRemoveLimitsChange: this.handleRemoveLimitsChange,
            stageWidth: customStageSize.width,
            stageHeight: customStageSize.height,
            customStageSizeEnabled:
                customStageSize.width !== defaultStageSize.width ||
                customStageSize.height !== defaultStageSize.height,
            onStageWidthChange: this.handleStageWidthChange,
            onStageHeightChange: this.handleStageHeightChange,
            disableCompiler,
            onDisableCompilerChange: this.handleDisableCompilerChange,
            onStoreProjectOptions: this.handleStoreProjectOptions
        };

        const title = this.props.intl.formatMessage(messages.settingsTitle);

        return (
            <Win11Window
                title={title}
                onClose={onClose}
                icon={settingsIcon}
                defaultWidth={960}
                defaultHeight={576}
            >
                <div className={styles.windowShell}>
                    <div
                        className={classNames(styles.windowSidebar, {
                            [styles.windowSidebarLight]: theme.gui === GUI_LIGHT
                        })}
                    >
                        {SETTINGS_CATEGORIES.map(category => (
                            <React.Fragment key={category.id}>
                                <button
                                    className={classNames(styles.windowCategory, {
                                        [styles.windowCategoryExpanded]:
                                            !this.state.collapsedCategories[category.id]
                                    })}
                                    onClick={this.handleToggleCategory.bind(this, category.id)}
                                >
                                    <img
                                        className={styles.windowTabIcon}
                                        src={category.icon}
                                        draggable={false}
                                        width={16}
                                        height={16}
                                        alt=""
                                    />
                                    <span className={styles.windowCategoryLabel}>
                                        <FormattedMessage {...category.message} />
                                    </span>
                                    <span
                                        className={classNames(styles.windowCategoryCaret, {
                                            [styles.windowCategoryCaretExpanded]:
                                                !this.state.collapsedCategories[category.id]
                                        })}
                                    >
                                        {'▸'}
                                    </span>
                                </button>
                                {!this.state.collapsedCategories[category.id] && category.items.map(item => (
                                    <button
                                        key={item.id}
                                        className={classNames(styles.windowTab, {
                                            [styles.windowTabActive]: activeTab === item.id
                                        })}
                                        onClick={this.handleSelectTab.bind(this, item.id)}
                                    >
                                        <img
                                            className={styles.windowTabIcon}
                                            src={item.icon}
                                            draggable={false}
                                            width={16}
                                            height={16}
                                            alt=""
                                        />
                                        <FormattedMessage {...item.message} />
                                    </button>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className={styles.windowContent}>
                        {activeTab === 'language' && (
                            <LanguageTab
                                canChangeLanguage={canChangeLanguage}
                                currentLocale={currentLocale}
                                onChangeLanguage={onChangeLanguage}
                                onClickDesktopSettings={onClickDesktopSettings}
                            />
                        )}
                        {activeTab === 'sky-appearance' && (
                            <PlaceholderTab
                                title={messages.skyAppearanceTab}
                                description={messages.skyAppearancePlaceholder}
                                icon={settingsIcon}
                            />
                        )}
                        {activeTab === 'layout' && (
                            <LayoutTab
                                menuBarPosition={menuBarPosition}
                                onChangeMenuBarPosition={onChangeMenuBarPosition}
                                tabLayout={tabLayout}
                                onChangeTabLayout={onChangeTabLayout}
                                contextMenuStyle={contextMenuStyle}
                                onChangeContextMenuStyle={onChangeContextMenuStyle}
                            />
                        )}
                        {activeTab === 'wallpaper' && (
                            <PlaceholderTab
                                title={messages.wallpaperTab}
                                description={messages.wallpaperPlaceholder}
                                icon={wallpaperIcon}
                            />
                        )}
                        {activeTab === 'font' && (
                            <PlaceholderTab
                                title={messages.fontTab}
                                description={messages.fontPlaceholder}
                                icon={fontIcon}
                            />
                        )}
                        {activeTab === 'loading' && (
                            <PlaceholderTab
                                title={messages.loadingTab}
                                description={messages.loadingPlaceholder}
                                icon={loadingIcon}
                            />
                        )}
                        {activeTab === 'theme' && (
                            <MergedThemeTab
                                canChangeTheme={canChangeTheme}
                                onChangeTheme={onChangeTheme}
                                onChangeUiTheme={onChangeUiTheme}
                                onOpenCustomSettings={onOpenCustomSettings}
                                theme={theme}
                                uiTheme={uiTheme}
                            />
                        )}
                        {activeTab === 'advanced' && (
                            <SettingsModalBody {...advancedProps} />
                        )}
                    </div>
                </div>
            </Win11Window>
        );
    }
}

SettingsWindow.propTypes = {
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    currentLocale: PropTypes.string,
    defaultTab: PropTypes.oneOf(['settings', 'advanced']),
    menuBarPosition: PropTypes.string,
    tabLayout: PropTypes.string,
    contextMenuStyle: PropTypes.string,
    onClickDesktopSettings: PropTypes.func,
    onChangeLanguage: PropTypes.func,
    onChangeMenuBarPosition: PropTypes.func,
    onChangeTabLayout: PropTypes.func,
    onChangeContextMenuStyle: PropTypes.func,
    onChangeTheme: PropTypes.func,
    onChangeUiTheme: PropTypes.func,
    onOpenCustomSettings: PropTypes.func,
    onClose: PropTypes.func,
    theme: PropTypes.instanceOf(Theme),
    uiTheme: PropTypes.string,
    intl: intlShape,
    vm: PropTypes.shape({
        renderer: PropTypes.shape({
            setUseHighQualityRender: PropTypes.func
        }),
        setFramerate: PropTypes.func,
        setCompilerOptions: PropTypes.func,
        setInterpolation: PropTypes.func,
        setRuntimeOptions: PropTypes.func,
        setStageSize: PropTypes.func,
        storeProjectOptions: PropTypes.func
    }),
    isEmbedded: PropTypes.bool,
    framerate: PropTypes.number,
    highQualityPen: PropTypes.bool,
    interpolation: PropTypes.bool,
    infiniteClones: PropTypes.bool,
    removeFencing: PropTypes.bool,
    removeLimits: PropTypes.bool,
    warpTimer: PropTypes.bool,
    customStageSize: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    }),
    disableCompiler: PropTypes.bool
};

const mapStateToProps = state => ({
    currentLocale: state.locales.locale,
    theme: state.scratchGui.theme.theme,
    uiTheme: state.scratchGui.uiTheme,
    menuBarPosition: state.scratchGui.menuBarPosition,
    tabLayout: state.scratchGui.tabLayout,
    contextMenuStyle: state.scratchGui.contextMenuStyle,
    vm: state.scratchGui.vm,
    isEmbedded: state.scratchGui.mode.isEmbedded,
    framerate: state.scratchGui.tw.framerate,
    highQualityPen: state.scratchGui.tw.highQualityPen,
    interpolation: state.scratchGui.tw.interpolation,
    infiniteClones: state.scratchGui.tw.runtimeOptions.maxClones === Infinity,
    removeFencing: !state.scratchGui.tw.runtimeOptions.fencing,
    removeLimits: !state.scratchGui.tw.runtimeOptions.miscLimits,
    warpTimer: state.scratchGui.tw.compilerOptions.warpTimer,
    customStageSize: state.scratchGui.customStageSize,
    disableCompiler: !state.scratchGui.tw.compilerOptions.enabled
});

const mapDispatchToProps = dispatch => ({
    onChangeLanguage: locale => {
        dispatch(selectLocale(locale));
    },
    onChangeTheme: theme => {
        dispatch(setTheme(theme));
        persistTheme(theme);
    },
    onChangeUiTheme: themeId => {
        dispatch(setUiTheme(themeId));
        persistUiTheme(themeId);
        document.documentElement.setAttribute('data-ui-theme', themeId);
    },
    onChangeMenuBarPosition: position => {
        dispatch(setMenuBarPosition(position));
        persistMenuBarPosition(position);
    },
    onChangeTabLayout: layout => {
        dispatch(setTabLayout(layout));
        persistTabLayout(layout);
    },
    onChangeContextMenuStyle: style => {
        dispatch(setContextMenuStyle(style));
        persistContextMenuStyle(style);
        applyContextMenuStyle(style);
    }
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(SettingsWindow));
