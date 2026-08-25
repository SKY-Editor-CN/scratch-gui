import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {connect} from 'react-redux';
import {defineMessages, injectIntl, intlShape} from 'react-intl';
import log from '../lib/log';

import extensionLibraryContent, {
    galleryError,
    galleryLoading,
    galleryMore
} from '../lib/libraries/extensions/index.jsx';
import skyFallbackExtensions from '../lib/libraries/extensions/sky-aggregated.js';
import extensionTags from '../lib/libraries/tw-extension-tags';

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    }
});

const toLibraryItem = extension => {
    if (typeof extension === 'object') {
        return ({
            rawURL: extension.iconURL || extensionIcon,
            ...extension
        });
    }
    return extension;
};

const translateGalleryItem = (extension, locale) => ({
    ...extension,
    name: extension.nameTranslations[locale] || extension.name,
    description: extension.descriptionTranslations[locale] || extension.description
});

// SKY Editor 扩展库聚合数据源（对齐 02Engine 已验证实现，字段与 TW extensions-v0.json 一致）
// 各源均可独立失败：单源异常不影响其余来源，全部失败时走 sky-aggregated.js 离线兜底。
const SOURCE_02ENGINE = {
    url: 'https://extensions.02engine.02studio.xyz/extensions.json',
    map: data => data.extensions.map(extension => ({
        name: extension.name,
        nameTranslations: extension.nameTranslations || {},
        description: extension.description,
        descriptionTranslations: extension.descriptionTranslations || {},
        extensionId: extension.id,
        extensionURL: `https://extensions.02engine.02studio.xyz/extension/${extension.slug}.js`,
        iconURL: `https://extensions.02engine.02studio.xyz/image/${extension.image || 'images/unknown.svg'}`,
        tags: ['ztengine'],
        credits: [
            ...(extension.original || []),
            ...(extension.by || [])
        ].map(credit => {
            if (credit.link) {
                return (
                    <a
                        href={credit.link}
                        target="_blank"
                        rel="noreferrer"
                        key={credit.name}
                    >
                        {credit.name}
                    </a>
                );
            }
            return credit.name;
        }),
        docsURI: null,
        samples: extension.samples ? extension.samples.map(sample => ({
            href: `${process.env.ROOT}editor?project_url=https://extensions.02engine.02studio.xyz/samples/${encodeURIComponent(sample)}.sb3`,
            text: sample
        })) : null,
        incompatibleWithScratch: !extension.scratchCompatible,
        featured: true
    }))
};

const SOURCE_TW = {
    url: 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json',
    map: data => data.extensions.map(extension => ({
        name: extension.name,
        nameTranslations: extension.nameTranslations || {},
        description: extension.description,
        descriptionTranslations: extension.descriptionTranslations || {},
        extensionId: extension.id,
        extensionURL: `https://extensions.turbowarp.org/${extension.slug}.js`,
        iconURL: `https://extensions.turbowarp.org/${extension.image || 'images/unknown.svg'}`,
        tags: ['tw'],
        credits: [
            ...(extension.original || []),
            ...(extension.by || [])
        ].map(credit => {
            if (credit.link) {
                return (
                    <a
                        href={credit.link}
                        target="_blank"
                        rel="noreferrer"
                        key={credit.name}
                    >
                        {credit.name}
                    </a>
                );
            }
            return credit.name;
        }),
        docsURI: extension.docs ? `https://extensions.turbowarp.org/${extension.slug}` : null,
        samples: extension.samples ? extension.samples.map(sample => ({
            href: `${process.env.ROOT}editor?project_url=https://extensions.turbowarp.org/samples/${encodeURIComponent(sample)}.sb3`,
            text: sample
        })) : null,
        incompatibleWithScratch: !extension.scratchCompatible,
        featured: true
    }))
};

