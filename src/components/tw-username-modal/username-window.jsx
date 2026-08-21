import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import Win11Window from '../tw-win11-window/win11-window.jsx';
import {UsernameModalBody} from './username-modal.jsx';

import styles from './username-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Change Username',
        description: 'Title change username modal',
        id: 'tw.usernameModal.title'
    }
});

const UsernameWindow = ({intl, onCancel, ...bodyProps}) => (
    <Win11Window
        title={intl.formatMessage(messages.title)}
        onClose={onCancel}
        defaultWidth={440}
        defaultHeight={400}
    >
        <div
            className={styles.body}
            style={{
                height: '100%',
                overflow: 'auto',
                boxSizing: 'border-box'
            }}
        >
            <UsernameModalBody {...bodyProps} />
        </div>
    </Win11Window>
);

UsernameWindow.propTypes = {
    intl: intlShape.isRequired,
    mustChangeUsername: PropTypes.bool.isRequired,
    value: PropTypes.string.isRequired,
    valueValid: PropTypes.bool.isRequired,
    onCancel: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onFocus: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func.isRequired,
    onOk: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired
};

export default injectIntl(UsernameWindow);
