import twTranslations from './generated-translations.json';
import skyEditorTranslations from './sky-editor-translations.json';

const addAdditionalTranslations = editorMessages => {
    for (const locale of Object.keys(editorMessages)) {
        const toMixIn = twTranslations[locale.toLowerCase()];
        if (toMixIn) {
            Object.assign(editorMessages[locale], toMixIn);
        }

        // SKY Editor custom translations; fall back to English for locales
        // that are not explicitly covered in sky-editor-translations.json.
        const skyMixIn = skyEditorTranslations[locale.toLowerCase()] || skyEditorTranslations.en;
        if (skyMixIn) {
            Object.assign(editorMessages[locale], skyMixIn);
        }
    }

    // We reuse our `es` translations for `es-419` instead of maintaining separate translations.
    Object.assign(editorMessages['es-419'], twTranslations.es);
    Object.assign(editorMessages['es-419'], skyEditorTranslations.en);
};

export default addAdditionalTranslations;
