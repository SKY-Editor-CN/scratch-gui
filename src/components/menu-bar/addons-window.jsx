import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import Win11Window from '../tw-win11-window/win11-window.jsx';
import addonsIcon from './addons.svg';
import AddonSettingsComponent from '../../addons/settings/settings.jsx';
import downloadBlob from '../../lib/download-blob.js';

const messages = defineMessages({
    title: {
        defaultMessage: 'Addons',
        description: 'Title of the addon settings window',
        id: 'tw.menuBar.addons'
    }
});

const onExportSettings = settings => {
    const blob = new Blob([JSON.stringify(settings)]);
    downloadBlob('turbowarp-addon-settings.json', blob);
};

const AddonsContent = () => (
    <div
        style={{
            height: '100%',
            overflow: 'hidden',
            position: 'relative'
        }}
    >
        <AddonSettingsComponent
            onExportSettings={onExportSettings}
            onReload={() => location.reload()}
        />
    </div>
);

const AddonsWindow = ({intl, onClose}) => (
    <Win11Window
        title={intl.formatMessage(messages.title)}
        onClose={onClose}
        icon={addonsIcon}
        defaultWidth={960}
        defaultHeight={640}
    >
        <AddonsContent />
    </Win11Window>
);

AddonsWindow.propTypes = {
    intl: intlShape.isRequired,
    onClose: PropTypes.func.isRequired
};

export default injectIntl(AddonsWindow);
