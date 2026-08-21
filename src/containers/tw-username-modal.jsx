import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import {setUsername, setUsernameInvalid} from '../reducers/tw';
import UsernameModalComponent from '../components/tw-username-modal/username-modal.jsx';
import UsernameWindow from '../components/tw-username-modal/username-window.jsx';
import {closeUsernameModal} from '../reducers/modals';
import {generateRandomUsername} from '../lib/tw-username';
import isScratchDesktop from '../lib/isScratchDesktop';

class UsernameModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleKeyPress',
            'handleFocus',
            'handleOk',
            'handleCancel',
            'handleChange',
            'handleReset'
        ]);
        this.state = {
            value: this.props.username,
            valueValid: !this.props.usernameInvalid
        };
    }
    handleKeyPress (event) {
        if (event.key === 'Enter' && this.state.valueValid) {
            this.handleOk();
        }
    }
    handleFocus (event) {
        event.target.select();
    }
    handleOk () {
        this.props.onSetUsername(this.state.value);
        this.props.onCloseUsernameModal();
    }
    handleCancel () {
        this.props.onCloseUsernameModal();
    }
    handleChange (e) {
        this.setState({
            value: e.target.value,
            valueValid: e.target.checkValidity()
        });
    }
    handleReset () {
        const randomUsername = isScratchDesktop() ? 'player' : generateRandomUsername();
        this.props.onCloseUsernameModal();
        this.props.onSetUsername(randomUsername);
    }
    render () {
        const bodyProps = {
            mustChangeUsername: this.props.usernameInvalid,
            value: this.state.value,
            valueValid: this.state.valueValid,
            onKeyPress: this.handleKeyPress,
            onFocus: this.handleFocus,
            onOk: this.handleOk,
            onCancel: this.handleCancel,
            onChange: this.handleChange,
            onReset: this.handleReset
        };
        if (this.props.uiTheme === 'sky-editor') {
            return <UsernameWindow {...bodyProps} />;
        }
        return <UsernameModalComponent {...bodyProps} />;
    }
}

UsernameModal.propTypes = {
    onCloseUsernameModal: PropTypes.func,
    onSetUsername: PropTypes.func,
    username: PropTypes.string,
    usernameInvalid: PropTypes.bool,
    uiTheme: PropTypes.string
};

const mapStateToProps = state => ({
    username: state.scratchGui.tw.username,
    usernameInvalid: state.scratchGui.tw.usernameInvalid,
    uiTheme: state.scratchGui.uiTheme
});

const mapDispatchToProps = dispatch => ({
    onCloseUsernameModal: () => dispatch(closeUsernameModal()),
    onSetUsername: username => {
        dispatch(setUsername(username));
        dispatch(setUsernameInvalid(false));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(UsernameModal);
