import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import Win11Window from '../tw-win11-window/win11-window.jsx';
import {RestorePointModalBody} from './restore-point-modal.jsx';

import styles from './restore-point-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Restore Points',
        description: 'Title of restore point management modal',
        id: 'tw.restorePoints.title'
    }
});

const RestorePointWindow = ({intl, onClose, ...bodyProps}) => (
    <Win11Window
        title={intl.formatMessage(messages.title)}
        onClose={onClose}
        defaultWidth={640}
        defaultHeight={480}
    >
        <div
            className={styles.body}
            style={{
                height: '100%',
                overflow: 'auto',
                boxSizing: 'border-box'
            }}
        >
            <RestorePointModalBody {...bodyProps} intl={intl} />
        </div>
    </Win11Window>
);

RestorePointWindow.propTypes = {
    intl: intlShape,
    interval: PropTypes.number.isRequired,
    onChangeInterval: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onClickDelete: PropTypes.func.isRequired,
    onClickDeleteAll: PropTypes.func.isRequired,
    onClickExport: PropTypes.func.isRequired,
    onClickLoad: PropTypes.func.isRequired,
    isExporting: PropTypes.func.isRequired,
    isLoading: PropTypes.bool.isRequired,
    totalSize: PropTypes.number.isRequired,
    restorePoints: PropTypes.arrayOf(PropTypes.shape({})),
    error: PropTypes.string
};

export default injectIntl(RestorePointWindow);