const SOURCE_ASTRA = {
    url: 'https://editors.astras.top/extensions/generated-metadata/extensions-v0.json',
    map: data => data.extensions.map(extension => ({
        name: extension.name,
        nameTranslations: extension.nameTranslations || {},
        description: extension.description,
        descriptionTranslations: extension.descriptionTranslations || {},
        extensionId: extension.id,
        extensionURL: `https://editors.astras.top/extensions/${extension.slug}.js`,
        iconURL: extension.image ?
            `https://editors.astras.top/extensions/${extension.image}` :
            'https://extensions.turbowarp.org/images/unknown.svg',
        tags: ['astra'],
        credits: [
            ...(extension.original || []),
            ...(extension.by || [])
        ].filter(credit => credit && typeof credit === 'object').map(credit => {
            if (credit.link) {
                return (
                    <a
                        href={credit.link}
                        target="_blank"
                        rel="noreferrer"
                        key={credit.name}
                    >
                        {credit.name}
                    </a>
                );
            }
            return credit.name;
        }),
        docsURI: extension.docs ? `https://editors.astras.top/extensions/${extension.slug}` : null,
        samples: extension.samples ? extension.samples.map(sample => ({
            href: `${process.env.ROOT}editor?project_url=https://editors.astras.top/extensions/samples/${encodeURIComponent(sample)}.sb3`,
            text: sample
        })) : null,
        incompatibleWithScratch: !extension.scratchCompatible,
        featured: true
    }))
};

const SOURCE_MIST = {
    url: 'https://mistiumextensions.02studio.xyz/generated-metadata/extensions-v0.json',
    map: data => data.extensions.map(extension => ({
        name: extension.name,
        nameTranslations: extension.nameTranslations || {},
        description: extension.description,
        descriptionTranslations: extension.descriptionTranslations || {},
        extensionId: extension.id,
        extensionURL: `https://mistiumextensions.02studio.xyz/featured/${extension.name}.js`,
        iconURL: `https://mistiumextensions.02studio.xyz/${extension.image || 'images/unknown.svg'}`,
        tags: ['mist'],
        credits: [
            ...(extension.original || []),
            ...(extension.by || [])
        ].map(credit => {
            if (credit.link) {
                return (
                    <a
                        href={credit.link}
                        target="_blank"
                        rel="noreferrer"
                        key={credit.name}
                    >
                        {credit.name}
                    </a>
                );
            }
            return credit.name;
        }),
        docsURI: null,
        samples: extension.samples ? extension.samples.map(sample => ({
            href: `${process.env.ROOT}editor?project_url=https://extensions.turbowarp.org/samples/${encodeURIComponent(sample)}.sb3`,
            text: sample
        })) : null,
        incompatibleWithScratch: !extension.scratchCompatible,
        featured: true
    }))
};

const SOURCE_SHARKPOOL = {
    url: 'https://sharkpoolextensions.02studio.xyz/Gallery%20Files/Extension-Keys.json',
    map: data => Object.entries(data.extensions).map(([slug, extension]) => ({
        name: slug,
        nameTranslations: {},
        description: extension.desc,
        descriptionTranslations: {},
        extensionId: slug,
        extensionURL: `https://sharkpoolextensions.02studio.xyz/extension-code/${extension.url}`,
        iconURL: `https://sharkpoolextensions.02studio.xyz/extension-thumbs/${extension.banner || 'images/unknown.svg'}`,
        tags: [...(extension.tags || []), 'sp'],
        credits: (extension.creator || '')
            .split(',')
            .map(creator => creator.trim())
            .filter(Boolean),
        docsURI: null,
        samples: null,
        incompatibleWithScratch: false,
        featured: true
    }))
};

