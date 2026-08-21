import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages} from 'react-intl';

import {ACCENT_MAP, ACCENT_RAINBOW} from './index.js';
import rainbowIcon from '../../components/menu-bar/tw-accent-rainbow.svg';
import styles from '../../components/menu-bar/settings-menu.css';

const accentOptions = defineMessages({
    'sky-editor': {
        defaultMessage: 'SKYEditor',
        description: 'Name of the SKYEditor color scheme.',
        id: 'tw.accent.skyEditor'
    },
    o2engine: {
        defaultMessage: '02Engine',
        description: 'Name of the 02Engine color scheme.',
        id: 'tw.accent.o2engine'
    },
    bilup: {
        defaultMessage: 'Bilup',
        description: 'Name of the Bilup color scheme.',
        id: 'tw.accent.bilup'
    },
    astraeditor: {
        defaultMessage: 'AstraEditor',
        description: 'Name of the AstraEditor color scheme.',
        id: 'tw.accent.astraEditor'
    },
    'frost-editor': {
        defaultMessage: 'FrostEditor',
        description: 'Name of the FrostEditor color scheme.',
        id: 'tw.accent.frostEditor'
    },
    'cyber-cat-pink': {
        defaultMessage: '赛博猫猫粉',
        description: 'Name of the CyberCatPink color scheme.',
        id: 'tw.accent.cyberCatPink'
    },
    'miku-green': {
        defaultMessage: '初音绿',
        description: 'Name of the MikuGreen color scheme.',
        id: 'tw.accent.mikuGreen'
    },
    'tianyi-blue': {
        defaultMessage: '天依蓝',
        description: 'Name of the TianyiBlue color scheme.',
        id: 'tw.accent.tianyiBlue'
    },
    red: {
        defaultMessage: 'Red',
        description: 'Name of the red color scheme, used by TurboWarp by default.',
        id: 'tw.accent.red'
    },
    purple: {
        defaultMessage: 'Purple',
        description: 'Name of the purple color scheme. Matches modern Scratch.',
        id: 'tw.accent.purple'
    },
    blue: {
        defaultMessage: 'Blue',
        description: 'Name of the blue color scheme. Matches Scratch before the high contrast update.',
        id: 'tw.accent.blue'
    },
    rainbow: {
        defaultMessage: 'Rainbow',
        description: 'Name of color scheme that uses a rainbow.',
        id: 'tw.accent.rainbow'
    }
});

const accentIcons = {
    [ACCENT_RAINBOW]: rainbowIcon
};

const ColorIcon = ({id}) => (
    accentIcons[id] ? (
        <img
            className={styles.accentIconOuter}
            src={accentIcons[id]}
            draggable={false}
            alt=""
        />
    ) : (
        <div
            className={styles.accentIconOuter}
            style={{
                backgroundColor: ACCENT_MAP[id].guiColors['looks-secondary'],
                backgroundImage: ACCENT_MAP[id].guiColors['menu-bar-background-image']
            }}
        />
    )
);

ColorIcon.propTypes = {
    id: PropTypes.string
};

export {
    accentOptions,
    accentIcons,
    ColorIcon
};
