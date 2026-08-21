import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import Modal from '../../containers/modal.jsx';
import Win11Window from '../tw-win11-window/win11-window.jsx';
import Box from '../box/box.jsx';
import styles from './confirm-dialog.css';

const ConfirmDialog = props => {
    const Shell = props.uiTheme === 'sky-editor' ? Win11Window : Modal;
    const shellProps = props.uiTheme === 'sky-editor' ? {
        title: props.title,
        onClose: props.onCancel,
        defaultWidth: 480,
        defaultHeight: 220,
        disableMaximize: true,
        disableResize: true
    } : {
        className: styles.modalContent,
        contentLabel: props.title,
        onRequestClose: props.onCancel,
        id: 'confirmDialog'
    };
    return (
        <Shell {...shellProps}>
            <Box className={styles.body}>
                <div className={styles.message}>{props.message}</div>
                <Box className={styles.buttonRow}>
                    <button
                        className={styles.cancelButton}
                        onClick={props.onCancel}
                    >
                        <FormattedMessage
                            defaultMessage="取消"
                            description="Cancel button of the confirm dialog"
                            id="gui.confirmDialog.cancel"
                        />
                    </button>
                    <button
                        className={styles.confirmButton}
                        onClick={props.onConfirm}
                    >
                        <FormattedMessage
                            defaultMessage="确认删除"
                            description="Confirm delete button of the confirm dialog"
                            id="gui.confirmDialog.confirm"
                        />
                    </button>
                </Box>
            </Box>
        </Shell>
    );
};

ConfirmDialog.propTypes = {
    message: PropTypes.string.isRequired,
    onCancel: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    uiTheme: PropTypes.string
};

export default ConfirmDialog;