// Bilup 官方扩展画廊（extensions.bilup.org）：官方清单为带 // 注释的 slug 数组，扩展 JS 由画廊域名直出。
// 元数据（名称/描述/作者/图标格式）来自官方画廊页面与官方 images 目录，slug 列表运行时实时拉取。
const BILUP_META = {
    shangcloud: {
        name: 'ShangCloud',
        description: 'ShangCloud SDK for Scratch.',
        credits: ['Yearnstudio'],
        icon: 'png'
    },
    colortools: {
        name: 'Color Toolset',
        description: 'Tons of color-related tools, meow. Mix colors, invert them, find ' +
            'complementary colors, convert formats, and more.',
        credits: ['MR醉诗'],
        icon: 'svg'
    },
    easyblock: {
        name: 'Easy Block+',
        description: 'Make creation simpler and more convenient.',
        credits: ['DL_Grass'],
        icon: 'svg'
    },
    stringtools: {
        name: 'String Tools',
        description: 'Make handling strings more convenient.',
        credits: ['DL_Grass'],
        icon: 'svg'
    },
    approaches: {
        name: 'Approaches!',
        description: 'Nonlinear approach functions.',
        credits: ['蓝立方Blue3'],
        icon: 'svg'
    },
    aiblocks: {
        name: 'AI in Blocks',
        description: 'Create AI instances and interact with them using streaming responses.',
        credits: ['RyaninCn11'],
        icon: 'svg'
    },
    ai: {
        name: 'AI',
        description: 'Chat with AI in Scratch. Supports OpenAI and Anthropic APIs with streaming responses.',
        credits: ['RyaninCn11'],
        icon: 'svg'
    },
    lingdongpopup: {
        name: 'LingDong Popup',
        description: 'A better, more concise and efficient popup extension.',
        credits: ['Kimos Frontender'],
        icon: 'svg'
    },
    xiaoboluotoolbox: {
        name: "Xiaoboluo's ToolBox",
        description: 'A comprehensive toolbox with list, text, math, and utility blocks ' +
            'for Scratch projects.',
        credits: ['勇敢的菠萝'],
        icon: 'svg'
    },
    leishen: {
        name: 'Leishen Pro',
        description: 'Fullscreen post-processing effects: blur, glitch, bloom, presets ' +
            'and custom shaders.',
        credits: [],
        icon: 'svg'
    },
    kmsinputer: {
        name: 'Inputer',
        description: 'Input box extension produced by 0.2 Studio.',
        credits: ['Kimos Frontender'],
        icon: 'png'
    }
};

const SOURCE_BILUP = {
    url: 'https://raw.githubusercontent.com/Bilup/extensions/main/extensions/extensions.json',
    // 官方清单带 // 注释，非标准 JSON，需按原始文本读取后剥注释再解析
    raw: true,
    map: data => {
        const slugs = JSON.parse(data.replace(/\/\/[^\n]*/g, ''));
        return slugs.map(slug => {
            const meta = BILUP_META[slug] || {name: slug, description: '', credits: [], icon: 'svg'};
            return {
                name: meta.name,
                nameTranslations: {},
                description: meta.description,
                descriptionTranslations: {},
                extensionId: slug,
                extensionURL: `https://extensions.bilup.org/${slug}.js`,
                iconURL: `https://raw.githubusercontent.com/Bilup/extensions/main/images/${slug}.${meta.icon}`,
                tags: ['bilup'],
                credits: meta.credits,
                docsURI: null,
                samples: null,
                incompatibleWithScratch: false,
                featured: true
            };
        });
    }
};

// CY ScrExt Hub（cy-studio-001/CY-ScrExt-Hub）：社区维护的扩展收集清单，字段较自由，运行时归一化。
// 仅收录可直连加载的扩展（GitHub raw / gh-proxy），blob 链接自动转为 raw，下载站与空链接剔除。
const toRawUrl = url => {
    if (!url || url.startsWith('https://pan.baidu.re/')) {
        return null;
    }
    return url.replace(
        /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\//,
        'https://raw.githubusercontent.com/$1/$2/'
    );
};

const SOURCE_CYSCREXT = {
    url: 'https://raw.githubusercontent.com/cy-studio-001/CY-ScrExt-Hub/main/extensions.json',
    map: data => data
        .filter(extension => extension && extension.name && extension.downloadUrl)
        .map(extension => ({
            name: extension.name,
            nameTranslations: {},
            description: extension.description || '',
            descriptionTranslations: {},
            extensionId: extension.name,
            extensionURL: toRawUrl(extension.downloadUrl),
            iconURL: extension.coverUrl || 'https://extensions.turbowarp.org/images/unknown.svg',
            tags: ['cy'],
            credits: [extension.originalAuthor || extension.author || ''].filter(Boolean),
            docsURI: null,
            samples: null,
            incompatibleWithScratch: false,
            featured: true
        }))
        .filter(extension => Boolean(extension.extensionURL))
};

// PenguinMod 扩展清单来自官方扩展画廊仓库，SKY Editor 本地同步到 static/penguinmod/extensions.js
const fetchPenguinModLibrary = async () => {
    // 静态打包时跳过解析：该文件为 SKY 本地同步的 PenguinMod 扩展清单（webpackIgnore 在构建期已生效）
    // eslint-disable-next-line import/no-unresolved
    const module = await import(/* webpackIgnore: true */ '/penguinmod/extensions.js');
    return module.default.map(extension => ({
        name: extension.name,
        nameTranslations: {},
        description: extension.description,
        descriptionTranslations: {},
        extensionId: extension.name,
        extensionURL: `https://extensions.penguinmod.com/extensions/${extension.code}`,
        iconURL: `https://extensions.penguinmod.com/images/${extension.banner || 'images/unknown.svg'}`,
        tags: ['pm'],
        credits: [extension.creator],
        docsURI: null,
        samples: null,
        incompatibleWithScratch: false,
        featured: true
    }));
};

let cachedGallery = null;

const fetchLibrary = async () => {
    const safeFetch = async (source, defaultData = []) => {
        try {
            const res = await fetch(source.url);
            if (!res.ok) {
                throw new Error(`HTTP status ${res.status}`);
            }
            const data = source.raw ? await res.text() : await res.json();
            return source.map(data);
        } catch (error) {
            log.error(error);
            return defaultData;
        }
    };

    const results = await Promise.allSettled([
        safeFetch(SOURCE_02ENGINE),
        safeFetch(SOURCE_TW),
        safeFetch(SOURCE_ASTRA),
        safeFetch(SOURCE_MIST),
        safeFetch(SOURCE_SHARKPOOL),
        safeFetch(SOURCE_BILUP),
        safeFetch(SOURCE_CYSCREXT),
        fetchPenguinModLibrary()
    ]);

    const merged = results
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);

    if (merged.length === 0) {
        throw new Error('All extension sources unavailable');
    }
    return merged;
};

// 聚合扩展的来源分组（顺序即展示顺序，标题与 tw-extension-tags 的 intlLabel 对应）。
// SKY Editor：各编辑器扩展库按来源分区展示，避免全部内容混在一起。
const SOURCE_GROUP_ORDER = ['tw', 'ztengine', 'astra', 'pm', 'mist', 'sp', 'bilup', 'cy'];
const SOURCE_GROUP_LABELS = {
    tw: 'TurboWarp',
    ztengine: '02Engine',
    astra: 'AstraEditor',
    pm: 'PenguinMod',
    mist: 'Mist',
    sp: 'SharkPool',
    bilup: 'Bilup',
    cy: 'CY ScrExt Hub'
};
const sourceGroupOf = item => {
    const sourceTag = (item.tags || []).find(tag => SOURCE_GROUP_LABELS[tag]);
    return SOURCE_GROUP_LABELS[sourceTag] ? sourceTag : 'tw';
};

class ExtensionLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect'
        ]);
        this.state = {
            gallery: cachedGallery,
            galleryError: null,
            galleryTimedOut: false,
            offline: false
        };
    }
    componentDidMount () {
        if (!this.state.gallery) {
            const timeout = setTimeout(() => {
                this.setState({
                    galleryTimedOut: true
                });
            }, 750);

            fetchLibrary()
                .then(gallery => {
                    cachedGallery = gallery;
                    this.setState({
                        gallery
                    });
                    clearTimeout(timeout);
                })
                .catch(error => {
                    log.error(error);
                    this.setState({
                        galleryError: error,
                        offline: true
                    });
                    clearTimeout(timeout);
                });
        }
    }
    handleItemSelect (item) {
        if (item.href) {
            return;
        }

        const extensionId = item.extensionId;

        if (extensionId === 'custom_extension') {
            this.props.onOpenCustomExtensionModal();
            return;
        }

        if (extensionId === 'procedures_enable_return') {
            this.props.onEnableProcedureReturns();
            this.props.onCategorySelected('myBlocks');
            return;
        }

        const url = item.extensionURL ? item.extensionURL : extensionId;
        if (!item.disabled) {
            if (this.props.vm.extensionManager.isExtensionLoaded(extensionId)) {
                this.props.onCategorySelected(extensionId);
            } else {
                this.props.vm.extensionManager.loadExtensionURL(url)
                    .then(() => {
                        this.props.onCategorySelected(extensionId);
                    })
                    .catch(err => {
                        log.error(err);
                        // eslint-disable-next-line no-alert
                        alert(err);
                    });
            }
        }
    }
    render () {
        let library = null;
        if (this.state.gallery || this.state.offline || this.state.galleryError || this.state.galleryTimedOut) {
            library = extensionLibraryContent.map(toLibraryItem);
            library.push('---');
            if (this.state.offline) {
                // 所有远程扩展源均不可用：改用 SKY 离线兜底清单（真实扩展快照，TW 画廊格式）
                library.push(toLibraryItem(galleryError));
                library.push('---');
                library.push(...skyFallbackExtensions.map(toLibraryItem));
            } else if (this.state.gallery) {
                library.push(toLibraryItem(galleryMore));
                const locale = this.props.intl.locale;
                const galleryItems = this.state.gallery
                    .filter(i => i.extensionId !== 'faceSensing')
                    .map(i => translateGalleryItem(i, locale))
                    .map(toLibraryItem);

                // SKY Editor：聚合扩展按来源分区（每组前插入分组标题，修复内容混在一起的问题）
                const groups = {};
                for (const item of galleryItems) {
                    const group = sourceGroupOf(item);
                    (groups[group] = groups[group] || []).push(item);
                }
                const grouped = [];
                for (const group of SOURCE_GROUP_ORDER) {
                    if (groups[group] && groups[group].length > 0) {
                        grouped.push({
                            type: 'sectionTitle',
                            title: SOURCE_GROUP_LABELS[group],
                            tags: [group],
                            key: `section-${group}`
                        });
                        grouped.push(...groups[group]);
                    }
                }
                library.push(...grouped);
            } else if (this.state.galleryError) {
                library.push(toLibraryItem(galleryError));
            } else {
                library.push(toLibraryItem(galleryLoading));
            }
        }

        return (
            <LibraryComponent
                data={library}
                filterable
                persistableKey="extensionId"
                id="extensionLibrary"
                tags={extensionTags}
                title={this.props.intl.formatMessage(messages.extensionTitle)}
                icon={extensionIcon}
                windowed={this.props.uiTheme === 'sky-editor'}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

ExtensionLibrary.propTypes = {
    intl: intlShape.isRequired,
    onCategorySelected: PropTypes.func,
    onEnableProcedureReturns: PropTypes.func,
    onOpenCustomExtensionModal: PropTypes.func,
    onRequestClose: PropTypes.func,
    uiTheme: PropTypes.string,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired // eslint-disable-line react/no-unused-prop-types
};

const mapStateToProps = state => ({
    uiTheme: state.scratchGui.uiTheme
});

export default connect(mapStateToProps)(injectIntl(ExtensionLibrary));
