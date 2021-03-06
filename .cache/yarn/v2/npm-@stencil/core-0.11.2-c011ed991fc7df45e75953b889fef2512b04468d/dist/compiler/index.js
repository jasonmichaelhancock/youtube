'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var ts = require('typescript');
var MagicString = _interopDefault(require('magic-string'));
var rollupPluginutils = require('rollup-pluginutils');
var rollup = require('rollup');

function cleanDiagnostics(diagnostics) {
    const cleaned = [];
    const maxErrors = Math.min(diagnostics.length, MAX_ERRORS);
    const dups = {};
    for (var i = 0; i < maxErrors; i++) {
        const d = diagnostics[i];
        const key = d.absFilePath + d.code + d.messageText + d.type;
        if (dups[key]) {
            continue;
        }
        dups[key] = true;
        if (d.messageText) {
            if (typeof d.messageText.message === 'string') {
                d.messageText = d.messageText.message;
            }
            else if (typeof d.messageText === 'string' && d.messageText.indexOf('Error: ') === 0) {
                d.messageText = d.messageText.substr(7);
            }
        }
        cleaned.push(d);
    }
    return cleaned;
}
function splitLineBreaks(sourceText) {
    if (!sourceText)
        return [];
    sourceText = sourceText.replace(/\\r/g, '\n');
    return sourceText.split('\n');
}
const MAX_ERRORS = 15;

/**
 * SSR Attribute Names
 */
const SSR_VNODE_ID = 'ssrv';
const SSR_CHILD_ID = 'ssrc';
/**
 * Default style mode id
 */
const DEFAULT_STYLE_MODE = '$';
/**
 * Reusable empty obj/array
 * Don't add values to these!!
 */
const EMPTY_OBJ = {};
/**
 * Key Name to Key Code Map
 */
const KEY_CODE_MAP = {
    'enter': 13,
    'escape': 27,
    'space': 32,
    'tab': 9,
    'left': 37,
    'up': 38,
    'right': 39,
    'down': 40
};
/**
 * File names and value
 */
const BANNER = `Built with http://stenciljs.com`;
const COLLECTION_MANIFEST_FILE_NAME = 'collection-manifest.json';
const APP_NAMESPACE_REGEX = /["']__APP__['"]/g;

function hasServiceWorkerChanges(config, buildCtx) {
    if (config.devMode && !config.flags.serviceWorker) {
        return false;
    }
    const wwwServiceOutputs = config.outputTargets.filter(o => o.type === 'www' && o.serviceWorker);
    return wwwServiceOutputs.some(outputTarget => {
        return buildCtx.filesChanged.some(fileChanged => config.sys.path.basename(fileChanged).toLowerCase() === config.sys.path.basename(outputTarget.serviceWorker.swSrc).toLowerCase());
    });
}
/**
 * Test if a file is a typescript source file, such as .ts or .tsx.
 * However, d.ts files and spec.ts files return false.
 * @param filePath
 */
function isTsFile(filePath) {
    const parts = filePath.toLowerCase().split('.');
    if (parts.length > 1) {
        if (parts[parts.length - 1] === 'ts' || parts[parts.length - 1] === 'tsx') {
            if (parts.length > 2 && (parts[parts.length - 2] === 'd' || parts[parts.length - 2] === 'spec')) {
                return false;
            }
            return true;
        }
    }
    return false;
}
function isDtsFile(filePath) {
    const parts = filePath.toLowerCase().split('.');
    if (parts.length > 2) {
        return (parts[parts.length - 2] === 'd' && parts[parts.length - 1] === 'ts');
    }
    return false;
}
function hasFileExtension(filePath, extensions) {
    filePath = filePath.toLowerCase();
    return extensions.some(ext => filePath.endsWith('.' + ext));
}
function generatePreamble(config, opts = {}) {
    let preamble = [];
    if (config.preamble) {
        preamble = config.preamble.split('\n');
    }
    if (typeof opts.prefix === 'string') {
        opts.prefix.split('\n').forEach(c => {
            preamble.push(c);
        });
    }
    preamble.push(BANNER);
    if (typeof opts.suffix === 'string') {
        opts.suffix.split('\n').forEach(c => {
            preamble.push(c);
        });
    }
    if (preamble.length > 1) {
        preamble = preamble.map(l => ` * ${l}`);
        preamble.unshift(`/*!`);
        preamble.push(` */`);
        return preamble.join('\n');
    }
    return `/*! ${BANNER} */`;
}
function buildError(diagnostics) {
    const diagnostic = {
        level: 'error',
        type: 'build',
        header: 'Build Error',
        messageText: 'build error',
        relFilePath: null,
        absFilePath: null,
        lines: []
    };
    diagnostics.push(diagnostic);
    return diagnostic;
}
function buildWarn(diagnostics) {
    const diagnostic = {
        level: 'warn',
        type: 'build',
        header: 'build warn',
        messageText: 'build warn',
        relFilePath: null,
        absFilePath: null,
        lines: []
    };
    diagnostics.push(diagnostic);
    return diagnostic;
}
function catchError(diagnostics, err, msg) {
    const diagnostic = {
        level: 'error',
        type: 'build',
        header: 'Build Error',
        messageText: 'build error',
        relFilePath: null,
        absFilePath: null,
        lines: []
    };
    if (typeof msg === 'string') {
        diagnostic.messageText = msg;
    }
    else if (err) {
        if (err.stack) {
            diagnostic.messageText = err.stack.toString();
        }
        else {
            if (err.message) {
                diagnostic.messageText = err.message.toString();
            }
            else {
                diagnostic.messageText = err.toString();
            }
        }
    }
    if (diagnostics && !shouldIgnoreError(diagnostic.messageText)) {
        diagnostics.push(diagnostic);
    }
}
const TASK_CANCELED_MSG = `task canceled`;
function shouldIgnoreError(msg) {
    return (msg === TASK_CANCELED_MSG);
}
function hasError(diagnostics) {
    if (!diagnostics) {
        return false;
    }
    return diagnostics.some(d => d.level === 'error' && d.type !== 'runtime');
}
function pathJoin(config, ...paths) {
    return normalizePath(config.sys.path.join.apply(config.sys.path, paths));
}
function normalizePath(str) {
    // Convert Windows backslash paths to slash paths: foo\\bar ➔ foo/bar
    // https://github.com/sindresorhus/slash MIT
    // By Sindre Sorhus
    if (typeof str !== 'string') {
        throw new Error(`invalid path to normalize`);
    }
    str = str.trim();
    if (EXTENDED_PATH_REGEX.test(str) || NON_ASCII_REGEX.test(str)) {
        return str;
    }
    str = str.replace(SLASH_REGEX, '/');
    // always remove the trailing /
    // this makes our file cache look ups consistent
    if (str.charAt(str.length - 1) === '/') {
        const colonIndex = str.indexOf(':');
        if (colonIndex > -1) {
            if (colonIndex < str.length - 2) {
                str = str.substring(0, str.length - 1);
            }
        }
        else if (str.length > 1) {
            str = str.substring(0, str.length - 1);
        }
    }
    return str;
}
const EXTENDED_PATH_REGEX = /^\\\\\?\\/;
const NON_ASCII_REGEX = /[^\x00-\x80]+/;
const SLASH_REGEX = /\\/g;

function genereateHmr(config, compilerCtx, buildCtx) {
    if (!config.devServer || !config.devServer.hotReplacement || !buildCtx.isRebuild) {
        return null;
    }
    const hmr = {};
    if (buildCtx.scriptsAdded.length > 0) {
        hmr.scriptsAdded = buildCtx.scriptsAdded.slice();
    }
    if (buildCtx.scriptsDeleted.length > 0) {
        hmr.scriptsDeleted = buildCtx.scriptsDeleted.slice();
    }
    const excludeHmr = excludeHmrFiles(config, config.devServer.excludeHmr, buildCtx.filesChanged);
    if (excludeHmr.length > 0) {
        hmr.excludeHmr = excludeHmr.slice();
    }
    if (buildCtx.hasIndexHtmlChanges) {
        hmr.indexHtmlUpdated = true;
    }
    if (buildCtx.hasServiceWorkerChanges) {
        hmr.serviceWorkerUpdated = true;
    }
    const componentsUpdated = getComponentsUpdated(compilerCtx, buildCtx);
    if (componentsUpdated) {
        hmr.componentsUpdated = componentsUpdated;
    }
    if (Object.keys(buildCtx.stylesUpdated).length > 0) {
        hmr.inlineStylesUpdated = buildCtx.stylesUpdated.map(s => {
            return {
                styleTag: s.styleTag,
                styleMode: s.styleMode,
                styleText: s.styleText,
                isScoped: s.isScoped
            };
        }).sort((a, b) => {
            if (a.styleTag < b.styleTag)
                return -1;
            if (a.styleTag > b.styleTag)
                return 1;
            return 0;
        });
    }
    const externalStylesUpdated = getExternalStylesUpdated(config, buildCtx);
    if (externalStylesUpdated) {
        hmr.externalStylesUpdated = externalStylesUpdated;
    }
    const externalImagesUpdated = getImagesUpdated(config, buildCtx);
    if (externalImagesUpdated) {
        hmr.imagesUpdated = externalImagesUpdated;
    }
    if (Object.keys(hmr).length === 0) {
        return null;
    }
    hmr.versionId = Date.now().toString().substring(6);
    return hmr;
}
function getComponentsUpdated(compilerCtx, buildCtx) {
    // find all of the components that would be affected from the file changes
    if (!buildCtx.filesChanged) {
        return null;
    }
    const filesToLookForImporters = buildCtx.filesChanged.filter(f => {
        return f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx');
    });
    if (filesToLookForImporters.length === 0) {
        return null;
    }
    const changedScriptFiles = [];
    const checkedFiles = [];
    const allModuleFiles = Object.keys(compilerCtx.moduleFiles)
        .map(tsFilePath => compilerCtx.moduleFiles[tsFilePath])
        .filter(moduleFile => moduleFile.localImports && moduleFile.localImports.length > 0);
    while (filesToLookForImporters.length > 0) {
        const scriptFile = filesToLookForImporters.shift();
        addTsFileImporters(allModuleFiles, filesToLookForImporters, checkedFiles, changedScriptFiles, scriptFile);
    }
    const tags = changedScriptFiles.reduce((tags, changedTsFile) => {
        const moduleFile = compilerCtx.moduleFiles[changedTsFile];
        if (moduleFile && moduleFile.cmpMeta && moduleFile.cmpMeta.tagNameMeta) {
            if (!tags.includes(moduleFile.cmpMeta.tagNameMeta)) {
                tags.push(moduleFile.cmpMeta.tagNameMeta);
            }
        }
        return tags;
    }, []);
    if (tags.length === 0) {
        return null;
    }
    return tags.sort();
}
function addTsFileImporters(allModuleFiles, filesToLookForImporters, checkedFiles, changedScriptFiles, scriptFile) {
    if (!changedScriptFiles.includes(scriptFile)) {
        // add it to our list of files to transpile
        changedScriptFiles.push(scriptFile);
    }
    if (checkedFiles.includes(scriptFile)) {
        // already checked this file
        return;
    }
    checkedFiles.push(scriptFile);
    // get all the ts files that import this ts file
    const tsFilesThatImportsThisTsFile = allModuleFiles.reduce((arr, moduleFile) => {
        moduleFile.localImports.forEach(localImport => {
            let checkFile = localImport;
            if (checkFile === scriptFile) {
                arr.push(moduleFile.sourceFilePath);
                return;
            }
            checkFile = localImport + '.tsx';
            if (checkFile === scriptFile) {
                arr.push(moduleFile.sourceFilePath);
                return;
            }
            checkFile = localImport + '.ts';
            if (checkFile === scriptFile) {
                arr.push(moduleFile.sourceFilePath);
                return;
            }
            checkFile = localImport + '.js';
            if (checkFile === scriptFile) {
                arr.push(moduleFile.sourceFilePath);
                return;
            }
        });
        return arr;
    }, []);
    // add all the files that import this ts file to the list of ts files we need to look through
    tsFilesThatImportsThisTsFile.forEach(tsFileThatImportsThisTsFile => {
        // if we add to this array, then the while look will keep working until it's empty
        filesToLookForImporters.push(tsFileThatImportsThisTsFile);
    });
}
function getExternalStylesUpdated(config, buildCtx) {
    if (!buildCtx.isRebuild) {
        return null;
    }
    const outputTargets = config.outputTargets.filter(o => o.type === 'www');
    if (outputTargets.length === 0) {
        return null;
    }
    const cssFiles = buildCtx.filesWritten.filter(f => f.endsWith('.css'));
    if (cssFiles.length === 0) {
        return null;
    }
    return cssFiles.map(cssFile => {
        return config.sys.path.basename(cssFile);
    }).sort();
}
function getImagesUpdated(config, buildCtx) {
    const outputTargets = config.outputTargets.filter(o => o.type === 'www');
    if (outputTargets.length === 0) {
        return null;
    }
    const imageFiles = buildCtx.filesChanged.reduce((arr, filePath) => {
        if (IMAGE_EXT.some(ext => filePath.toLowerCase().endsWith(ext))) {
            const fileName = config.sys.path.basename(filePath);
            if (!arr.includes(fileName)) {
                arr.push(fileName);
            }
        }
        return arr;
    }, []);
    if (imageFiles.length === 0) {
        return null;
    }
    return imageFiles.sort();
}
function excludeHmrFiles(config, excludeHmr, filesChanged) {
    const excludeFiles = [];
    if (!excludeHmr || excludeHmr.length === 0) {
        return excludeFiles;
    }
    excludeHmr.forEach(excludeHmr => {
        return filesChanged.map(fileChanged => {
            let shouldExclude = false;
            if (config.sys.isGlob(excludeHmr)) {
                shouldExclude = config.sys.minimatch(fileChanged, excludeHmr);
            }
            else {
                shouldExclude = (normalizePath(excludeHmr) === normalizePath(fileChanged));
            }
            if (shouldExclude) {
                config.logger.debug(`excludeHmr: ${fileChanged}`);
                excludeFiles.push(config.sys.path.basename(fileChanged));
            }
            return shouldExclude;
        }).some(r => r);
    });
    return excludeFiles.sort();
}
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg'];

function generateBuildResults(config, compilerCtx, buildCtx) {
    const timeSpan = buildCtx.createTimeSpan(`generateBuildResults started`, true);
    const buildResults = {
        buildId: buildCtx.buildId,
        bundleBuildCount: buildCtx.bundleBuildCount,
        diagnostics: cleanDiagnostics(buildCtx.diagnostics),
        dirsAdded: buildCtx.dirsAdded.slice().sort(),
        dirsDeleted: buildCtx.dirsDeleted.slice().sort(),
        duration: Date.now() - buildCtx.startTime,
        filesAdded: buildCtx.filesAdded.slice().sort(),
        filesChanged: buildCtx.filesChanged.slice().sort(),
        filesDeleted: buildCtx.filesDeleted.slice().sort(),
        filesUpdated: buildCtx.filesUpdated.slice().sort(),
        filesWritten: buildCtx.filesWritten.sort(),
        hasError: hasError(buildCtx.diagnostics),
        hasSlot: buildCtx.hasSlot,
        hasSuccessfulBuild: compilerCtx.hasSuccessfulBuild,
        hasSvg: buildCtx.hasSvg,
        isRebuild: buildCtx.isRebuild,
        styleBuildCount: buildCtx.styleBuildCount,
        transpileBuildCount: buildCtx.transpileBuildCount,
        components: [],
        entries: generateBuildResultsEntries(config, buildCtx)
    };
    const hmr = genereateHmr(config, compilerCtx, buildCtx);
    if (hmr) {
        buildResults.hmr = hmr;
    }
    buildResults.entries.forEach(en => {
        buildResults.components.push(...en.components);
    });
    timeSpan.finish(`generateBuildResults finished`);
    return buildResults;
}
function generateBuildResultsEntries(config, buildCtx) {
    const entries = buildCtx.entryModules.map(en => {
        return getEntryModule(config, buildCtx, en);
    });
    return entries;
}
function getEntryModule(config, buildCtx, en) {
    en.modeNames = en.modeNames || [];
    en.entryBundles = en.entryBundles || [];
    en.moduleFiles = en.moduleFiles || [];
    const entryCmps = [];
    buildCtx.entryPoints.forEach(ep => {
        entryCmps.push(...ep);
    });
    const buildEntry = getBuildEntry(config, entryCmps, en);
    const modes = en.modeNames.slice();
    if (modes.length > 1 || (modes.length === 1 && modes[0] !== DEFAULT_STYLE_MODE)) {
        buildEntry.modes = modes.sort();
    }
    en.moduleFiles.forEach(m => {
        const encap = m.cmpMeta.encapsulationMeta === 2 /* ScopedCss */ ? 'scoped' : m.cmpMeta.encapsulationMeta === 1 /* ShadowDom */ ? 'shadow' : 'none';
        if (!buildEntry.encapsulations.includes(encap)) {
            buildEntry.encapsulations.push(encap);
        }
    });
    buildEntry.encapsulations.sort();
    return buildEntry;
}
function getBuildEntry(config, entryCmps, en) {
    const buildEntry = {
        entryId: en.entryKey,
        components: en.moduleFiles.map(m => {
            const entryCmp = entryCmps.find(ec => {
                return ec.tag === m.cmpMeta.tagNameMeta;
            });
            const dependencyOf = ((entryCmp && entryCmp.dependencyOf) || []).slice().sort();
            const buildCmp = {
                tag: m.cmpMeta.tagNameMeta,
                dependencies: m.cmpMeta.dependencies.slice(),
                dependencyOf: dependencyOf
            };
            return buildCmp;
        }),
        bundles: en.entryBundles.map(entryBundle => {
            return getBuildBundle(config, entryBundle);
        }),
        inputs: en.moduleFiles.map(m => {
            return normalizePath(config.sys.path.relative(config.rootDir, m.jsFilePath));
        }).sort(),
        encapsulations: []
    };
    return buildEntry;
}
function getBuildBundle(config, entryBundle) {
    const buildBundle = {
        fileName: entryBundle.fileName,
        outputs: entryBundle.outputs.map(filePath => {
            return normalizePath(config.sys.path.relative(config.rootDir, filePath));
        }).sort()
    };
    buildBundle.size = entryBundle.text.length;
    if (typeof entryBundle.sourceTarget === 'string') {
        buildBundle.target = entryBundle.sourceTarget;
    }
    if (entryBundle.modeName !== DEFAULT_STYLE_MODE) {
        buildBundle.mode = entryBundle.modeName;
    }
    if (entryBundle.isScopedStyles) {
        buildBundle.scopedStyles = entryBundle.isScopedStyles;
    }
    return buildBundle;
}

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateBuildStats(config, compilerCtx, buildCtx, buildResults) {
    return __awaiter(this, void 0, void 0, function* () {
        const statsTargets = config.outputTargets.filter(o => o.type === 'stats');
        yield Promise.all(statsTargets.map((outputTarget) => __awaiter(this, void 0, void 0, function* () {
            yield generateStatsOutputTarget(config, compilerCtx, buildCtx, buildResults, outputTarget);
        })));
    });
}
function generateStatsOutputTarget(config, compilerCtx, buildCtx, buildResults, outputTarget) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let jsonData;
            if (buildResults.hasError) {
                jsonData = {
                    diagnostics: buildResults.diagnostics
                };
            }
            else {
                const stats = {
                    compiler: {
                        name: config.sys.compiler.name,
                        version: config.sys.compiler.version
                    },
                    app: {
                        namespace: config.namespace,
                        fsNamespace: config.fsNamespace,
                        components: buildResults.components.length,
                        entries: buildResults.entries.length,
                        bundles: buildResults.entries.reduce((total, en) => {
                            total += en.bundles.length;
                            return total;
                        }, 0)
                    },
                    options: {
                        minifyJs: config.minifyJs,
                        minifyCss: config.minifyCss,
                        hashFileNames: config.hashFileNames,
                        hashedFileNameLength: config.hashedFileNameLength,
                        buildEs5: config.buildEs5
                    },
                    components: buildResults.components,
                    entries: buildResults.entries,
                    sourceGraph: {},
                    collections: buildCtx.collections.map(c => {
                        return {
                            name: c.collectionName,
                            source: normalizePath(config.sys.path.relative(config.rootDir, c.moduleDir)),
                            tags: c.moduleFiles.map(m => m.cmpMeta.tagNameMeta).sort()
                        };
                    }).sort((a, b) => {
                        if (a.name < b.name)
                            return -1;
                        if (a.name > b.name)
                            return 1;
                        return 0;
                    })
                };
                const moduleFiles = compilerCtx.rootTsFiles.map(rootTsFile => {
                    return compilerCtx.moduleFiles[rootTsFile];
                });
                moduleFiles
                    .sort((a, b) => {
                    if (a.sourceFilePath < b.sourceFilePath)
                        return -1;
                    if (a.sourceFilePath > b.sourceFilePath)
                        return 1;
                    return 0;
                }).forEach(moduleFile => {
                    const key = normalizePath(config.sys.path.relative(config.rootDir, moduleFile.sourceFilePath));
                    stats.sourceGraph[key] = moduleFile.localImports.map(localImport => {
                        return normalizePath(config.sys.path.relative(config.rootDir, localImport));
                    }).sort();
                });
                jsonData = stats;
            }
            yield compilerCtx.fs.writeFile(outputTarget.file, JSON.stringify(jsonData, null, 2));
            yield compilerCtx.fs.commit();
        }
        catch (e) { }
    });
}

var __awaiter$1 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function copyComponentStyles(config, compilerCtx, buildCtx) {
    return __awaiter$1(this, void 0, void 0, function* () {
        const outputTargets = config.outputTargets.filter(o => o.collectionDir);
        if (outputTargets.length === 0) {
            return;
        }
        const timeSpan = buildCtx.createTimeSpan(`copyComponentStyles started`, true);
        try {
            const absSrcStylePaths = [];
            buildCtx.entryModules.forEach(entryModule => {
                const cmps = entryModule.moduleFiles.filter(m => m.cmpMeta.stylesMeta);
                cmps.forEach(c => {
                    if (c.isCollectionDependency) {
                        return;
                    }
                    Object.keys(c.cmpMeta.stylesMeta).forEach(modeName => {
                        const styleMeta = c.cmpMeta.stylesMeta[modeName];
                        if (styleMeta.externalStyles) {
                            styleMeta.externalStyles.forEach(externalStyle => {
                                absSrcStylePaths.push(externalStyle.absolutePath);
                            });
                        }
                    });
                });
            });
            yield Promise.all(absSrcStylePaths.map((absSrcStylePath) => __awaiter$1(this, void 0, void 0, function* () {
                yield Promise.all(outputTargets.map((outputTarget) => __awaiter$1(this, void 0, void 0, function* () {
                    const relPath = config.sys.path.relative(config.srcDir, absSrcStylePath);
                    const absDestStylePath = config.sys.path.join(outputTarget.collectionDir, relPath);
                    const content = yield compilerCtx.fs.readFile(absSrcStylePath);
                    yield compilerCtx.fs.writeFile(absDestStylePath, content);
                })));
            })));
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
        timeSpan.finish(`copyComponentStyles finished`);
    });
}

function getAppBuildDir(config, outputTarget) {
    return pathJoin(config, outputTarget.buildDir, config.fsNamespace);
}
function getRegistryFileName(config) {
    return `${config.fsNamespace}.registry.json`;
}
function getRegistryJson(config, outputTarget) {
    return pathJoin(config, getAppBuildDir(config, outputTarget), getRegistryFileName(config));
}
function getLoaderFileName(config) {
    return `${config.fsNamespace}.js`;
}
function getLoaderPath(config, outputTarget) {
    return pathJoin(config, outputTarget.buildDir, getLoaderFileName(config));
}
function getGlobalFileName(config) {
    return `${config.fsNamespace}.global.js`;
}
function getGlobalJsBuildPath(config, outputTarget) {
    return pathJoin(config, getAppBuildDir(config, outputTarget), getGlobalFileName(config));
}
function getCoreFilename(config, coreId, jsContent) {
    if (config.hashFileNames) {
        // prod mode renames the core file with its hashed content
        const contentHash = config.sys.generateContentHash(jsContent, config.hashedFileNameLength);
        return `${config.fsNamespace}.${contentHash}.js`;
    }
    // dev file name
    return `${config.fsNamespace}.${coreId}.js`;
}
function getDistCjsIndexPath(config, outputTarget) {
    return pathJoin(config, outputTarget.buildDir, 'index.js');
}
function getDistEsmBuildDir(config, outputTarget) {
    return pathJoin(config, outputTarget.buildDir, 'esm');
}
function getDistEsmIndexPath(config, outputTarget) {
    return pathJoin(config, getDistEsmBuildDir(config, outputTarget), 'index.js');
}
function getCoreEsmFileName(config) {
    return `${config.fsNamespace}.core.js`;
}
function getCoreEsmBuildPath(config, outputTarget, sourceTarget) {
    if (sourceTarget === 'es5') {
        return pathJoin(config, getDistEsmBuildDir(config, outputTarget), `es5`, getCoreEsmFileName(config));
    }
    return pathJoin(config, getDistEsmBuildDir(config, outputTarget), getCoreEsmFileName(config));
}
function getDefineCustomElementsPath(config, outputTarget, sourceTarget) {
    if (sourceTarget === 'es5') {
        return pathJoin(config, getDistEsmBuildDir(config, outputTarget), `es5`, `${config.fsNamespace}.define.js`);
    }
    return pathJoin(config, getDistEsmBuildDir(config, outputTarget), `${config.fsNamespace}.define.js`);
}
function getGlobalEsmFileName(config) {
    return `${config.fsNamespace}.global.js`;
}
function getGlobalEsmBuildPath(config, outputTarget, sourceTarget) {
    if (sourceTarget === 'es5') {
        return pathJoin(config, getDistEsmBuildDir(config, outputTarget), `es5`, getGlobalEsmFileName(config));
    }
    return pathJoin(config, getDistEsmBuildDir(config, outputTarget), getGlobalEsmFileName(config));
}
function getComponentsEsmFileName(config) {
    return `${config.fsNamespace}.components.js`;
}
function getComponentsEsmBuildPath(config, outputTarget, sourceTarget) {
    if (sourceTarget === 'es5') {
        return pathJoin(config, getDistEsmBuildDir(config, outputTarget), `es5`, getComponentsEsmFileName(config));
    }
    return pathJoin(config, getDistEsmBuildDir(config, outputTarget), getComponentsEsmFileName(config));
}
function getHyperScriptFnEsmFileName(config) {
    return `${config.fsNamespace}.core.js`;
}
function getPolyfillsEsmBuildPath(config, outputTarget) {
    return pathJoin(config, getDistEsmBuildDir(config, outputTarget), `es5`, `polyfills`);
}
function getGlobalStyleFilename(config) {
    return `${config.fsNamespace}.css`;
}
function getBrowserFilename(bundleId, isScopedStyles, sourceTarget) {
    return `${bundleId}${isScopedStyles ? '.sc' : ''}${sourceTarget === 'es5' ? '.es5' : ''}.js`;
}
function getEsmFilename(bundleId, isScopedStyles) {
    return `${bundleId}${isScopedStyles ? '.sc' : ''}.js`;
}

var __awaiter$2 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateCommonJsIndex(config, compilerCtx, outputTarget) {
    return __awaiter$2(this, void 0, void 0, function* () {
        const cjs = [
            `// ${config.namespace}: CommonJS Main`
        ];
        const distIndexCjsPath = getDistCjsIndexPath(config, outputTarget);
        yield compilerCtx.fs.writeFile(distIndexCjsPath, cjs.join('\n'));
    });
}

var __awaiter$3 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getAppBrowserCorePolyfills(config) {
    return __awaiter$3(this, void 0, void 0, function* () {
        // first load up all of the polyfill content
        const readFilePromises = POLYFILLS.map(polyfillFile => {
            const staticName = config.sys.path.join('polyfills', 'es5', polyfillFile);
            return config.sys.getClientCoreFile({ staticName: staticName });
        });
        // read all the polyfill content, in this particular order
        const results = yield Promise.all(readFilePromises);
        // concat the polyfills
        return results.join('\n').trim();
    });
}
function copyEsmCorePolyfills(config, compilerCtx, outputTarget) {
    return __awaiter$3(this, void 0, void 0, function* () {
        const polyfillsBuildDir = getPolyfillsEsmBuildPath(config, outputTarget);
        yield POLYFILLS.map((polyfillFile) => __awaiter$3(this, void 0, void 0, function* () {
            const staticName = config.sys.path.join('polyfills', 'esm', polyfillFile);
            const polyfillsContent = yield config.sys.getClientCoreFile({ staticName: staticName });
            const polyfillDst = pathJoin(config, polyfillsBuildDir, polyfillFile);
            yield compilerCtx.fs.writeFile(polyfillDst, polyfillsContent);
        }));
    });
}
// order of the polyfills matters!! test test test
// actual source of the polyfills are found in /src/client/polyfills/
const POLYFILLS = [
    'dom.js',
    'array.js',
    'object.js',
    'string.js',
    'promise.js',
    'fetch.js',
];

const isDef = (v) => v != null;
const toLowerCase = (str) => str.toLowerCase();
const toDashCase = (str) => toLowerCase(str.replace(/([A-Z0-9])/g, g => ' ' + g[0]).trim().replace(/ /g, '-'));
const dashToPascalCase = (str) => toLowerCase(str).split('-').map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join('');
const toTitleCase = (str) => str.charAt(0).toUpperCase() + str.substr(1);
const captializeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const noop = () => { };
const pluck = (obj, keys) => {
    return keys.reduce((final, key) => {
        if (obj[key]) {
            final[key] = obj[key];
        }
        return final;
    }, {});
};
const isObject = (val) => {
    return val != null && typeof val === 'object' && Array.isArray(val) === false;
};

var __awaiter$4 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function formatBrowserLoaderComponentRegistry(cmpRegistry) {
    // ensure we've got a standard order of the components
    return Object.keys(cmpRegistry).sort().map(tag => {
        const cmpMeta = cmpRegistry[tag];
        cmpMeta.tagNameMeta = tag.toLowerCase().trim();
        return formatBrowserLoaderComponent(cmpMeta);
    });
}
function formatBrowserLoaderComponent(cmpMeta) {
    const d = [
        /* 0 */ cmpMeta.tagNameMeta,
        /* 1 */ formatBrowserLoaderBundleIds(cmpMeta.bundleIds),
        /* 2 */ formatHasStyles(cmpMeta.stylesMeta),
        /* 3 */ formatMembers(cmpMeta.membersMeta),
        /* 4 */ formatEncapsulation(cmpMeta.encapsulationMeta),
        /* 5 */ formatListeners(cmpMeta.listenersMeta)
    ];
    return trimFalsyData(d);
}
function formatEsmLoaderComponent(config, cmpMeta) {
    return __awaiter$4(this, void 0, void 0, function* () {
        const d = [
            /* 0 */ cmpMeta.tagNameMeta,
            /* 1 */ '__GET_MODULE_FN__',
            /* 2 */ formatHasStyles(cmpMeta.stylesMeta),
            /* 3 */ formatMembers(cmpMeta.membersMeta),
            /* 4 */ formatEncapsulation(cmpMeta.encapsulationMeta),
            /* 5 */ formatListeners(cmpMeta.listenersMeta)
        ];
        trimFalsyData(d);
        const str = JSON.stringify(d);
        const importFn = yield formatEsmLoaderImportFns(config, cmpMeta);
        return str.replace(`"__GET_MODULE_FN__"`, importFn);
    });
}
function formatBrowserLoaderBundleIds(bundleIds) {
    if (!bundleIds) {
        return `invalid-bundle-id`;
    }
    if (typeof bundleIds === 'string') {
        return bundleIds;
    }
    const modes = Object.keys(bundleIds).sort();
    if (!modes.length) {
        return `invalid-bundle-id`;
    }
    if (modes.length === 1) {
        return bundleIds[modes[0]];
    }
    const bundleIdObj = {};
    modes.forEach(modeName => {
        bundleIdObj[modeName] = bundleIds[modeName];
    });
    return bundleIdObj;
}
function formatEsmLoaderImportFns(config, cmpMeta) {
    return __awaiter$4(this, void 0, void 0, function* () {
        const modes = Object.keys(cmpMeta.bundleIds).sort((a, b) => {
            if (a === '$' || a === 'md')
                return 1;
            if (a < b)
                return -1;
            if (a > b)
                return 1;
            return 0;
        });
        const moduleImports = modes.map(styleMode => {
            return getModuleImport(cmpMeta, styleMode);
        }).join('');
        let importFn = `(function(){${moduleImports}})()`;
        const minifyResults = yield config.sys.minifyJs(importFn);
        importFn = minifyResults.output;
        if (importFn.endsWith(';')) {
            importFn = importFn.substring(0, importFn.length - 1);
        }
        return `function(${importFn.includes('o.') ? 'o' : ''}){return(${importFn}).then(function(m){return m.${dashToPascalCase(cmpMeta.tagNameMeta)}})}`;
    });
}
function getModuleFileName(cmpMeta, styleMode) {
    return (typeof cmpMeta.bundleIds !== 'string') ? cmpMeta.bundleIds[styleMode] : cmpMeta.bundleIds;
}
function getModuleImport(cmpMeta, styleMode) {
    const bundleFileName = getModuleFileName(cmpMeta, styleMode);
    const hasScoped = (cmpMeta.encapsulationMeta === 1 /* ShadowDom */ || cmpMeta.encapsulationMeta === 2 /* ScopedCss */);
    if (styleMode === '$' || styleMode === 'md') {
        if (hasScoped) {
            return `
        if (o.scoped) {
          return import('./${bundleFileName}.sc.js');
        }
        return import('./${bundleFileName}.js');
      `;
        }
        return `return import('./${bundleFileName}.js');`;
    }
    if (hasScoped) {
        return `
      if (o.mode == '${styleMode}') {
        if (o.scoped) {
          return import('./${bundleFileName}.sc.js');
        }
        return import('./${bundleFileName}.js');
      }`;
    }
    return `
    if (o.mode == '${styleMode}') {
      return import('./${bundleFileName}.js');
    }`;
}
function formatHasStyles(stylesMeta) {
    if (stylesMeta && Object.keys(stylesMeta).length > 0) {
        return 1;
    }
    return 0;
}
function formatMembers(membersMeta) {
    if (!membersMeta) {
        return 0;
    }
    const observeAttrs = [];
    const memberNames = Object.keys(membersMeta).sort();
    memberNames.forEach(memberName => {
        const memberMeta = membersMeta[memberName];
        const d = [
            memberName,
            memberMeta.memberType /* 1 - memberType */
        ];
        if (memberMeta.propType === 3 /* Boolean */ || memberMeta.propType === 4 /* Number */ || memberMeta.propType === 2 /* String */ || memberMeta.propType === 1 /* Any */) {
            // observe the attribute
            if (memberMeta.reflectToAttrib) {
                d.push(1); /* 2 - reflectToAttr */
            }
            else {
                d.push(0); /* 2 - reflectToAttr */
            }
            if (memberMeta.attribName !== memberName) {
                // property name and attribute name are different
                // ariaDisabled !== aria-disabled
                d.push(memberMeta.attribName); /* 3 - attribName */
            }
            else {
                // property name and attribute name are the exact same
                // checked === checked
                d.push(1); /* 3 - attribName */
            }
            d.push(memberMeta.propType); /* 4 - propType */
        }
        else {
            // do not observe the attribute
            d.push(0); /* 2 - reflectToAttr */
            d.push(0); /* 3 - attribName */
            d.push(0 /* Unknown */); /* 4 - propType */
        }
        if (memberMeta.ctrlId) {
            d.push(memberMeta.ctrlId); /* 5 - ctrlId */
        }
        observeAttrs.push(d);
    });
    if (!observeAttrs.length) {
        return 0;
    }
    return observeAttrs.map(p => {
        return trimFalsyData(p);
    });
}
function formatEncapsulation(val) {
    if (val === 1 /* ShadowDom */) {
        return 1 /* ShadowDom */;
    }
    if (val === 2 /* ScopedCss */) {
        return 2 /* ScopedCss */;
    }
    return 0 /* NoEncapsulation */;
}
function formatListeners(listeners) {
    if (!listeners || !listeners.length) {
        return 0;
    }
    return listeners.map(listener => {
        const d = [
            listener.eventName,
            listener.eventMethodName,
            listener.eventDisabled ? 1 : 0,
            listener.eventPassive ? 1 : 0,
            listener.eventCapture ? 1 : 0
        ];
        return trimFalsyData(d);
    });
}
function formatConstructorEncapsulation(encapsulation) {
    if (encapsulation) {
        if (encapsulation === 1 /* ShadowDom */) {
            return 'shadow';
        }
        else if (encapsulation === 2 /* ScopedCss */) {
            return 'scoped';
        }
    }
    return null;
}
function formatComponentConstructorProperties(membersMeta, stringify, excludeInternal) {
    if (!membersMeta) {
        return null;
    }
    const memberNames = Object.keys(membersMeta).sort((a, b) => {
        if (a.toLowerCase() < b.toLowerCase())
            return -1;
        if (a.toLowerCase() > b.toLowerCase())
            return 1;
        return 0;
    });
    if (!memberNames.length) {
        return null;
    }
    const properties = {};
    memberNames.forEach(memberName => {
        const prop = formatComponentConstructorProperty(membersMeta[memberName], stringify, excludeInternal);
        if (prop !== null) {
            properties[memberName] = prop;
        }
    });
    if (!Object.keys(properties).length) {
        return null;
    }
    if (stringify) {
        let str = JSON.stringify(properties);
        str = str.replace(`"TYPE_String"`, `String`);
        str = str.replace(`"TYPE_Boolean"`, `Boolean`);
        str = str.replace(`"TYPE_Number"`, `Number`);
        return str;
    }
    return properties;
}
function formatComponentConstructorProperty(memberMeta, stringify, excludeInternal) {
    const property = {};
    if (memberMeta.memberType === 5 /* State */) {
        if (excludeInternal)
            return null;
        property.state = true;
    }
    else if (memberMeta.memberType === 7 /* Element */) {
        if (excludeInternal)
            return null;
        property.elementRef = true;
    }
    else if (memberMeta.memberType === 6 /* Method */) {
        property.method = true;
    }
    else if (memberMeta.memberType === 4 /* PropConnect */) {
        if (excludeInternal)
            return null;
        property.connect = memberMeta.ctrlId;
    }
    else if (memberMeta.memberType === 3 /* PropContext */) {
        if (excludeInternal)
            return null;
        property.context = memberMeta.ctrlId;
    }
    else {
        if (memberMeta.propType === 2 /* String */) {
            if (stringify) {
                property.type = 'TYPE_String';
            }
            else {
                property.type = String;
            }
        }
        else if (memberMeta.propType === 3 /* Boolean */) {
            if (stringify) {
                property.type = 'TYPE_Boolean';
            }
            else {
                property.type = Boolean;
            }
        }
        else if (memberMeta.propType === 4 /* Number */) {
            if (stringify) {
                property.type = 'TYPE_Number';
            }
            else {
                property.type = Number;
            }
        }
        else {
            property.type = 'Any';
        }
        if (typeof memberMeta.attribName === 'string') {
            property.attr = memberMeta.attribName;
            if (memberMeta.reflectToAttrib) {
                property.reflectToAttr = true;
            }
        }
        if (memberMeta.memberType === 2 /* PropMutable */) {
            property.mutable = true;
        }
    }
    if (memberMeta.watchCallbacks && memberMeta.watchCallbacks.length > 0) {
        property.watchCallbacks = memberMeta.watchCallbacks.slice();
    }
    return property;
}
function formatComponentConstructorEvents(eventsMeta) {
    if (!eventsMeta || !eventsMeta.length) {
        return null;
    }
    return eventsMeta.map(ev => formatComponentConstructorEvent(ev));
}
function formatComponentConstructorEvent(eventMeta) {
    const constructorEvent = {
        name: eventMeta.eventName,
        method: eventMeta.eventMethodName,
        bubbles: true,
        cancelable: true,
        composed: true
    };
    // default bubbles true
    if (typeof eventMeta.eventBubbles === 'boolean') {
        constructorEvent.bubbles = eventMeta.eventBubbles;
    }
    // default cancelable true
    if (typeof eventMeta.eventCancelable === 'boolean') {
        constructorEvent.cancelable = eventMeta.eventCancelable;
    }
    // default composed true
    if (typeof eventMeta.eventComposed === 'boolean') {
        constructorEvent.composed = eventMeta.eventComposed;
    }
    return constructorEvent;
}
function formatComponentConstructorListeners(listenersMeta, stringify) {
    if (!listenersMeta || !listenersMeta.length) {
        return null;
    }
    const listeners = listenersMeta.map(ev => formatComponentConstructorListener(ev));
    if (stringify) {
        return JSON.stringify(listeners);
    }
    return listeners;
}
function formatComponentConstructorListener(listenMeta) {
    const constructorListener = {
        name: listenMeta.eventName,
        method: listenMeta.eventMethodName
    };
    // default capture falsy
    if (listenMeta.eventCapture === true) {
        constructorListener.capture = true;
    }
    // default disabled falsy
    if (listenMeta.eventDisabled === true) {
        constructorListener.disabled = true;
    }
    // default passive falsy
    if (listenMeta.eventPassive === true) {
        constructorListener.passive = true;
    }
    return constructorListener;
}
function trimFalsyData(d) {
    for (var i = d.length - 1; i >= 0; i--) {
        if (d[i]) {
            break;
        }
        // if falsy, safe to pop()
        d.pop();
    }
    return d;
}
function getStylePlaceholder(tagName) {
    return `/**style-placeholder:${tagName}:**/`;
}
function getStyleIdPlaceholder(tagName) {
    return `/**style-id-placeholder:${tagName}:**/`;
}
function getBundleIdPlaceholder() {
    return `/**:bundle-id:**/`;
}
function replaceBundleIdPlaceholder(jsText, bundleId) {
    return jsText.replace(getBundleIdPlaceholder(), bundleId);
}

var __awaiter$5 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateEsmIndex(config, compilerCtx, outputTarget) {
    return __awaiter$5(this, void 0, void 0, function* () {
        const esm = [
            `// ${config.namespace}: ES Module`
        ];
        const defineLibraryEsm = getDefineCustomElementsPath(config, outputTarget, 'es5');
        yield addExport(config, compilerCtx, outputTarget, esm, defineLibraryEsm);
        const collectionIndexPath = pathJoin(config, outputTarget.collectionDir, 'index.js');
        yield addExport(config, compilerCtx, outputTarget, esm, collectionIndexPath);
        const distIndexEsmPath = getDistEsmIndexPath(config, outputTarget);
        yield Promise.all([
            compilerCtx.fs.writeFile(distIndexEsmPath, esm.join('\n')),
            copyEsmCorePolyfills(config, compilerCtx, outputTarget),
            patchCollection(config, compilerCtx, outputTarget)
        ]);
    });
}
function addExport(config, compilerCtx, outputTarget, esm, filePath) {
    return __awaiter$5(this, void 0, void 0, function* () {
        const fileExists = yield compilerCtx.fs.access(filePath);
        if (fileExists) {
            let relPath = normalizePath(config.sys.path.relative(getDistEsmBuildDir(config, outputTarget), filePath));
            if (!relPath.startsWith('.')) {
                relPath = './' + relPath;
            }
            esm.push(`export * from '${relPath}';`);
        }
    });
}
function generateEsmHosts(config, compilerCtx, cmpRegistry, outputTarget) {
    return __awaiter$5(this, void 0, void 0, function* () {
        if (outputTarget.type !== 'dist') {
            return;
        }
        yield Promise.all([
            generateEsmEs5(config, compilerCtx, cmpRegistry, outputTarget),
            generateDefineCustomElements(config, compilerCtx, cmpRegistry, outputTarget)
        ]);
    });
}
function generateDefineCustomElements(config, compilerCtx, cmpRegistry, outputTarget) {
    return __awaiter$5(this, void 0, void 0, function* () {
        const componentClassList = Object.keys(cmpRegistry).map(tagName => {
            const cmpMeta = cmpRegistry[tagName];
            return cmpMeta.componentClass;
        }).sort();
        const c = [
            `// ${config.namespace}: Custom Elements Define Library, ES Module/ES5 Target`
        ];
        c.push(`import { defineCustomElement } from './${getCoreEsmFileName(config)}';`);
        c.push(`import {\n  ${componentClassList.join(',\n  ')}\n} from './${getComponentsEsmFileName(config)}';`);
        c.push(``);
        c.push(`export function defineCustomElements(window, opts) {`);
        c.push(`  defineCustomElement(window, [\n    ${componentClassList.join(',\n    ')}\n  ], opts);`);
        c.push(`}`);
        const defineFilePath = getDefineCustomElementsPath(config, outputTarget, 'es5');
        yield compilerCtx.fs.writeFile(defineFilePath, c.join('\n'));
    });
}
function appendDefineCustomElementsType(content) {
    const types = `export declare function defineCustomElements(window: any): void;`;
    if (!content.includes(types)) {
        content += types;
    }
    return content;
}
function generateEsmEs5(config, compilerCtx, cmpRegistry, outputTarget) {
    return __awaiter$5(this, void 0, void 0, function* () {
        const c = yield Promise.all(Object.keys(cmpRegistry).sort().map((tagName) => __awaiter$5(this, void 0, void 0, function* () {
            const cmpMeta = cmpRegistry[tagName];
            const data = yield formatEsmLoaderComponent(config, cmpMeta);
            return `export var ${cmpMeta.componentClass} = ${data};`;
        })));
        c.unshift(`// ${config.namespace}: Host Data, ES Module/ES5 Target`);
        const componentsEsmFilePath = getComponentsEsmBuildPath(config, outputTarget, 'es5');
        yield compilerCtx.fs.writeFile(componentsEsmFilePath, c.join('\n\n'));
    });
}
function patchCollection(config, compilerCtx, outputTarget) {
    return __awaiter$5(this, void 0, void 0, function* () {
        // it's possible a d.ts file was exported from the index.ts file
        // which is fine, except that messes with any raw JS exports
        // in the collection/index.js
        // so let's just make this work by putting in empty js files
        // and call it a day
        const collectionInterfacePath = pathJoin(config, outputTarget.collectionDir, 'interface.js');
        yield compilerCtx.fs.writeFile(collectionInterfacePath, '');
    });
}

var __awaiter$6 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateAngularProxies(config, compilerCtx, cmpRegistry) {
    return __awaiter$6(this, void 0, void 0, function* () {
        const angularOuputTargets = config.outputTargets
            .filter(o => o.type === 'angular' && o.directivesProxyFile);
        yield Promise.all(angularOuputTargets.map((angularOuputTarget) => __awaiter$6(this, void 0, void 0, function* () {
            yield angularDirectiveProxyOutput(config, compilerCtx, angularOuputTarget, cmpRegistry);
        })));
    });
}
function getComponents(excludeComponents, cmpRegistry) {
    return Object.keys(cmpRegistry)
        .map(key => cmpRegistry[key])
        .filter(c => !excludeComponents.includes(c.tagNameMeta))
        .sort((a, b) => {
        if (a.componentClass < b.componentClass)
            return -1;
        if (a.componentClass > b.componentClass)
            return 1;
        return 0;
    });
}
function angularDirectiveProxyOutput(config, compilerCtx, outputTarget, cmpRegistry) {
    return __awaiter$6(this, void 0, void 0, function* () {
        const components = getComponents(outputTarget.excludeComponents, cmpRegistry);
        const { hasDirectives, hasOutputs, proxies } = generateProxies(components);
        const auxFunctions = [
            inputsAuxFunction(),
            outputsAuxFunction(),
            methodsAuxFunction()
        ];
        const angularImports = [
            'ElementRef'
        ];
        if (hasDirectives) {
            angularImports.push('Directive');
        }
        if (hasOutputs) {
            angularImports.push('EventEmitter');
        }
        const imports = `import { ${angularImports.sort().join(', ')} } from '@angular/core';`;
        const final = [
            '/* auto-generated angular directive proxies */',
            '/* tslint:disable */',
            imports,
            auxFunctions.join('\n'),
            proxies,
        ];
        const finalText = final.join('\n') + '\n';
        yield compilerCtx.fs.writeFile(outputTarget.directivesProxyFile, finalText);
        if (outputTarget.directivesArrayFile) {
            const proxyPath = relativeImport(outputTarget.directivesArrayFile, outputTarget.directivesProxyFile);
            const a = angularArray(components, proxyPath);
            yield compilerCtx.fs.writeFile(outputTarget.directivesArrayFile, a);
        }
        config.logger.debug(`generated angular directives: ${outputTarget.directivesProxyFile}`);
    });
}
function inputsAuxFunction() {
    return `
export function proxyInputs(instance: any, el: ElementRef, props: string[]) {
  props.forEach(propName => {
    Object.defineProperty(instance, propName, {
      get: () => el.nativeElement[propName], set: (val: any) => el.nativeElement[propName] = val
    });
  });
}`;
}
function outputsAuxFunction() {
    return `
export function proxyOutputs(instance: any, events: string[]) {
  events.forEach(eventName => instance[eventName] = new EventEmitter());
}`;
}
function methodsAuxFunction() {
    return `
export function proxyMethods(instance: any, ref: ElementRef, methods: string[]) {
  const el = ref.nativeElement;
  methods.forEach(methodName => {
    Object.defineProperty(instance, methodName, {
      get: function() {
        return function() {
          const args = arguments;
          return el.componentOnReady().then((el: any) => el[methodName].apply(el, args));
        };
      }
    });
  });
}
`;
}
function generateProxies(components) {
    let hasDirectives = false;
    let hasMethods = false;
    let hasOutputs = false;
    let hasInputs = false;
    const lines = components.map(cmpMeta => {
        const proxy = generateProxy(cmpMeta);
        hasDirectives = true;
        if (proxy.hasInputs) {
            hasInputs = true;
        }
        if (proxy.hasMethods) {
            hasMethods = true;
        }
        if (proxy.hasOutputs) {
            hasOutputs = true;
        }
        return proxy.text;
    });
    return {
        proxies: lines.join('\n'),
        hasDirectives,
        hasInputs,
        hasMethods,
        hasOutputs
    };
}
function generateProxy(cmpMeta) {
    // Collect component meta
    const inputs = getInputs(cmpMeta);
    const outputs = getOutputs(cmpMeta);
    const methods = getMethods(cmpMeta);
    // Process meta
    const hasInputs = inputs.length > 0;
    const hasOutputs = outputs.length > 0;
    const hasMethods = methods.length > 0;
    const hasContructor = hasInputs || hasOutputs || hasMethods;
    // Generate Angular @Directive
    const directiveOpts = [
        `selector: \'${cmpMeta.tagNameMeta}\'`
    ];
    if (inputs.length > 0) {
        directiveOpts.push(`inputs: ['${inputs.join(`', '`)}']`);
    }
    if (outputs.length > 0) {
        directiveOpts.push(`outputs: ['${outputs.join(`', '`)}']`);
    }
    const tagNameAsPascal = dashToPascalCase(cmpMeta.tagNameMeta);
    const lines = [`
export declare interface ${cmpMeta.componentClass} extends StencilComponents.${tagNameAsPascal} {}
@Directive({ ${directiveOpts.join(', ')} })
export class ${cmpMeta.componentClass} {`];
    // Generate outputs
    outputs.forEach(output => {
        lines.push(`  ${output}: EventEmitter<any>;`);
    });
    // Generate component constructor
    if (hasMethods || hasInputs) {
        lines.push(`  constructor(r: ElementRef) {`);
    }
    else if (hasOutputs) {
        lines.push(`  constructor() {`);
    }
    if (hasMethods) {
        lines.push(`    proxyMethods(this, r, ['${methods.join(`', '`)}']);`);
    }
    if (hasInputs) {
        lines.push(`    proxyInputs(this, r, ['${inputs.join(`', '`)}']);`);
    }
    if (hasOutputs) {
        lines.push(`    proxyOutputs(this, ['${outputs.join(`', '`)}']);`);
    }
    if (hasContructor) {
        lines.push(`  }`);
    }
    lines.push(`}`);
    return {
        text: lines.join('\n'),
        hasInputs,
        hasMethods,
        hasOutputs
    };
}
function getInputs(cmpMeta) {
    return Object.keys(cmpMeta.membersMeta || {}).filter(memberName => {
        const m = cmpMeta.membersMeta[memberName];
        return m.memberType === 1 /* Prop */ || m.memberType === 2 /* PropMutable */;
    });
}
function getOutputs(cmpMeta) {
    return (cmpMeta.eventsMeta || []).map(eventMeta => eventMeta.eventName);
}
function getMethods(cmpMeta) {
    return Object.keys(cmpMeta.membersMeta || {}).filter(memberName => {
        const m = cmpMeta.membersMeta[memberName];
        return m.memberType === 6 /* Method */;
    });
}
function relativeImport(pathFrom, pathTo) {
    let relativePath = path.relative(path.dirname(pathFrom), path.dirname(pathTo));
    relativePath = relativePath === '' ? '.' : relativePath;
    return `${relativePath}/${path.basename(pathTo, '.ts')}`;
}
function angularArray(components, proxyPath) {
    const directives = components.map(cmpMeta => `d.${cmpMeta.componentClass}`).join(',\n  ');
    return `
import * as d from '${proxyPath}';

export const DIRECTIVES = [
  ${directives}
];
`;
}

var __awaiter$7 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function updateStencilTypesImports(config, typesDir, dtsFilePath, dtsContent) {
    const dir = config.sys.path.dirname(dtsFilePath);
    const relPath = config.sys.path.relative(dir, typesDir);
    let coreDtsPath = normalizePath(config.sys.path.join(relPath, CORE_FILENAME));
    if (!coreDtsPath.startsWith('.')) {
        coreDtsPath = `./${coreDtsPath}`;
    }
    if (dtsContent.includes('JSX')) {
        dtsContent = `import '${coreDtsPath}';\n${dtsContent}`;
    }
    if (dtsContent.includes('@stencil/core')) {
        dtsContent = dtsContent.replace(/\@stencil\/core/g, coreDtsPath);
    }
    return dtsContent;
}
function copyStencilCoreDts(config, compilerCtx) {
    return __awaiter$7(this, void 0, void 0, function* () {
        const typesOutputTargets = config.outputTargets.filter(o => o.typesDir);
        yield Promise.all(typesOutputTargets.map((typesOutputTarget) => __awaiter$7(this, void 0, void 0, function* () {
            yield copyStencilCoreDtsOutput(config, compilerCtx, typesOutputTarget);
        })));
    });
}
function copyStencilCoreDtsOutput(config, compilerCtx, outputTarget) {
    return __awaiter$7(this, void 0, void 0, function* () {
        const srcDts = yield config.sys.getClientCoreFile({
            staticName: 'declarations/stencil.core.d.ts'
        });
        const coreDtsFilePath = normalizePath(config.sys.path.join(outputTarget.typesDir, CORE_DTS));
        yield compilerCtx.fs.writeFile(coreDtsFilePath, srcDts);
    });
}
const CORE_FILENAME = `stencil.core`;
const CORE_DTS = `${CORE_FILENAME}.d.ts`;

var __awaiter$8 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function validatePackageFiles(config, outputTarget, diagnostics, pkgData) {
    if (pkgData.files) {
        const actualDistDir = normalizePath(config.sys.path.relative(config.rootDir, outputTarget.dir));
        const validPaths = [
            `${actualDistDir}`,
            `${actualDistDir}/`,
            `./${actualDistDir}`,
            `./${actualDistDir}/`
        ];
        const containsDistDir = pkgData.files
            .some(userPath => validPaths.some(validPath => normalizePath(userPath) === validPath));
        if (!containsDistDir) {
            const err = buildWarn(diagnostics);
            err.messageText = `package.json "files" array must contain the distribution directory "${actualDistDir}/" when generating a distribution.`;
        }
    }
}
function validateModule(config, compilerCtx, outputTarget, diagnostics, pkgData) {
    return __awaiter$8(this, void 0, void 0, function* () {
        const moduleAbs = getDistEsmIndexPath(config, outputTarget);
        const moduleRel = normalizePath(config.sys.path.relative(config.rootDir, moduleAbs));
        if (typeof pkgData.module !== 'string') {
            const err = buildWarn(diagnostics);
            err.messageText = `package.json "module" property is required when generating a distribution. It's recommended to set the "module" property to: ${moduleRel}`;
            return;
        }
        const pkgFile = pathJoin(config, config.rootDir, pkgData.module);
        const fileExists = yield compilerCtx.fs.access(pkgFile);
        if (!fileExists) {
            const err = buildWarn(diagnostics);
            err.messageText = `package.json "module" property is set to "${pkgData.module}" but cannot be found. It's recommended to set the "module" property to: ${moduleRel}`;
            return;
        }
    });
}
function validateMain(config, compilerCtx, outputTarget, diagnostics, pkgData) {
    return __awaiter$8(this, void 0, void 0, function* () {
        const mainAbs = getDistCjsIndexPath(config, outputTarget);
        const mainRel = pathJoin(config, config.sys.path.relative(config.rootDir, mainAbs));
        if (typeof pkgData.main !== 'string' || pkgData.main === '') {
            const err = buildWarn(diagnostics);
            err.messageText = `package.json "main" property is required when generating a distribution. It's recommended to set the "main" property to: ${mainRel}`;
            return;
        }
        const pkgFile = pathJoin(config, config.rootDir, pkgData.main);
        const fileExists = yield compilerCtx.fs.access(pkgFile);
        if (!fileExists) {
            const err = buildWarn(diagnostics);
            err.messageText = `package.json "main" property is set to "${pkgData.main}" but cannot be found. It's recommended to set the "main" property to: ${mainRel}`;
            return;
        }
        const loaderAbs = getLoaderPath(config, outputTarget);
        const loaderRel = pathJoin(config, config.sys.path.relative(config.rootDir, loaderAbs));
        if (normalizePath(pkgData.main) === loaderRel) {
            const err = buildWarn(diagnostics);
            err.messageText = `package.json "main" property should not be set to "${pkgData.main}", which is the browser loader (this was a previous recommendation, but recently updated). Instead, please set the "main" property to: ${mainRel}`;
            return;
        }
    });
}
function validateTypes(config, outputTarget, diagnostics, pkgData) {
    if (typeof pkgData.types !== 'string' || pkgData.types === '') {
        const err = buildWarn(diagnostics);
        const recommendedPath = getRecommendedTypesPath(config, outputTarget);
        err.messageText = `package.json "types" property is required when generating a distribution. It's recommended to set the "types" property to: ${recommendedPath}`;
        return false;
    }
    if (!pkgData.types.endsWith('.d.ts')) {
        const err = buildWarn(diagnostics);
        err.messageText = `package.json "types" file must have a ".d.ts" extension: ${pkgData.types}`;
        return false;
    }
    return true;
}
function validateTypesExist(config, compilerCtx, outputTarget, diagnostics, pkgData) {
    return __awaiter$8(this, void 0, void 0, function* () {
        const pkgFile = pathJoin(config, config.rootDir, pkgData.types);
        const fileExists = yield compilerCtx.fs.access(pkgFile);
        if (!fileExists) {
            const err = buildWarn(diagnostics);
            const recommendedPath = getRecommendedTypesPath(config, outputTarget);
            err.messageText = `package.json "types" property is set to "${pkgData.types}" but cannot be found. It's recommended to set the "types" property to: ${recommendedPath}`;
            return false;
        }
        return true;
    });
}
function validateCollection(config, outputTarget, diagnostics, pkgData) {
    if (outputTarget.collectionDir) {
        const collectionRel = pathJoin(config, config.sys.path.relative(config.rootDir, outputTarget.collectionDir), COLLECTION_MANIFEST_FILE_NAME);
        if (!pkgData.collection || normalizePath(pkgData.collection) !== collectionRel) {
            const err = buildWarn(diagnostics);
            err.messageText = `package.json "collection" property is required when generating a distribution and must be set to: ${collectionRel}`;
        }
    }
}
function validateBrowser(diagnostics, pkgData) {
    if (typeof pkgData.browser === 'string') {
        const err = buildWarn(diagnostics);
        err.messageText = `package.json "browser" property is set to "${pkgData.browser}". However, for maximum compatibility with all bundlers it's recommended to not set the "browser" property and instead ensure both "module" and "main" properties are set.`;
        return;
    }
}
function validateNamespace(config, diagnostics) {
    if (typeof config.namespace !== 'string' || config.fsNamespace === 'app') {
        const err = buildWarn(diagnostics);
        err.messageText = `When generating a distribution it is recommended to choose a unique namespace rather than the default setting "App". Please updated the "namespace" config property within the stencil.config.js file.`;
    }
}
function getRecommendedTypesPath(config, outputTarget) {
    const typesAbs = getComponentsDtsTypesFilePath(config, outputTarget);
    return pathJoin(config, config.sys.path.relative(config.rootDir, typesAbs));
}

var __awaiter$9 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateTypes(config, compilerCtx, outputTarget, buildCtx, pkgData) {
    return __awaiter$9(this, void 0, void 0, function* () {
        // Before generating the types, let's check if the package.json values are correct
        if (!validateTypes(config, outputTarget, buildCtx.diagnostics, pkgData)) {
            return;
        }
        const srcDirItems = yield compilerCtx.fs.readdir(config.srcDir, { recursive: false });
        const srcDtsFiles = srcDirItems.filter(srcItem => srcItem.isFile && isDtsFile(srcItem.absPath));
        const distTypesDir = config.sys.path.dirname(pkgData.types);
        // Copy .d.ts files from src to dist
        // In addition, all references to @stencil/core are replaced
        yield Promise.all(srcDtsFiles.map((srcDtsFile) => __awaiter$9(this, void 0, void 0, function* () {
            const relPath = config.sys.path.relative(config.srcDir, srcDtsFile.absPath);
            const distPath = pathJoin(config, config.rootDir, distTypesDir, relPath);
            const originalDtsContent = yield compilerCtx.fs.readFile(srcDtsFile.absPath);
            const distDtsContent = updateStencilTypesImports(config, outputTarget.typesDir, distPath, originalDtsContent);
            yield compilerCtx.fs.writeFile(distPath, distDtsContent);
        })));
        // Final check, we make sure the generated types matches the path configured in the package.json
        const existsTypes = yield validateTypesExist(config, compilerCtx, outputTarget, buildCtx.diagnostics, pkgData);
        if (existsTypes) {
            yield copyStencilCoreDts(config, compilerCtx);
        }
    });
}

var __awaiter$a = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateProxies$1(config, compilerCtx, cmpRegistry) {
    return __awaiter$a(this, void 0, void 0, function* () {
        yield Promise.all([
            generateAngularProxies(config, compilerCtx, cmpRegistry)
        ]);
    });
}
function generateDistributions(config, compilerCtx, buildCtx) {
    return __awaiter$a(this, void 0, void 0, function* () {
        const distOutputs = config.outputTargets.filter(o => o.type === 'dist');
        if (distOutputs.length === 0) {
            // not doing any dist builds
            return;
        }
        if (buildCtx.validateTypesPromise) {
            // if we're doing a dist build and we've still
            // got a validate types build running then
            // we need to wait on it to finish first since the
            // validate types build is writing all the types to disk
            const timeSpan = buildCtx.createTimeSpan(`generateDistributions waiting on validateTypes`, true);
            yield buildCtx.validateTypesPromise;
            timeSpan.finish(`generateDistributions finished waiting on validateTypes`);
        }
        yield Promise.all(distOutputs.map((outputTarget) => __awaiter$a(this, void 0, void 0, function* () {
            yield generateDistribution(config, compilerCtx, buildCtx, outputTarget);
        })));
    });
}
function generateDistribution(config, compilerCtx, buildCtx, outputTarget) {
    return __awaiter$a(this, void 0, void 0, function* () {
        const pkgData = yield readPackageJson(config, compilerCtx);
        validatePackageFiles(config, outputTarget, buildCtx.diagnostics, pkgData);
        validateCollection(config, outputTarget, buildCtx.diagnostics, pkgData);
        validateNamespace(config, buildCtx.diagnostics);
        if (hasError(buildCtx.diagnostics)) {
            return;
        }
        yield Promise.all([
            generateCommonJsIndex(config, compilerCtx, outputTarget),
            generateEsmIndex(config, compilerCtx, outputTarget),
            copyComponentStyles(config, compilerCtx, buildCtx),
            generateTypes(config, compilerCtx, outputTarget, buildCtx, pkgData)
        ]);
        yield validateModule(config, compilerCtx, outputTarget, buildCtx.diagnostics, pkgData);
        yield validateMain(config, compilerCtx, outputTarget, buildCtx.diagnostics, pkgData);
        validateBrowser(buildCtx.diagnostics, pkgData);
    });
}
function readPackageJson(config, compilerCtx) {
    return __awaiter$a(this, void 0, void 0, function* () {
        const pkgJsonPath = config.sys.path.join(config.rootDir, 'package.json');
        let pkgJson;
        try {
            pkgJson = yield compilerCtx.fs.readFile(pkgJsonPath);
        }
        catch (e) {
            throw new Error(`Missing "package.json" file for distribution: ${pkgJsonPath}`);
        }
        let pkgData;
        try {
            pkgData = JSON.parse(pkgJson);
        }
        catch (e) {
            throw new Error(`Error parsing package.json: ${pkgJsonPath}, ${e}`);
        }
        return pkgData;
    });
}
function getComponentsDtsSrcFilePath(config) {
    return pathJoin(config, config.srcDir, COMPONENTS_DTS);
}
function getComponentsDtsTypesFilePath(config, outputTarget) {
    return pathJoin(config, outputTarget.typesDir, COMPONENTS_DTS);
}
const COMPONENTS_DTS = 'components.d.ts';

class FsWatchNormalizer {
    constructor(config, events) {
        this.config = config;
        this.events = events;
        this.dirsAdded = [];
        this.dirsDeleted = [];
        this.filesAdded = [];
        this.filesDeleted = [];
        this.filesUpdated = [];
    }
    fileUpdate(filePath) {
        filePath = normalizePath(filePath);
        if (shouldIgnore(filePath)) {
            return;
        }
        if (!this.filesUpdated.includes(filePath)) {
            this.log('file updated', filePath);
            this.filesUpdated.push(filePath);
            this.queue();
        }
    }
    fileAdd(filePath) {
        filePath = normalizePath(filePath);
        if (shouldIgnore(filePath)) {
            return;
        }
        if (!this.filesAdded.includes(filePath)) {
            this.log('file added', filePath);
            this.filesAdded.push(filePath);
            this.queue();
        }
    }
    fileDelete(filePath) {
        filePath = normalizePath(filePath);
        if (shouldIgnore(filePath)) {
            return;
        }
        if (!this.filesDeleted.includes(filePath)) {
            this.log('file deleted', filePath);
            this.filesDeleted.push(filePath);
            this.queue();
        }
    }
    dirAdd(dirPath) {
        dirPath = normalizePath(dirPath);
        if (!this.dirsAdded.includes(dirPath)) {
            this.log('directory added', dirPath);
            this.dirsAdded.push(dirPath);
            this.queue();
        }
    }
    dirDelete(dirPath) {
        dirPath = normalizePath(dirPath);
        if (!this.dirsDeleted.includes(dirPath)) {
            this.log('directory deleted', dirPath);
            this.dirsDeleted.push(dirPath);
            this.queue();
        }
    }
    queue() {
        // let's chill out for a few moments to see if anything else
        // comes in as something that changed in the file system
        clearTimeout(this.flushTmrId);
        this.flushTmrId = setTimeout(this.flush.bind(this), 40);
    }
    flush() {
        // create the watch results from all that we've learned today
        const fsWatchResults = {
            dirsAdded: this.dirsAdded.slice(),
            dirsDeleted: this.dirsDeleted.slice(),
            filesAdded: this.filesAdded.slice(),
            filesDeleted: this.filesDeleted.slice(),
            filesUpdated: this.filesUpdated.slice()
        };
        // reset the data for next time
        this.dirsAdded.length = 0;
        this.dirsDeleted.length = 0;
        this.filesAdded.length = 0;
        this.filesDeleted.length = 0;
        this.filesUpdated.length = 0;
        // send out the event of what we've learend
        this.events.emit('fsChange', fsWatchResults);
    }
    subscribe() {
        this.events.subscribe('fileUpdate', this.fileUpdate.bind(this));
        this.events.subscribe('fileAdd', this.fileAdd.bind(this));
        this.events.subscribe('fileDelete', this.fileDelete.bind(this));
        this.events.subscribe('dirAdd', this.dirAdd.bind(this));
        this.events.subscribe('dirDelete', this.dirDelete.bind(this));
    }
    log(msg, filePath) {
        const relPath = this.config.sys.path.relative(this.config.rootDir, filePath);
        this.config.logger.debug(`watch, ${msg}: ${relPath}, ${Date.now().toString().substring(5)}`);
    }
}
function shouldIgnore(filePath) {
    return filePath.endsWith(COMPONENTS_DTS);
}

function initFsWatch(config, compilerCtx, buildCtx) {
    // only create the watcher if this is a watch build
    // and we haven't created a watch listener already
    if (compilerCtx.hasWatch || !config.watch) {
        return false;
    }
    buildCtx.debug(`initFsWatch: ${config.sys.path.relative(config.rootDir, config.srcDir)}`);
    const fsWatchNormalizer = new FsWatchNormalizer(config, compilerCtx.events);
    fsWatchNormalizer.subscribe();
    compilerCtx.hasWatch = true;
    if (config.sys.createFsWatcher) {
        const fsWatcher = config.sys.createFsWatcher(compilerCtx.events, config.srcDir, {
            ignored: config.watchIgnoredRegex,
            ignoreInitial: true
        });
        if (fsWatcher && config.configPath) {
            config.configPath = normalizePath(config.configPath);
            fsWatcher.add(config.configPath);
        }
    }
    return true;
}

function writeCacheStats(config, compilerCtx, buildCtx) {
    if (!config.enableCacheStats) {
        return;
    }
    const statsPath = pathJoin(config, config.rootDir, 'stencil-cache-stats.json');
    config.logger.warn(`cache stats enabled for debugging, which is horrible for build times. Only enableCacheStats when debugging memory issues.`);
    const timeSpan = config.logger.createTimeSpan(`cache stats started: ${statsPath}`);
    let statsData = {};
    try {
        const dataStr = compilerCtx.fs.disk.readFileSync(statsPath);
        statsData = JSON.parse(dataStr);
    }
    catch (e) { }
    statsData['compilerCtx'] = statsData['compilerCtx'] || {};
    getObjectSize(statsData['compilerCtx'], compilerCtx);
    statsData['compilerCtx.cache.cacheFs.items'] = statsData['compilerCtx.cache.cacheFs.items'] || {};
    getObjectSize(statsData['compilerCtx.cache.cacheFs.items'], compilerCtx.cache['cacheFs']['items']);
    statsData['buildCtx'] = statsData['buildCtx'] || {};
    getObjectSize(statsData['buildCtx'], buildCtx);
    compilerCtx.fs.disk.writeFileSync(statsPath, JSON.stringify(statsData, null, 2));
    timeSpan.finish(`cache stats finished`);
}
function getObjectSize(data, obj) {
    if (obj) {
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object') {
                const size = objectSizeEstimate(obj[key]);
                if (size > 20000) {
                    data[key] = data[key] || [];
                    data[key].push(size);
                }
            }
        });
    }
}
function objectSizeEstimate(obj) {
    if (!obj) {
        return 0;
    }
    const objectList = [];
    const stack = [obj];
    let bytes = 0;
    while (stack.length) {
        const value = stack.pop();
        if (typeof value === 'boolean') {
            bytes += 4;
        }
        else if (typeof value === 'string') {
            bytes += value.length * 2;
        }
        else if (typeof value === 'number') {
            bytes += 8;
        }
        else if (typeof value === 'object' && !objectList.includes(value)) {
            objectList.push(value);
            for (const i in value) {
                stack.push(value[i]);
            }
        }
    }
    return bytes;
}

var __awaiter$b = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function buildFinish(config, compilerCtx, buildCtx, aborted) {
    return __awaiter$b(this, void 0, void 0, function* () {
        if (buildCtx.hasFinished && buildCtx.buildResults) {
            // we've already marked this build as finished and
            // already created the build results, just return these
            return buildCtx.buildResults;
        }
        buildCtx.debug(`${aborted ? 'aborted' : 'finished'} build, ${buildCtx.timestamp}`);
        // create the build results data
        buildCtx.buildResults = generateBuildResults(config, compilerCtx, buildCtx);
        // log any errors/warnings
        if (!buildCtx.hasFinished) {
            // haven't set this build as finished yet
            if (!buildCtx.hasPrintedResults) {
                config.logger.printDiagnostics(buildCtx.buildResults.diagnostics);
            }
            if (!compilerCtx.hasLoggedServerUrl && config.devServer && config.devServer.browserUrl && config.flags.serve) {
                // we've opened up the dev server
                // let's print out the dev server url
                config.logger.info(`dev server: ${config.logger.cyan(config.devServer.browserUrl)}`);
                compilerCtx.hasLoggedServerUrl = true;
            }
            if (buildCtx.isRebuild && buildCtx.buildResults.hmr && !aborted && buildCtx.isActiveBuild) {
                // this is a rebuild, and we've got hmr data
                // and this build hasn't been aborted
                logHmr(config, buildCtx);
            }
            // create a nice pretty message stating what happend
            const buildText = buildCtx.isRebuild ? 'rebuild' : 'build';
            const watchText = config.watch ? ', watching for changes...' : '';
            let buildStatus = 'finished';
            let statusColor = 'green';
            if (buildCtx.hasError) {
                // gosh darn, build had errors
                // ಥ_ಥ
                compilerCtx.lastBuildHadError = true;
                buildStatus = 'failed';
                statusColor = 'red';
            }
            else {
                // successful build!
                // ┏(°.°)┛ ┗(°.°)┓ ┗(°.°)┛ ┏(°.°)┓
                compilerCtx.hasSuccessfulBuild = true;
                compilerCtx.lastBuildHadError = false;
            }
            if (!aborted) {
                // print out the time it took to build
                // and add the duration to the build results
                buildCtx.timeSpan.finish(`${buildText} ${buildStatus}${watchText}`, statusColor, true, true);
                buildCtx.hasPrintedResults = true;
                // write the build stats
                yield generateBuildStats(config, compilerCtx, buildCtx, buildCtx.buildResults);
                // emit a buildFinish event for anyone who cares
                compilerCtx.events.emit('buildFinish', buildCtx.buildResults);
            }
            // write all of our logs to disk if config'd to do so
            // do this even if there are errors or not the active build
            config.logger.writeLogs(buildCtx.isRebuild);
            if (config.watch) {
                // this is a watch build
                // setup watch if we haven't done so already
                initFsWatch(config, compilerCtx, buildCtx);
            }
            else {
                // not a watch build, so lets destroy anything left open
                config.sys.destroy();
            }
        }
        // write cache stats only for memory debugging
        writeCacheStats(config, compilerCtx, buildCtx);
        // it's official, this build has finished
        buildCtx.hasFinished = true;
        if (buildCtx.isActiveBuild) {
            compilerCtx.isActivelyBuilding = false;
        }
        return buildCtx.buildResults;
    });
}
function logHmr(config, buildCtx) {
    // this is a rebuild, and we've got hmr data
    // and this build hasn't been aborted
    const hmr = buildCtx.buildResults.hmr;
    if (hmr.componentsUpdated) {
        cleanupUpdateMsg(config, `updated component`, hmr.componentsUpdated);
    }
    if (hmr.inlineStylesUpdated) {
        const inlineStyles = hmr.inlineStylesUpdated.map(s => s.styleTag).reduce((arr, v) => {
            if (!arr.includes(v)) {
                arr.push(v);
            }
            return arr;
        }, []);
        cleanupUpdateMsg(config, `updated style`, inlineStyles);
    }
    if (hmr.externalStylesUpdated) {
        cleanupUpdateMsg(config, `updated stylesheet`, hmr.externalStylesUpdated);
    }
    if (hmr.imagesUpdated) {
        cleanupUpdateMsg(config, `updated image`, hmr.imagesUpdated);
    }
}
function cleanupUpdateMsg(config, msg, fileNames) {
    if (fileNames.length > 0) {
        let fileMsg = '';
        if (fileNames.length > 7) {
            const remaining = fileNames.length - 6;
            fileNames = fileNames.slice(0, 6);
            fileMsg = fileNames.join(', ') + `, +${remaining} others`;
        }
        else {
            fileMsg = fileNames.join(', ');
        }
        if (fileNames.length > 1) {
            msg += 's';
        }
        config.logger.info(`${msg}: ${config.logger.cyan(fileMsg)}`);
    }
}

var __awaiter$c = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class BuildContext {
    constructor(config, compilerCtx) {
        this.config = config;
        this.compilerCtx = compilerCtx;
        this.appFileBuildCount = 0;
        this.buildId = -1;
        this.buildMessages = [];
        this.buildResults = null;
        this.bundleBuildCount = 0;
        this.collections = [];
        this.components = [];
        this.data = {};
        this.diagnostics = [];
        this.dirsAdded = [];
        this.dirsDeleted = [];
        this.entryModules = [];
        this.entryPoints = [];
        this.filesAdded = [];
        this.filesChanged = [];
        this.filesDeleted = [];
        this.filesUpdated = [];
        this.filesWritten = [];
        this.global = null;
        this.graphData = null;
        this.hasConfigChanges = false;
        this.hasCopyChanges = false;
        this.hasFinished = false;
        this.hasIndexHtmlChanges = false;
        this.hasPrintedResults = false;
        this.hasServiceWorkerChanges = false;
        this.hasScriptChanges = true;
        this.hasSlot = null;
        this.hasStyleChanges = true;
        this.hasSvg = null;
        this.indexBuildCount = 0;
        this.isRebuild = false;
        this.requiresFullBuild = true;
        this.scriptsAdded = [];
        this.scriptsDeleted = [];
        this.startTime = Date.now();
        this.styleBuildCount = 0;
        this.stylesUpdated = [];
        this.timeSpan = null;
        this.transpileBuildCount = 0;
    }
    start() {
        this.compilerCtx.isActivelyBuilding = true;
        // get the build id from the incremented activeBuildId
        ++this.compilerCtx.activeBuildId;
        if (this.compilerCtx.activeBuildId >= 100) {
            // reset the build id back to 0
            this.compilerCtx.activeBuildId = 0;
        }
        this.buildId = this.compilerCtx.activeBuildId;
        // print out a good message
        const msg = `${this.isRebuild ? 'rebuild' : 'build'}, ${this.config.fsNamespace}, ${this.config.devMode ? 'dev' : 'prod'} mode, started`;
        // create a timespan for this build
        this.timeSpan = this.createTimeSpan(msg);
        // create a build timestamp for this build
        this.timestamp = getBuildTimestamp();
        // debug log our new build
        this.debug(`start build, ${this.timestamp}`);
    }
    createTimeSpan(msg, debug) {
        if ((this.isActiveBuild && !this.hasFinished) || debug) {
            if (debug) {
                msg = `${this.config.logger.cyan('[' + this.buildId + ']')} ${msg}`;
            }
            const timeSpan = this.config.logger.createTimeSpan(msg, debug, this.buildMessages);
            if (!debug && this.compilerCtx.events) {
                this.compilerCtx.events.emit('buildLog', {
                    messages: this.buildMessages.slice()
                });
            }
            return {
                finish: (finishedMsg, color, bold, newLineSuffix) => {
                    if ((this.isActiveBuild && !this.hasFinished) || debug) {
                        if (debug) {
                            finishedMsg = `${this.config.logger.cyan('[' + this.buildId + ']')} ${finishedMsg}`;
                        }
                        timeSpan.finish(finishedMsg, color, bold, newLineSuffix);
                        if (!debug) {
                            this.compilerCtx.events.emit('buildLog', {
                                messages: this.buildMessages.slice()
                            });
                        }
                    }
                }
            };
        }
        return {
            finish: () => { }
        };
    }
    debug(msg) {
        this.config.logger.debug(`${this.config.logger.cyan('[' + this.buildId + ']')} ${msg}`);
    }
    get isActiveBuild() {
        return (this.compilerCtx.activeBuildId === this.buildId);
    }
    get hasError() {
        if (hasError(this.diagnostics)) {
            // remember if the last build had an error or not
            // this is useful if the next build should do a full build or not
            this.compilerCtx.lastBuildHadError = true;
            return true;
        }
        return false;
    }
    abort() {
        return __awaiter$c(this, void 0, void 0, function* () {
            return buildFinish(this.config, this.compilerCtx, this, true);
        });
    }
    finish() {
        return __awaiter$c(this, void 0, void 0, function* () {
            return buildFinish(this.config, this.compilerCtx, this, false);
        });
    }
    validateTypesBuild() {
        return __awaiter$c(this, void 0, void 0, function* () {
            if (this.hasError || !this.isActiveBuild) {
                // no need to wait on this one since
                // we already aborted this build
                return;
            }
            if (!this.validateTypesPromise) {
                // there is no pending validate types promise
                // so it probably already finished
                // so no need to wait on anything
                return;
            }
            if (!this.config.watch) {
                // this is not a watch build, so we need to make
                // sure that the type validation has finished
                this.debug(`build, non-watch, waiting on validateTypes`);
                yield this.validateTypesPromise;
                this.debug(`build, non-watch, finished waiting on validateTypes`);
            }
        });
    }
}
function getBuildTimestamp() {
    const d = new Date();
    // YYYY-MM-DDThh:mm:ss
    let timestamp = d.getUTCFullYear() + '-';
    timestamp += ('0' + d.getUTCMonth()).slice(-2) + '-';
    timestamp += ('0' + d.getUTCDate()).slice(-2) + 'T';
    timestamp += ('0' + d.getUTCHours()).slice(-2) + ':';
    timestamp += ('0' + d.getUTCMinutes()).slice(-2) + ':';
    timestamp += ('0' + d.getUTCSeconds()).slice(-2);
    return timestamp;
}

const AUTO_GENERATE_COMMENT = `<!-- Auto Generated Below -->`;
const NOTE = `*Built with [StencilJS](https://stenciljs.com/)*`;

class MarkdownTable {
    constructor() {
        this.rows = [];
    }
    addHeader(data) {
        this.addRow(data, true);
    }
    addRow(data, isHeader = false) {
        const colData = [];
        data.forEach(text => {
            const col = {
                text: text.replace(/\r?\n/g, ' '),
                width: text.length
            };
            colData.push(col);
        });
        this.rows.push({
            columns: colData,
            isHeader: isHeader
        });
    }
    toMarkdown() {
        return createTable(this.rows);
    }
}
function createTable(rows) {
    const content = [];
    if (rows.length === 0) {
        return content;
    }
    normalize(rows);
    const th = rows.find(r => r.isHeader);
    if (th) {
        const headerRow = createRow(th);
        content.push(headerRow);
        content.push(createBorder(th));
    }
    const tds = rows.filter(r => !r.isHeader);
    tds.forEach(td => {
        content.push(createRow(td));
    });
    return content;
}
function createBorder(th) {
    const border = {
        columns: [],
        isHeader: false
    };
    th.columns.forEach(c => {
        const borderCol = {
            text: '',
            width: c.width
        };
        while (borderCol.text.length < borderCol.width) {
            borderCol.text += '-';
        }
        border.columns.push(borderCol);
    });
    return createRow(border);
}
function createRow(row) {
    const content = ['| '];
    row.columns.forEach(c => {
        content.push(c.text);
        content.push(' | ');
    });
    return content.join('').trim();
}
function normalize(rows) {
    normalizeColumCount(rows);
    normalizeColumnWidth(rows);
}
function normalizeColumCount(rows) {
    let columnCount = 0;
    rows.forEach(r => {
        if (r.columns.length > columnCount) {
            columnCount = r.columns.length;
        }
    });
    rows.forEach(r => {
        while (r.columns.length < columnCount) {
            r.columns.push({
                text: ``,
                width: 0
            });
        }
    });
}
function normalizeColumnWidth(rows) {
    const columnCount = rows[0].columns.length;
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        let longestText = 0;
        rows.forEach(r => {
            const col = r.columns[columnIndex];
            if (col.text.length > longestText) {
                longestText = col.text.length;
            }
        });
        rows.forEach(r => {
            const col = r.columns[columnIndex];
            col.width = longestText;
            while (col.text.length < longestText) {
                col.text += ' ';
            }
        });
    }
}
function getMemberDocumentation(jsDoc) {
    if (jsDoc && jsDoc.documentation) {
        return jsDoc.documentation.trim();
    }
    return '';
}

class MarkdownAttrs {
    constructor() {
        this.rows = [];
    }
    addRow(memberMeta) {
        this.rows.push(new Row(memberMeta));
    }
    toMarkdown() {
        const content = [];
        if (!this.rows.length) {
            return content;
        }
        content.push(`## Attributes`);
        content.push(``);
        this.rows = this.rows.sort((a, b) => {
            if (a.memberMeta.attribName < b.memberMeta.attribName)
                return -1;
            if (a.memberMeta.attribName > b.memberMeta.attribName)
                return 1;
            return 0;
        });
        this.rows.forEach(row => {
            content.push(...row.toMarkdown());
        });
        return content;
    }
}
class Row {
    constructor(memberMeta) {
        this.memberMeta = memberMeta;
    }
    toMarkdown() {
        const content = [];
        content.push(`#### ${this.memberMeta.attribName}`);
        content.push(``);
        content.push(getPropType(this.memberMeta.propType));
        content.push(``);
        const doc = getMemberDocumentation(this.memberMeta.jsdoc);
        if (doc) {
            content.push(doc);
            content.push(``);
        }
        content.push(``);
        return content;
    }
}
function getPropType(propType) {
    switch (propType) {
        case 1 /* Any */:
            return 'any';
        case 3 /* Boolean */:
            return 'boolean';
        case 4 /* Number */:
            return 'number';
        case 2 /* String */:
            return 'string';
    }
    return '';
}

class MarkdownCssCustomProperties {
    constructor() {
        this.styleDocs = [];
    }
    addRow(styleDoc) {
        this.styleDocs.push(styleDoc);
    }
    toMarkdown() {
        const content = [];
        if (!this.styleDocs.length) {
            return content;
        }
        content.push(`## CSS Custom Properties`);
        content.push(``);
        this.styleDocs = this.styleDocs.sort((a, b) => {
            if (a.name < b.name)
                return -1;
            if (a.name > b.name)
                return 1;
            return 0;
        });
        const table = new MarkdownTable();
        table.addHeader(['Name', 'Description']);
        this.styleDocs.forEach(styleDoc => {
            table.addRow([
                '`' + styleDoc.name + '`',
                styleDoc.docs
            ]);
        });
        content.push(...table.toMarkdown());
        content.push(``);
        return content;
    }
}

class MarkdownEvents {
    constructor() {
        this.rows = [];
    }
    addRow(eventMeta) {
        this.rows.push(new Row$1(eventMeta));
    }
    toMarkdown() {
        const content = [];
        if (!this.rows.length) {
            return content;
        }
        content.push(`## Events`);
        content.push(``);
        this.rows = this.rows.sort((a, b) => {
            if (a.eventMeta.eventName < b.eventMeta.eventName)
                return -1;
            if (a.eventMeta.eventName > b.eventMeta.eventName)
                return 1;
            return 0;
        });
        this.rows.forEach(row => {
            content.push(...row.toMarkdown());
        });
        return content;
    }
}
class Row$1 {
    constructor(eventMeta) {
        this.eventMeta = eventMeta;
    }
    toMarkdown() {
        const content = [];
        content.push(`#### ${this.eventMeta.eventName}`);
        content.push(``);
        const doc = getMemberDocumentation(this.eventMeta.jsdoc);
        if (doc) {
            content.push(doc);
            content.push(``);
        }
        content.push(``);
        return content;
    }
}

class MarkdownMethods {
    constructor() {
        this.rows = [];
    }
    addRow(memberName, memberMeta) {
        this.rows.push(new Row$2(memberName, memberMeta));
    }
    toMarkdown() {
        const content = [];
        if (!this.rows.length) {
            return content;
        }
        content.push(`## Methods`);
        content.push(``);
        this.rows = this.rows.sort((a, b) => {
            if (a.memberName < b.memberName)
                return -1;
            if (a.memberName > b.memberName)
                return 1;
            return 0;
        });
        this.rows.forEach(row => {
            content.push(...row.toMarkdown());
        });
        return content;
    }
}
class Row$2 {
    constructor(memberName, memberMeta) {
        this.memberName = memberName;
        this.memberMeta = memberMeta;
    }
    toMarkdown() {
        const content = [];
        content.push(`#### ${this.memberName}()`);
        content.push(``);
        const doc = getMemberDocumentation(this.memberMeta.jsdoc);
        if (doc) {
            content.push(doc);
            content.push(``);
        }
        content.push(``);
        return content;
    }
}

class MarkdownProps {
    constructor() {
        this.rows = [];
    }
    addRow(memberName, memberMeta) {
        this.rows.push(new Row$3(memberName, memberMeta));
    }
    toMarkdown() {
        const content = [];
        if (!this.rows.length) {
            return content;
        }
        content.push(`## Properties`);
        content.push(``);
        this.rows = this.rows.sort((a, b) => {
            if (a.memberName < b.memberName)
                return -1;
            if (a.memberName > b.memberName)
                return 1;
            return 0;
        });
        this.rows.forEach(row => {
            content.push(...row.toMarkdown());
        });
        return content;
    }
}
class Row$3 {
    constructor(memberName, memberMeta) {
        this.memberName = memberName;
        this.memberMeta = memberMeta;
    }
    toMarkdown() {
        const content = [];
        content.push(`#### ${this.memberName}`);
        content.push(``);
        content.push(getPropType$1(this.memberMeta));
        content.push(``);
        const doc = getMemberDocumentation(this.memberMeta.jsdoc);
        if (doc) {
            content.push(doc);
            content.push(``);
        }
        content.push(``);
        return content;
    }
}
function getPropType$1(prop) {
    const propType = prop.propType;
    switch (propType) {
        case 1 /* Any */:
            return 'any';
        case 3 /* Boolean */:
            return 'boolean';
        case 4 /* Number */:
            return 'number';
        case 2 /* String */:
            return 'string';
    }
    return prop.attribType.text;
}

function addAutoGenerate(cmpMeta, content) {
    content.push(AUTO_GENERATE_COMMENT);
    content.push(``);
    content.push(``);
    const markdownContent = generateMemberMarkdown(cmpMeta);
    content.push(...markdownContent);
    content.push(``);
    content.push(`----------------------------------------------`);
    content.push(``);
    content.push(NOTE);
    content.push(``);
}
function generateMemberMarkdown(cmpMeta) {
    const attrs = new MarkdownAttrs();
    const events = new MarkdownEvents();
    const methods = new MarkdownMethods();
    const props = new MarkdownProps();
    const cssCustomProps = new MarkdownCssCustomProperties();
    cmpMeta.membersMeta && Object.keys(cmpMeta.membersMeta).forEach(memberName => {
        const memberMeta = cmpMeta.membersMeta[memberName];
        if (memberMeta.memberType === 1 /* Prop */ || memberMeta.memberType === 2 /* PropMutable */) {
            props.addRow(memberName, memberMeta);
            if (memberMeta.attribName) {
                attrs.addRow(memberMeta);
            }
        }
        else if (memberMeta.memberType === 6 /* Method */) {
            methods.addRow(memberName, memberMeta);
        }
    });
    cmpMeta.eventsMeta && cmpMeta.eventsMeta.forEach(ev => {
        events.addRow(ev);
    });
    cmpMeta.styleDocs && cmpMeta.styleDocs.forEach(styleDoc => {
        if (styleDoc.annotation === 'prop') {
            cssCustomProps.addRow(styleDoc);
        }
    });
    return [
        ...props.toMarkdown(),
        ...attrs.toMarkdown(),
        ...events.toMarkdown(),
        ...methods.toMarkdown(),
        ...cssCustomProps.toMarkdown()
    ];
}

var __awaiter$d = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateJsDocComponent(config, compilerCtx, jsonDocs, cmpMeta, dirPath, readmeContent) {
    return __awaiter$d(this, void 0, void 0, function* () {
        const jsonCmp = {
            tag: cmpMeta.tagNameMeta,
            readme: readmeContent || '',
            usage: yield generateJsDocsUsages(config, compilerCtx, dirPath),
            props: [],
            methods: [],
            events: [],
            styles: []
        };
        generateJsDocMembers(cmpMeta, jsonCmp);
        generateJsDocEvents(cmpMeta, jsonCmp);
        generateJsDocCssProps(cmpMeta, jsonCmp);
        jsonDocs.components.push(jsonCmp);
    });
}
function generateJsDocsUsages(config, compilerCtx, dirPath) {
    return __awaiter$d(this, void 0, void 0, function* () {
        const rtn = {};
        const usagesDir = config.sys.path.join(dirPath, 'usage');
        try {
            const usageFilePaths = yield compilerCtx.fs.readdir(usagesDir);
            const usages = {};
            yield Promise.all(usageFilePaths.map((f) => __awaiter$d(this, void 0, void 0, function* () {
                if (!f.isFile) {
                    return;
                }
                const fileName = config.sys.path.basename(f.relPath);
                if (!fileName.endsWith('.md')) {
                    return;
                }
                const parts = fileName.split('.');
                parts.pop();
                const key = parts.join('.');
                usages[key] = yield compilerCtx.fs.readFile(f.absPath);
            })));
            Object.keys(usages).sort().forEach(key => {
                rtn[key] = usages[key];
            });
        }
        catch (e) { }
        return rtn;
    });
}
function generateJsDocMembers(cmpMeta, jsonCmp) {
    if (!cmpMeta.membersMeta)
        return;
    Object.keys(cmpMeta.membersMeta).sort((a, b) => {
        if (a.toLowerCase() < b.toLowerCase())
            return -1;
        if (a.toLowerCase() > b.toLowerCase())
            return 1;
        return 0;
    }).forEach(memberName => {
        const memberMeta = cmpMeta.membersMeta[memberName];
        if (memberMeta.memberType === 1 /* Prop */ || memberMeta.memberType === 2 /* PropMutable */) {
            const propData = {
                name: memberName
            };
            if (memberMeta.propType === 3 /* Boolean */) {
                propData.type = 'boolean';
            }
            else if (memberMeta.propType === 4 /* Number */) {
                propData.type = 'number';
            }
            else if (memberMeta.propType === 2 /* String */) {
                propData.type = 'string';
            }
            else if (memberMeta.propType === 1 /* Any */) {
                propData.type = 'any';
            }
            else {
                propData.type = memberMeta.attribType.text;
            }
            if (memberMeta.memberType === 2 /* PropMutable */) {
                propData.mutable = true;
            }
            if (typeof memberMeta.attribName === 'string') {
                propData.attr = memberMeta.attribName;
            }
            propData.docs = getMemberDocumentation(memberMeta.jsdoc);
            jsonCmp.props.push(propData);
        }
        else if (memberMeta.memberType === 6 /* Method */) {
            jsonCmp.methods.push({
                name: memberName,
                docs: getMemberDocumentation(memberMeta.jsdoc)
            });
        }
    });
}
function generateJsDocEvents(cmpMeta, jsonCmp) {
    if (!Array.isArray(cmpMeta.eventsMeta)) {
        return;
    }
    cmpMeta.eventsMeta.sort((a, b) => {
        if (a.eventName.toLowerCase() < b.eventName.toLowerCase())
            return -1;
        if (a.eventName.toLowerCase() > b.eventName.toLowerCase())
            return 1;
        return 0;
    }).forEach(eventMeta => {
        const eventData = {
            event: eventMeta.eventName,
            bubbles: !!eventMeta.eventBubbles,
            cancelable: !!eventMeta.eventCancelable,
            composed: !!eventMeta.eventComposed,
            docs: getMemberDocumentation(eventMeta.jsdoc)
        };
        jsonCmp.events.push(eventData);
    });
}
function generateJsDocCssProps(cmpMeta, jsonCmp) {
    if (!cmpMeta.styleDocs) {
        return;
    }
    cmpMeta.styleDocs.sort((a, b) => {
        if (a.annotation < b.annotation)
            return -1;
        if (a.annotation > b.annotation)
            return 1;
        if (a.name.toLowerCase() < b.name.toLowerCase())
            return -1;
        if (a.name.toLowerCase() > b.name.toLowerCase())
            return 1;
        return 0;
    }).forEach(styleDoc => {
        const cssPropData = {
            annotation: styleDoc.annotation || '',
            name: styleDoc.name,
            docs: styleDoc.docs || ''
        };
        jsonCmp.styles.push(cssPropData);
    });
}

var __awaiter$e = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateReadmes(config, compilerCtx, outputTargets) {
    return __awaiter$e(this, void 0, void 0, function* () {
        const cmpDirectories = [];
        const promises = [];
        const warnings = [];
        const jsonDocs = { components: [] };
        const moduleFiles = Object.keys(compilerCtx.moduleFiles).sort();
        moduleFiles.forEach(filePath => {
            const moduleFile = compilerCtx.moduleFiles[filePath];
            if (!moduleFile.cmpMeta || moduleFile.isCollectionDependency) {
                return;
            }
            const dirPath = config.sys.path.dirname(filePath);
            if (cmpDirectories.includes(dirPath)) {
                if (!warnings.includes(dirPath)) {
                    config.logger.warn(`multiple components found in: ${dirPath}`);
                    warnings.push(dirPath);
                }
            }
            else {
                cmpDirectories.push(dirPath);
                promises.push(genereateReadme(config, compilerCtx, outputTargets, jsonDocs, moduleFile, dirPath));
            }
        });
        yield Promise.all(promises);
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$e(this, void 0, void 0, function* () {
            if (outputTarget.jsonFile) {
                jsonDocs.components = jsonDocs.components.sort((a, b) => {
                    if (a.tag < b.tag)
                        return -1;
                    if (a.tag > b.tag)
                        return 1;
                    return 0;
                });
                const jsonContent = JSON.stringify(jsonDocs, null, 2);
                yield compilerCtx.fs.writeFile(outputTarget.jsonFile, jsonContent);
            }
        })));
    });
}
function genereateReadme(config, compilerCtx, readmeOutputs, jsonDocs, moduleFile, dirPath) {
    return __awaiter$e(this, void 0, void 0, function* () {
        const readMePath = config.sys.path.join(dirPath, 'readme.md');
        let existingContent = null;
        try {
            existingContent = yield compilerCtx.fs.readFile(readMePath);
        }
        catch (e) { }
        if (typeof existingContent === 'string' && existingContent.trim() !== '') {
            // update
            return updateReadme(config, compilerCtx, readmeOutputs, jsonDocs, moduleFile, dirPath, readMePath, existingContent);
        }
        else {
            // create
            return createReadme(config, compilerCtx, readmeOutputs, jsonDocs, moduleFile, dirPath, readMePath);
        }
    });
}
function createReadme(config, compilerCtx, readmeOutputs, jsonDocs, moduleFile, dirPath, readMePath) {
    return __awaiter$e(this, void 0, void 0, function* () {
        const content = [];
        content.push(`# ${moduleFile.cmpMeta.tagNameMeta}`);
        content.push(``);
        content.push(``);
        content.push(``);
        addAutoGenerate(moduleFile.cmpMeta, content);
        const readmeContent = content.join('\n');
        const writeFiles = {};
        yield Promise.all(readmeOutputs.map((readmeOutput) => __awaiter$e(this, void 0, void 0, function* () {
            if (readmeOutput.readmeDir) {
                const relPath = config.sys.path.relative(config.srcDir, readMePath);
                const absPath = config.sys.path.join(readmeOutput.readmeDir, relPath);
                writeFiles[absPath] = readmeContent;
            }
            if (readmeOutput.jsonFile) {
                yield generateJsDocComponent(config, compilerCtx, jsonDocs, moduleFile.cmpMeta, dirPath, '');
            }
        })));
        writeFiles[readMePath] = readmeContent;
        config.logger.info(`created readme docs: ${moduleFile.cmpMeta.tagNameMeta}`);
        yield compilerCtx.fs.writeFiles(writeFiles);
    });
}
function updateReadme(config, compilerCtx, readmeOutputs, jsonDocs, moduleFile, dirPath, readMePath, existingContent) {
    return __awaiter$e(this, void 0, void 0, function* () {
        if (typeof existingContent !== 'string' || existingContent.trim() === '') {
            throw new Error('missing existing content');
        }
        const content = [];
        const existingLines = existingContent.split(/(\r?\n)/);
        let foundAutoGenerate = false;
        for (var i = 0; i < existingLines.length; i++) {
            if (existingLines[i].trim() === AUTO_GENERATE_COMMENT) {
                foundAutoGenerate = true;
                break;
            }
            if (existingLines[i] !== '\n' && existingLines[i] !== '\r') {
                content.push(existingLines[i]);
            }
        }
        if (!foundAutoGenerate) {
            config.logger.warn(`Unable to find ${AUTO_GENERATE_COMMENT} comment for docs auto-generation updates: ${readMePath}`);
            return true;
        }
        const userContent = content.join('\n');
        addAutoGenerate(moduleFile.cmpMeta, content);
        const updatedContent = content.join('\n');
        const writeFiles = {};
        if (updatedContent.trim() !== existingContent.trim()) {
            writeFiles[readMePath] = updatedContent;
            config.logger.info(`updated readme docs: ${moduleFile.cmpMeta.tagNameMeta}`);
        }
        yield Promise.all(readmeOutputs.map((readmeOutput) => __awaiter$e(this, void 0, void 0, function* () {
            if (readmeOutput.readmeDir) {
                const relPath = config.sys.path.relative(config.srcDir, readMePath);
                const absPath = config.sys.path.join(readmeOutput.readmeDir, relPath);
                writeFiles[absPath] = updatedContent;
            }
            if (readmeOutput.jsonFile) {
                yield generateJsDocComponent(config, compilerCtx, jsonDocs, moduleFile.cmpMeta, dirPath, userContent);
            }
        })));
        yield compilerCtx.fs.writeFiles(writeFiles);
        return true;
    });
}

class BuildEvents {
    constructor() {
        this.evCallbacks = {};
    }
    subscribe(eventName, cb) {
        const evName = getEventName(eventName);
        if (!this.evCallbacks[evName]) {
            this.evCallbacks[evName] = [];
        }
        this.evCallbacks[evName].push(cb);
        return () => {
            this.unsubscribe(evName, cb);
        };
    }
    unsubscribe(eventName, cb) {
        const evName = getEventName(eventName);
        if (this.evCallbacks[evName]) {
            const index = this.evCallbacks[evName].indexOf(cb);
            if (index > -1) {
                this.evCallbacks[evName].splice(index, 1);
            }
        }
    }
    unsubscribeAll() {
        this.evCallbacks = {};
    }
    emit(eventName, ...args) {
        const evName = getEventName(eventName);
        const evCallbacks = this.evCallbacks[evName];
        if (evCallbacks) {
            evCallbacks.forEach(cb => {
                try {
                    cb.apply(this, args);
                }
                catch (e) {
                    console.log(e);
                }
            });
        }
    }
}
function getEventName(evName) {
    return evName.trim().toLowerCase();
}

var __awaiter$f = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Cache {
    constructor(config, cacheFs) {
        this.config = config;
        this.cacheFs = cacheFs;
        this.failed = 0;
        this.skip = false;
    }
    initCacheDir() {
        return __awaiter$f(this, void 0, void 0, function* () {
            if (this.config._isTesting) {
                return;
            }
            if (!this.config.enableCache) {
                this.config.logger.info(`cache optimizations disabled`);
                this.clearDiskCache();
                return;
            }
            this.config.logger.debug(`cache enabled, cacheDir: ${this.config.cacheDir}`);
            try {
                const readmeFilePath = this.config.sys.path.join(this.config.cacheDir, '_README.log');
                yield this.cacheFs.writeFile(readmeFilePath, CACHE_DIR_README);
            }
            catch (e) {
                this.config.logger.error(`Cache, initCacheDir: ${e}`);
                this.config.enableCache = false;
            }
        });
    }
    get(key) {
        return __awaiter$f(this, void 0, void 0, function* () {
            if (!this.config.enableCache || this.skip) {
                return null;
            }
            if (this.failed >= MAX_FAILED) {
                if (!this.skip) {
                    this.skip = true;
                    this.config.logger.debug(`cache had ${this.failed} failed ops, skip disk ops for remander of build`);
                }
                return null;
            }
            let result;
            try {
                result = yield this.cacheFs.readFile(this.getCacheFilePath(key));
                this.failed = 0;
                this.skip = false;
            }
            catch (e) {
                this.failed++;
                result = null;
            }
            return result;
        });
    }
    put(key, value) {
        return __awaiter$f(this, void 0, void 0, function* () {
            if (!this.config.enableCache) {
                return false;
            }
            let result;
            try {
                yield this.cacheFs.writeFile(this.getCacheFilePath(key), value);
                result = true;
            }
            catch (e) {
                this.failed++;
                result = false;
            }
            return result;
        });
    }
    createKey(domain, ...args) {
        if (!this.config.enableCache) {
            return '';
        }
        return domain + '_' + this.config.sys.generateContentHash(JSON.stringify(args), 32);
    }
    commit() {
        return __awaiter$f(this, void 0, void 0, function* () {
            if (this.config.enableCache) {
                this.skip = false;
                this.failed = 0;
                yield this.cacheFs.commit();
                yield this.clearExpiredCache();
            }
        });
    }
    clear() {
        this.cacheFs.clearCache();
    }
    clearExpiredCache() {
        return __awaiter$f(this, void 0, void 0, function* () {
            const now = Date.now();
            const lastClear = yield this.config.sys.storage.get(EXP_STORAGE_KEY);
            if (lastClear != null) {
                const diff = now - lastClear;
                if (diff < ONE_DAY) {
                    return;
                }
                const fs = this.cacheFs.disk;
                const cachedFileNames = yield fs.readdirSync(this.config.cacheDir);
                const cachedFilePaths = cachedFileNames.map(f => this.config.sys.path.join(this.config.cacheDir, f));
                let totalCleared = 0;
                const promises = cachedFilePaths.map((filePath) => __awaiter$f(this, void 0, void 0, function* () {
                    const stat = yield fs.stat(filePath);
                    const lastModified = stat.mtime.getTime();
                    const diff = now - lastModified;
                    if (diff > ONE_WEEK) {
                        yield fs.unlink(filePath);
                        totalCleared++;
                    }
                }));
                yield Promise.all(promises);
                this.config.logger.debug(`clearExpiredCache, cachedFileNames: ${cachedFileNames.length}, totalCleared: ${totalCleared}`);
            }
            this.config.logger.debug(`clearExpiredCache, set last clear`);
            yield this.config.sys.storage.set(EXP_STORAGE_KEY, now);
        });
    }
    clearDiskCache() {
        return __awaiter$f(this, void 0, void 0, function* () {
            if (yield this.cacheFs.access(this.config.cacheDir)) {
                yield this.cacheFs.remove(this.config.cacheDir);
                yield this.cacheFs.commit();
            }
        });
    }
    getCacheFilePath(key) {
        return this.config.sys.path.join(this.config.cacheDir, key) + '.log';
    }
    getMemoryStats() {
        return this.cacheFs.getMemoryStats();
    }
}
const MAX_FAILED = 100;
const ONE_DAY = 1000 * 60 * 60 * 24;
const ONE_WEEK = ONE_DAY * 7;
const EXP_STORAGE_KEY = `last_clear_expired_cache`;
const CACHE_DIR_README = `# Stencil Cache Directory

This directory contains files which the compiler has
cached for faster builds. To disable caching, please set
"enableCache: false" within the stencil.config.js file.

To change the cache directory, please update the
"cacheDir" property within the stencil.config.js file.
`;

var __awaiter$g = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class InMemoryFileSystem {
    constructor(disk, sys) {
        this.disk = disk;
        this.sys = sys;
        this.items = {};
    }
    accessData(filePath) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const item = this.getItem(filePath);
            const data = {
                exists: false,
                isDirectory: false,
                isFile: false
            };
            if (typeof item.exists === 'boolean') {
                data.exists = item.exists;
                data.isDirectory = item.isDirectory;
                data.isFile = item.isFile;
                return data;
            }
            try {
                const s = yield this.stat(filePath);
                item.exists = true;
                item.isDirectory = s.isDirectory;
                item.isFile = s.isFile;
                data.exists = item.exists;
                data.isDirectory = item.isDirectory;
                data.isFile = item.isFile;
            }
            catch (e) {
                item.exists = false;
            }
            return data;
        });
    }
    access(filePath) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const data = yield this.accessData(filePath);
            return data.exists;
        });
    }
    /**
     * Synchronous!!! Do not use!!!
     * (Only typescript transpiling is allowed to use)
     * @param filePath
     */
    accessSync(filePath) {
        const item = this.getItem(filePath);
        if (typeof item.exists === 'boolean') {
            return item.exists;
        }
        let hasAccess = false;
        try {
            const s = this.statSync(filePath);
            item.exists = true;
            item.isDirectory = s.isDirectory;
            item.isFile = s.isFile;
            hasAccess = true;
        }
        catch (e) {
            item.exists = false;
        }
        return hasAccess;
    }
    emptyDir(dirPath) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const item = this.getItem(dirPath);
            yield this.removeDir(dirPath);
            item.isFile = false;
            item.isDirectory = true;
            item.queueWriteToDisk = true;
            item.queueDeleteFromDisk = false;
        });
    }
    readdir(dirPath, opts = {}) {
        return __awaiter$g(this, void 0, void 0, function* () {
            dirPath = normalizePath(dirPath);
            const collectedPaths = [];
            if (opts.inMemoryOnly) {
                let inMemoryDir = dirPath;
                if (!inMemoryDir.endsWith('/')) {
                    inMemoryDir += '/';
                }
                const inMemoryDirs = dirPath.split('/');
                const filePaths = Object.keys(this.items);
                filePaths.forEach(filePath => {
                    if (!filePath.startsWith(dirPath)) {
                        return;
                    }
                    const parts = filePath.split('/');
                    if (parts.length === inMemoryDirs.length + 1 || (opts.recursive && parts.length > inMemoryDirs.length)) {
                        const d = this.items[filePath];
                        if (d.exists) {
                            const item = {
                                absPath: filePath,
                                relPath: parts[inMemoryDirs.length],
                                isDirectory: d.isDirectory,
                                isFile: d.isFile
                            };
                            collectedPaths.push(item);
                        }
                    }
                });
            }
            else {
                // always a disk read
                yield this.readDirectory(dirPath, dirPath, opts, collectedPaths);
            }
            return collectedPaths.sort((a, b) => {
                if (a.absPath < b.absPath)
                    return -1;
                if (a.absPath > b.absPath)
                    return 1;
                return 0;
            });
        });
    }
    readDirectory(initPath, dirPath, opts, collectedPaths) {
        return __awaiter$g(this, void 0, void 0, function* () {
            // used internally only so we could easily recursively drill down
            // loop through this directory and sub directories
            // always a disk read!!
            const dirItems = yield this.disk.readdir(dirPath);
            // cache some facts about this path
            const item = this.getItem(dirPath);
            item.exists = true;
            item.isFile = false;
            item.isDirectory = true;
            yield Promise.all(dirItems.map((dirItem) => __awaiter$g(this, void 0, void 0, function* () {
                // let's loop through each of the files we've found so far
                // create an absolute path of the item inside of this directory
                const absPath = normalizePath(this.sys.path.join(dirPath, dirItem));
                const relPath = normalizePath(this.sys.path.relative(initPath, absPath));
                // get the fs stats for the item, could be either a file or directory
                const stats = yield this.stat(absPath);
                // cache some stats about this path
                const subItem = this.getItem(absPath);
                subItem.exists = true;
                subItem.isDirectory = stats.isDirectory;
                subItem.isFile = stats.isFile;
                collectedPaths.push({
                    absPath: absPath,
                    relPath: relPath,
                    isDirectory: stats.isDirectory,
                    isFile: stats.isFile
                });
                if (opts.recursive && stats.isDirectory) {
                    // looks like it's yet another directory
                    // let's keep drilling down
                    yield this.readDirectory(initPath, absPath, opts, collectedPaths);
                }
            })));
        });
    }
    readFile(filePath, opts) {
        return __awaiter$g(this, void 0, void 0, function* () {
            if (!opts || (opts.useCache === true || opts.useCache === undefined)) {
                const item = this.getItem(filePath);
                if (item.exists && typeof item.fileText === 'string') {
                    return item.fileText;
                }
            }
            const fileContent = yield this.disk.readFile(filePath);
            const item = this.getItem(filePath);
            if (fileContent.length < MAX_TEXT_CACHE) {
                item.exists = true;
                item.isFile = true;
                item.isDirectory = false;
                item.fileText = fileContent;
            }
            return fileContent;
        });
    }
    /**
     * Synchronous!!! Do not use!!!
     * (Only typescript transpiling is allowed to use)
     * @param filePath
     */
    readFileSync(filePath, opts) {
        if (!opts || (opts.useCache === true || opts.useCache === undefined)) {
            const item = this.getItem(filePath);
            if (item.exists && typeof item.fileText === 'string') {
                return item.fileText;
            }
        }
        const fileContent = this.disk.readFileSync(filePath);
        const item = this.getItem(filePath);
        if (fileContent.length < MAX_TEXT_CACHE) {
            item.exists = true;
            item.isFile = true;
            item.isDirectory = false;
            item.fileText = fileContent;
        }
        return fileContent;
    }
    remove(itemPath) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const stats = yield this.stat(itemPath);
            if (stats.isDirectory) {
                yield this.removeDir(itemPath);
            }
            else if (stats.isFile) {
                yield this.removeItem(itemPath);
            }
        });
    }
    removeDir(dirPath) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const item = this.getItem(dirPath);
            item.isFile = false;
            item.isDirectory = true;
            if (!item.queueWriteToDisk) {
                item.queueDeleteFromDisk = true;
            }
            try {
                const dirItems = yield this.readdir(dirPath, { recursive: true });
                yield Promise.all(dirItems.map((item) => __awaiter$g(this, void 0, void 0, function* () {
                    yield this.removeItem(item.absPath);
                })));
            }
            catch (e) {
                // do not throw error if the directory never existed
            }
        });
    }
    removeItem(filePath) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const item = this.getItem(filePath);
            if (!item.queueWriteToDisk) {
                item.queueDeleteFromDisk = true;
            }
        });
    }
    stat(itemPath) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const item = this.getItem(itemPath);
            if (typeof item.isDirectory !== 'boolean' || typeof item.isFile !== 'boolean') {
                const s = yield this.disk.stat(itemPath);
                item.exists = true;
                item.isDirectory = s.isDirectory();
                item.isFile = s.isFile();
                item.size = s.size;
            }
            return {
                exists: !!item.exists,
                isFile: !!item.isFile,
                isDirectory: !!item.isDirectory,
                size: typeof item.size === 'number' ? item.size : 0
            };
        });
    }
    /**
     * Synchronous!!! Do not use!!!
     * (Only typescript transpiling is allowed to use)
     * @param itemPath
     */
    statSync(itemPath) {
        const item = this.getItem(itemPath);
        if (typeof item.isDirectory !== 'boolean' || typeof item.isFile !== 'boolean') {
            const s = this.disk.statSync(itemPath);
            item.exists = true;
            item.isDirectory = s.isDirectory();
            item.isFile = s.isFile();
        }
        return {
            isFile: item.isFile,
            isDirectory: item.isDirectory
        };
    }
    writeFile(filePath, content, opts) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const results = {};
            if (typeof filePath !== 'string') {
                throw new Error(`writeFile, invalid filePath: ${filePath}`);
            }
            if (typeof content !== 'string') {
                throw new Error(`writeFile, invalid content: ${filePath}`);
            }
            if (shouldIgnore$1(filePath)) {
                results.ignored = true;
                return results;
            }
            const item = this.getItem(filePath);
            item.exists = true;
            item.isFile = true;
            item.isDirectory = false;
            item.queueDeleteFromDisk = false;
            results.changedContent = item.fileText !== content;
            results.queuedWrite = false;
            item.fileText = content;
            if (opts && opts.useCache === false) {
                item.useCache = false;
            }
            if (opts && opts.inMemoryOnly) {
                // we don't want to actually write this to disk
                // just keep it in memory
                if (item.queueWriteToDisk) {
                    // we already queued this file to write to disk
                    // in that case we still need to do it
                    results.queuedWrite = true;
                }
                else {
                    // we only want this in memory and
                    // it wasn't already queued to be written
                    item.queueWriteToDisk = false;
                }
            }
            else if (opts && opts.immediateWrite) {
                // If this is an immediate write then write the file
                // and do not add it to the queue
                yield this.disk.writeFile(filePath, item.fileText);
            }
            else {
                // we want to write this to disk (eventually)
                // but only if the content is different
                // from our existing cached content
                if (!item.queueWriteToDisk && results.changedContent) {
                    // not already queued to be written
                    // and the content is different
                    item.queueWriteToDisk = true;
                    results.queuedWrite = true;
                }
            }
            return results;
        });
    }
    writeFiles(files, opts) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const writtenFiles = yield Promise.all(Object.keys(files).map((filePath) => __awaiter$g(this, void 0, void 0, function* () {
                const writtenFile = yield this.writeFile(filePath, files[filePath], opts);
                return writtenFile;
            })));
            return writtenFiles;
        });
    }
    commit() {
        return __awaiter$g(this, void 0, void 0, function* () {
            const instructions = getCommitInstructions(this.sys.path, this.items);
            // ensure directories we need exist
            const dirsAdded = yield this.commitEnsureDirs(instructions.dirsToEnsure);
            // write all queued the files
            const filesWritten = yield this.commitWriteFiles(instructions.filesToWrite);
            // remove all the queued files to be deleted
            const filesDeleted = yield this.commitDeleteFiles(instructions.filesToDelete);
            // remove all the queued dirs to be deleted
            const dirsDeleted = yield this.commitDeleteDirs(instructions.dirsToDelete);
            instructions.filesToDelete.forEach(fileToDelete => {
                this.clearFileCache(fileToDelete);
            });
            instructions.dirsToDelete.forEach(dirToDelete => {
                this.clearDirCache(dirToDelete);
            });
            // return only the files that were
            return {
                filesWritten: filesWritten,
                filesDeleted: filesDeleted,
                dirsDeleted: dirsDeleted,
                dirsAdded: dirsAdded
            };
        });
    }
    commitEnsureDirs(dirsToEnsure) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const dirsAdded = [];
            for (const dirPath of dirsToEnsure) {
                const item = this.getItem(dirPath);
                if (item.exists && item.isDirectory) {
                    // already cached that this path is indeed an existing directory
                    continue;
                }
                try {
                    // cache that we know this is a directory on disk
                    item.exists = true;
                    item.isDirectory = true;
                    item.isFile = false;
                    yield this.disk.mkdir(dirPath);
                    dirsAdded.push(dirPath);
                }
                catch (e) { }
            }
            return dirsAdded;
        });
    }
    commitWriteFiles(filesToWrite) {
        const writtenFiles = Promise.all(filesToWrite.map((filePath) => __awaiter$g(this, void 0, void 0, function* () {
            if (typeof filePath !== 'string') {
                throw new Error(`unable to writeFile without filePath`);
            }
            return this.commitWriteFile(filePath);
        })));
        return writtenFiles;
    }
    commitWriteFile(filePath) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const item = this.getItem(filePath);
            if (item.fileText == null) {
                throw new Error(`unable to find item fileText to write: ${filePath}`);
            }
            yield this.disk.writeFile(filePath, item.fileText);
            if (item.useCache === false) {
                this.clearFileCache(filePath);
            }
            return filePath;
        });
    }
    commitDeleteFiles(filesToDelete) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const deletedFiles = yield Promise.all(filesToDelete.map((filePath) => __awaiter$g(this, void 0, void 0, function* () {
                if (typeof filePath !== 'string') {
                    throw new Error(`unable to unlink without filePath`);
                }
                yield this.disk.unlink(filePath);
                return filePath;
            })));
            return deletedFiles;
        });
    }
    commitDeleteDirs(dirsToDelete) {
        return __awaiter$g(this, void 0, void 0, function* () {
            const dirsDeleted = [];
            for (const dirPath of dirsToDelete) {
                try {
                    yield this.disk.rmdir(dirPath);
                }
                catch (e) { }
                dirsDeleted.push(dirPath);
            }
            return dirsDeleted;
        });
    }
    clearDirCache(dirPath) {
        dirPath = normalizePath(dirPath);
        const filePaths = Object.keys(this.items);
        filePaths.forEach(f => {
            const filePath = this.sys.path.relative(dirPath, f).split('/')[0];
            if (!filePath.startsWith('.') && !filePath.startsWith('/')) {
                this.clearFileCache(f);
            }
        });
    }
    clearFileCache(filePath) {
        filePath = normalizePath(filePath);
        const item = this.items[filePath];
        if (item && !item.queueWriteToDisk) {
            delete this.items[filePath];
        }
    }
    cancelDeleteFilesFromDisk(filePaths) {
        filePaths.forEach(filePath => {
            const item = this.getItem(filePath);
            if (item.isFile && item.queueDeleteFromDisk) {
                item.queueDeleteFromDisk = false;
            }
        });
    }
    cancelDeleteDirectoriesFromDisk(dirPaths) {
        dirPaths.forEach(dirPath => {
            const item = this.getItem(dirPath);
            if (item.queueDeleteFromDisk) {
                item.queueDeleteFromDisk = false;
            }
        });
    }
    getItem(itemPath) {
        itemPath = normalizePath(itemPath);
        const item = this.items[itemPath];
        if (item) {
            return item;
        }
        return this.items[itemPath] = {};
    }
    clearCache() {
        this.items = {};
    }
    get keys() {
        return Object.keys(this.items).sort();
    }
    getMemoryStats() {
        return `data length: ${Object.keys(this.items).length}`;
    }
}
function getCommitInstructions(path$$1, d) {
    const instructions = {
        filesToDelete: [],
        filesToWrite: [],
        dirsToDelete: [],
        dirsToEnsure: []
    };
    Object.keys(d).forEach(itemPath => {
        const item = d[itemPath];
        if (item.queueWriteToDisk) {
            if (item.isFile) {
                instructions.filesToWrite.push(itemPath);
                const dir = normalizePath(path$$1.dirname(itemPath));
                if (!instructions.dirsToEnsure.includes(dir)) {
                    instructions.dirsToEnsure.push(dir);
                }
                const dirDeleteIndex = instructions.dirsToDelete.indexOf(dir);
                if (dirDeleteIndex > -1) {
                    instructions.dirsToDelete.splice(dirDeleteIndex, 1);
                }
                const fileDeleteIndex = instructions.filesToDelete.indexOf(itemPath);
                if (fileDeleteIndex > -1) {
                    instructions.filesToDelete.splice(fileDeleteIndex, 1);
                }
            }
            else if (item.isDirectory) {
                if (!instructions.dirsToEnsure.includes(itemPath)) {
                    instructions.dirsToEnsure.push(itemPath);
                }
                const dirDeleteIndex = instructions.dirsToDelete.indexOf(itemPath);
                if (dirDeleteIndex > -1) {
                    instructions.dirsToDelete.splice(dirDeleteIndex, 1);
                }
            }
        }
        else if (item.queueDeleteFromDisk) {
            if (item.isDirectory && !instructions.dirsToEnsure.includes(itemPath)) {
                instructions.dirsToDelete.push(itemPath);
            }
            else if (item.isFile && !instructions.filesToWrite.includes(itemPath)) {
                instructions.filesToDelete.push(itemPath);
            }
        }
        item.queueDeleteFromDisk = false;
        item.queueWriteToDisk = false;
    });
    // add all the ancestor directories for each directory too
    for (let i = 0, ilen = instructions.dirsToEnsure.length; i < ilen; i++) {
        const segments = instructions.dirsToEnsure[i].split('/');
        for (let j = 2; j < segments.length; j++) {
            const dir = segments.slice(0, j).join('/');
            if (!instructions.dirsToEnsure.includes(dir)) {
                instructions.dirsToEnsure.push(dir);
            }
        }
    }
    // sort directories so shortest paths are ensured first
    instructions.dirsToEnsure.sort((a, b) => {
        const segmentsA = a.split('/').length;
        const segmentsB = b.split('/').length;
        if (segmentsA < segmentsB)
            return -1;
        if (segmentsA > segmentsB)
            return 1;
        if (a.length < b.length)
            return -1;
        if (a.length > b.length)
            return 1;
        return 0;
    });
    // sort directories so longest paths are removed first
    instructions.dirsToDelete.sort((a, b) => {
        const segmentsA = a.split('/').length;
        const segmentsB = b.split('/').length;
        if (segmentsA < segmentsB)
            return 1;
        if (segmentsA > segmentsB)
            return -1;
        if (a.length < b.length)
            return 1;
        if (a.length > b.length)
            return -1;
        return 0;
    });
    instructions.dirsToEnsure.forEach(dirToEnsure => {
        const i = instructions.dirsToDelete.indexOf(dirToEnsure);
        if (i > -1) {
            instructions.dirsToDelete.splice(i, 1);
        }
    });
    instructions.dirsToDelete = instructions.dirsToDelete.filter(dir => {
        if (dir === '/' || dir.endsWith(':/')) {
            return false;
        }
        return true;
    });
    instructions.dirsToEnsure = instructions.dirsToEnsure.filter(dir => {
        if (d[dir] && d[dir].exists && d[dir].isDirectory) {
            return false;
        }
        if (dir === '/' || dir.endsWith(':/')) {
            return false;
        }
        return true;
    });
    return instructions;
}
function shouldIgnore$1(filePath) {
    filePath = filePath.trim().toLowerCase();
    return IGNORE.some(ignoreFile => filePath.endsWith(ignoreFile));
}
const IGNORE = [
    '.ds_store',
    '.gitignore',
    'desktop.ini',
    'thumbs.db'
];
// only cache if it's less than 5MB-ish (using .length as a rough guess)
// why 5MB? idk, seems like a good number for source text
// it's pretty darn large to cover almost ALL legitimate source files
// and anything larger is probably a REALLY large file and a rare case
// which we don't need to eat up memory for
const MAX_TEXT_CACHE = 5242880;

function getModuleFile(compilerCtx, sourceFilePath) {
    sourceFilePath = normalizePath(sourceFilePath);
    return compilerCtx.moduleFiles[sourceFilePath] = compilerCtx.moduleFiles[sourceFilePath] || {
        sourceFilePath: sourceFilePath,
        localImports: [],
        externalImports: [],
        potentialCmpRefs: []
    };
}
function getCompilerCtx(config, compilerCtx) {
    // reusable data between builds
    compilerCtx = compilerCtx || {};
    compilerCtx.isActivelyBuilding = false;
    compilerCtx.fs = compilerCtx.fs || new InMemoryFileSystem(config.sys.fs, config.sys);
    if (!compilerCtx.cache) {
        compilerCtx.cache = new Cache(config, new InMemoryFileSystem(config.sys.fs, config.sys));
        compilerCtx.cache.initCacheDir();
    }
    compilerCtx.events = compilerCtx.events || new BuildEvents();
    compilerCtx.appFiles = compilerCtx.appFiles || {};
    compilerCtx.moduleFiles = compilerCtx.moduleFiles || {};
    compilerCtx.collections = compilerCtx.collections || [];
    compilerCtx.resolvedCollections = compilerCtx.resolvedCollections || [];
    compilerCtx.compiledModuleJsText = compilerCtx.compiledModuleJsText || {};
    compilerCtx.compiledModuleLegacyJsText = compilerCtx.compiledModuleLegacyJsText || {};
    compilerCtx.lastBuildStyles = compilerCtx.lastBuildStyles || new Map();
    compilerCtx.cachedStyleMeta = compilerCtx.cachedStyleMeta || new Map();
    compilerCtx.lastComponentStyleInput = compilerCtx.lastComponentStyleInput || new Map();
    if (typeof compilerCtx.activeBuildId !== 'number') {
        compilerCtx.activeBuildId = -1;
    }
    return compilerCtx;
}
function resetCompilerCtx(compilerCtx) {
    compilerCtx.fs.clearCache();
    compilerCtx.cache.clear();
    compilerCtx.appFiles = {};
    compilerCtx.moduleFiles = {};
    compilerCtx.collections.length = 0;
    compilerCtx.resolvedCollections.length = 0;
    compilerCtx.compiledModuleJsText = {};
    compilerCtx.compiledModuleLegacyJsText = {};
    compilerCtx.compilerOptions = null;
    compilerCtx.cachedStyleMeta.clear();
    compilerCtx.lastComponentStyleInput.clear();
    compilerCtx.tsService = null;
    compilerCtx.rootTsFiles = null;
    // do NOT reset 'hasSuccessfulBuild'
}

var __awaiter$h = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateComponentTypes(config, compilerCtx, buildCtx) {
    return __awaiter$h(this, void 0, void 0, function* () {
        // only gather components that are still root ts files we've found and have component metadata
        // the compilerCtx cache may still have files that may have been deleted/renamed
        const metadata = compilerCtx.rootTsFiles
            .slice()
            .sort()
            .map(tsFilePath => compilerCtx.moduleFiles[tsFilePath])
            .filter(moduleFile => moduleFile && moduleFile.cmpMeta);
        // Generate d.ts files for component types
        let componentTypesFileContent = yield generateComponentTypesFile(config, compilerCtx, metadata);
        // get all the output targets that require types
        const typesOutputTargets = config.outputTargets.filter(o => !!o.typesDir);
        if (typesOutputTargets.length > 0) {
            // we're building a dist output target(s)
            // so let's also add the types for the defineCustomElements
            componentTypesFileContent = appendDefineCustomElementsType(componentTypesFileContent);
        }
        // immediately write the components.d.ts file to disk and put it into fs memory
        const componentsDtsSrcFilePath = getComponentsDtsSrcFilePath(config);
        yield compilerCtx.fs.writeFile(componentsDtsSrcFilePath, componentTypesFileContent, { immediateWrite: true });
        buildCtx.debug(`generated ${config.sys.path.relative(config.rootDir, componentsDtsSrcFilePath)}`);
    });
}
/**
 * Generate the component.d.ts file that contains types for all components
 * @param config the project build configuration
 * @param options compiler options from tsconfig
 */
function generateComponentTypesFile(config, compilerCtx, metadata) {
    return __awaiter$h(this, void 0, void 0, function* () {
        let typeImportData = {};
        const allTypes = {};
        const collectionTypesImports = yield getCollectionsTypeImports(config, compilerCtx);
        const modules = metadata.map(moduleFile => {
            const cmpMeta = moduleFile.cmpMeta;
            const importPath = normalizePath(config.sys.path.relative(config.srcDir, moduleFile.sourceFilePath)
                .replace(/\.(tsx|ts)$/, ''));
            typeImportData = updateReferenceTypeImports(config, typeImportData, allTypes, cmpMeta, moduleFile.sourceFilePath);
            return createTypesAsString(cmpMeta, importPath);
        });
        const componentsFileString = `
declare global {
  interface HTMLElement {
    componentOnReady?: () => Promise<this | null>;
  }

  interface HTMLStencilElement extends HTMLElement {
    componentOnReady(): Promise<this>;

    forceUpdate(): void;
  }

  interface HTMLAttributes {}

  namespace StencilComponents {
${modules.map(m => m.StencilComponents).join('\n')}
  }

${modules.map(m => m.global).join('\n')}

  namespace JSX {
    interface Element {}
    export interface IntrinsicElements {
${modules.map(m => m.IntrinsicElements).join('\n')}
    }
  }

  namespace JSXElements {
${modules.map(m => m.JSXElements).join('\n')}
  }

  interface HTMLElementTagNameMap {
${modules.map(m => m.HTMLElementTagNameMap).join('\n')}
  }

  interface ElementTagNameMap {
${modules.map(m => m.ElementTagNameMap).join('\n')}
  }
}`;
        const typeImportString = Object.keys(typeImportData).reduce((finalString, filePath) => {
            const typeData = typeImportData[filePath];
            let importFilePath;
            if (config.sys.path.isAbsolute(filePath)) {
                importFilePath = normalizePath('./' +
                    config.sys.path.relative(config.srcDir, filePath)).replace(/\.(tsx|ts)$/, '');
            }
            else {
                importFilePath = filePath;
            }
            finalString +=
                `import {
${typeData.sort(sortImportNames).map(td => {
                    if (td.localName === td.importName) {
                        return `  ${td.importName},`;
                    }
                    else {
                        return `  ${td.localName} as ${td.importName},`;
                    }
                }).join('\n')}
} from '${importFilePath}';\n`;
            return finalString;
        }, '');
        const finalJSX = (componentsFileString.includes('namespace JSX'))
            ? `declare global { namespace JSX { interface StencilJSX {} } }\n`
            : '';
        return `/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
/* tslint:disable */

import '@stencil/core';

${collectionTypesImports}
${typeImportString}
${componentsFileString}
${finalJSX}
`;
    });
}
function sortImportNames(a, b) {
    const aName = a.localName.toLowerCase();
    const bName = b.localName.toLowerCase();
    if (aName < bName)
        return -1;
    if (aName > bName)
        return 1;
    if (a.localName < b.localName)
        return -1;
    if (a.localName > b.localName)
        return 1;
    return 0;
}
/**
 * Find all referenced types by a component and add them to the importDataObj and return the newly
 * updated importDataObj
 *
 * @param importDataObj key/value of type import file, each value is an array of imported types
 * @param cmpMeta the metadata for the component that is referencing the types
 * @param filePath the path of the component file
 * @param config general config that all of stencil uses
 */
function updateReferenceTypeImports(config, importDataObj, allTypes, cmpMeta, filePath) {
    const updateImportReferences = updateImportReferenceFactory(config, allTypes, filePath);
    importDataObj = Object.keys(cmpMeta.membersMeta)
        .filter((memberName) => {
        const member = cmpMeta.membersMeta[memberName];
        return [1 /* Prop */, 2 /* PropMutable */, 6 /* Method */].indexOf(member.memberType) !== -1 &&
            member.attribType.typeReferences;
    })
        .reduce((obj, memberName) => {
        const member = cmpMeta.membersMeta[memberName];
        return updateImportReferences(obj, member.attribType.typeReferences);
    }, importDataObj);
    cmpMeta.eventsMeta
        .filter((meta) => {
        return meta.eventType && meta.eventType.typeReferences;
    })
        .reduce((obj, meta) => {
        return updateImportReferences(obj, meta.eventType.typeReferences);
    }, importDataObj);
    return importDataObj;
}
function updateImportReferenceFactory(config, allTypes, filePath) {
    function getIncrememntTypeName(name) {
        if (allTypes[name] == null) {
            allTypes[name] = 1;
            return name;
        }
        allTypes[name] += 1;
        return `${name}${allTypes[name]}`;
    }
    return (obj, typeReferences) => {
        Object.keys(typeReferences).map(typeName => {
            return [typeName, typeReferences[typeName]];
        }).forEach(([typeName, type]) => {
            let importFileLocation;
            // If global then there is no import statement needed
            if (type.referenceLocation === 'global') {
                return;
                // If local then import location is the current file
            }
            else if (type.referenceLocation === 'local') {
                importFileLocation = filePath;
            }
            else if (type.referenceLocation === 'import') {
                importFileLocation = type.importReferenceLocation;
            }
            // If this is a relative path make it absolute
            if (importFileLocation.startsWith('.')) {
                importFileLocation =
                    config.sys.path.resolve(config.sys.path.dirname(filePath), importFileLocation);
            }
            obj[importFileLocation] = obj[importFileLocation] || [];
            // If this file already has a reference to this type move on
            if (obj[importFileLocation].find(df => df.localName === typeName)) {
                return;
            }
            const newTypeName = getIncrememntTypeName(typeName);
            obj[importFileLocation].push({
                localName: typeName,
                importName: newTypeName
            });
        });
        return obj;
    };
}
/**
 * Generate a string based on the types that are defined within a component.
 *
 * @param cmpMeta the metadata for the component that a type definition string is generated for
 * @param importPath the path of the component file
 */
function createTypesAsString(cmpMeta, _importPath) {
    const tagName = cmpMeta.tagNameMeta;
    const tagNameAsPascal = dashToPascalCase(cmpMeta.tagNameMeta);
    const interfaceName = `HTML${tagNameAsPascal}Element`;
    const jsxInterfaceName = `${tagNameAsPascal}Attributes`;
    const propAttributes = membersToPropAttributes(cmpMeta.membersMeta);
    const methodAttributes = membersToMethodAttributes(cmpMeta.membersMeta);
    const eventAttributes = membersToEventAttributes(cmpMeta.eventsMeta);
    return {
        StencilComponents: `
    interface ${tagNameAsPascal} {
${attributesToMultiLineString(Object.assign({}, propAttributes, methodAttributes), false, '      ')}
    }`,
        JSXElements: `
    export interface ${jsxInterfaceName} extends HTMLAttributes {
${attributesToMultiLineString(Object.assign({}, propAttributes, eventAttributes), true, '      ')}
    }`,
        global: `
    interface ${interfaceName} extends StencilComponents.${tagNameAsPascal}, HTMLStencilElement {}

    var ${interfaceName}: {
      prototype: ${interfaceName};
      new (): ${interfaceName};
    };
    `,
        HTMLElementTagNameMap: `    '${tagName}': ${interfaceName}`,
        ElementTagNameMap: `    '${tagName}': ${interfaceName};`,
        IntrinsicElements: `    '${tagName}': JSXElements.${jsxInterfaceName};`
    };
}
function attributesToMultiLineString(attributes, optional = true, paddingString) {
    return Object.keys(attributes)
        .sort()
        .reduce((fullList, key) => {
        if (attributes[key].jsdoc) {
            fullList.push(`/**`);
            fullList.push(` * ${attributes[key].jsdoc.replace(/\r?\n|\r/g, ' ')}`);
            fullList.push(` */`);
        }
        fullList.push(`'${key}'${optional ? '?' : ''}: ${attributes[key].type};`);
        return fullList;
    }, [])
        .map(item => `${paddingString}${item}`)
        .join(`\n`);
}
function membersToPropAttributes(membersMeta) {
    const interfaceData = Object.keys(membersMeta)
        .filter((memberName) => {
        return [1 /* Prop */, 2 /* PropMutable */].indexOf(membersMeta[memberName].memberType) !== -1;
    })
        .reduce((obj, memberName) => {
        const member = membersMeta[memberName];
        obj[memberName] = {
            type: member.attribType.text,
        };
        if (member.jsdoc) {
            obj[memberName].jsdoc = member.jsdoc.documentation;
        }
        return obj;
    }, {});
    return interfaceData;
}
function membersToMethodAttributes(membersMeta) {
    const interfaceData = Object.keys(membersMeta)
        .filter((memberName) => {
        return [6 /* Method */].indexOf(membersMeta[memberName].memberType) !== -1;
    })
        .reduce((obj, memberName) => {
        const member = membersMeta[memberName];
        obj[memberName] = {
            type: member.attribType.text,
        };
        if (member.jsdoc) {
            obj[memberName].jsdoc = member.jsdoc.documentation;
        }
        return obj;
    }, {});
    return interfaceData;
}
function membersToEventAttributes(eventMetaList) {
    const interfaceData = eventMetaList
        .reduce((obj, eventMetaObj) => {
        const memberName = `on${captializeFirstLetter(eventMetaObj.eventName)}`;
        const eventType = (eventMetaObj.eventType) ? `CustomEvent<${eventMetaObj.eventType.text}>` : `CustomEvent`;
        obj[memberName] = {
            type: `(event: ${eventType}) => void`,
        };
        if (eventMetaObj.jsdoc) {
            obj[memberName].jsdoc = eventMetaObj.jsdoc.documentation;
        }
        return obj;
    }, {});
    return interfaceData;
}
function getCollectionsTypeImports(config, compilerCtx) {
    return __awaiter$h(this, void 0, void 0, function* () {
        const collections = compilerCtx.collections.map(collection => {
            return getCollectionTypesImport(config, compilerCtx, collection);
        });
        const collectionTypes = yield Promise.all(collections);
        if (collectionTypes.length > 0) {
            return `${collectionTypes.join('\n')}\n\n`;
        }
        return '';
    });
}
function getCollectionTypesImport(config, compilerCtx, collection) {
    return __awaiter$h(this, void 0, void 0, function* () {
        let typeImport = '';
        try {
            const collectionDir = collection.moduleDir;
            const collectionPkgJson = config.sys.path.join(collectionDir, 'package.json');
            const pkgJsonStr = yield compilerCtx.fs.readFile(collectionPkgJson);
            const pkgData = JSON.parse(pkgJsonStr);
            if (pkgData.types && pkgData.collection) {
                typeImport = `import '${pkgData.name}';`;
            }
        }
        catch (e) {
            config.logger.debug(`getCollectionTypesImport: ${e}`);
        }
        if (typeImport === '') {
            config.logger.debug(`unabled to find "${collection.collectionName}" collection types`);
        }
        return typeImport;
    });
}

var __awaiter$i = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function writeAppCollections(config, compilerCtx, buildCtx) {
    return __awaiter$i(this, void 0, void 0, function* () {
        const outputTargets = config.outputTargets.filter(o => o.collectionDir);
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$i(this, void 0, void 0, function* () {
            yield writeAppCollection(config, compilerCtx, buildCtx, outputTarget);
        })));
    });
}
// this maps the json data to our internal data structure
// apping is so that the internal data structure "could"
// change, but the external user data will always use the same api
// over the top lame mapping functions is basically so we can loosly
// couple core component meta data between specific versions of the compiler
function writeAppCollection(config, compilerCtx, buildCtx, outputTarget) {
    return __awaiter$i(this, void 0, void 0, function* () {
        // get the absolute path to the directory where the collection will be saved
        const collectionDir = normalizePath(outputTarget.collectionDir);
        // create an absolute file path to the actual collection json file
        const collectionFilePath = normalizePath(config.sys.path.join(collectionDir, COLLECTION_MANIFEST_FILE_NAME));
        // serialize the collection into a json string and
        // add it to the list of files we need to write when we're ready
        const collectionData = serializeAppCollection(config, compilerCtx, collectionDir, buildCtx.entryModules, buildCtx.global);
        // don't bother serializing/writing the collection if we're not creating a distribution
        yield compilerCtx.fs.writeFile(collectionFilePath, JSON.stringify(collectionData, null, 2));
    });
}
function serializeAppCollection(config, compilerCtx, collectionDir, entryModules, globalModule) {
    // create the single collection we're going to fill up with data
    const collectionData = {
        components: [],
        collections: serializeCollectionDependencies(compilerCtx),
        compiler: {
            name: config.sys.compiler.name,
            version: config.sys.compiler.version,
            typescriptVersion: config.sys.compiler.typescriptVersion
        },
        bundles: []
    };
    // add component data for each of the collection files
    entryModules.forEach(entryModule => {
        entryModule.moduleFiles.forEach(moduleFile => {
            const cmpData = serializeComponent(config, collectionDir, moduleFile);
            if (cmpData) {
                collectionData.components.push(cmpData);
            }
        });
    });
    // sort it alphabetically, cuz
    collectionData.components.sort((a, b) => {
        if (a.tag < b.tag)
            return -1;
        if (a.tag > b.tag)
            return 1;
        return 0;
    });
    // set the global path if it exists
    serializeAppGlobal(config, collectionDir, collectionData, globalModule);
    serializeBundles(config, collectionData);
    // success!
    return collectionData;
}
function serializeCollectionDependencies(compilerCtx) {
    const collectionDeps = compilerCtx.collections.map(c => {
        const collectionDeps = {
            name: c.collectionName,
            tags: c.moduleFiles.filter(m => {
                return !!m.cmpMeta;
            }).map(m => m.cmpMeta.tagNameMeta).sort()
        };
        return collectionDeps;
    });
    return collectionDeps.sort((a, b) => {
        if (a.name < b.name)
            return -1;
        if (a.name > b.name)
            return 1;
        return 0;
    });
}
function parseCollectionData(config, collectionName, collectionDir, collectionJsonStr) {
    const collectionData = JSON.parse(collectionJsonStr);
    const collection = {
        collectionName: collectionName,
        dependencies: parseCollectionDependencies(collectionData),
        compiler: {
            name: collectionData.compiler.name,
            version: collectionData.compiler.version,
            typescriptVersion: collectionData.compiler.typescriptVersion
        },
        bundles: []
    };
    parseComponents(config, collectionDir, collectionData, collection);
    parseGlobal(config, collectionDir, collectionData, collection);
    parseBundles(collectionData, collection);
    return collection;
}
function parseComponents(config, collectionDir, collectionData, collection) {
    const componentsData = collectionData.components;
    if (!componentsData || !Array.isArray(componentsData)) {
        collection.moduleFiles = [];
        return;
    }
    collection.moduleFiles = componentsData.map(cmpData => {
        return parseComponentDataToModuleFile(config, collection, collectionDir, cmpData);
    });
}
function parseCollectionDependencies(collectionData) {
    const dependencies = [];
    if (Array.isArray(collectionData.collections)) {
        collectionData.collections.forEach(c => {
            dependencies.push(c.name);
        });
    }
    return dependencies;
}
function excludeFromCollection(config, cmpData) {
    // this is a component from a collection dependency
    // however, this project may also become a collection
    // for example, "ionicons" is a dependency of "ionic"
    // and "ionic" is it's own stand-alone collection, so within
    // ionic's collection we want ionicons to just work
    // cmpData is a component from a collection dependency
    // if this component is listed in this config's bundles
    // then we'll need to ensure it also becomes apart of this collection
    const isInBundle = config.bundles && config.bundles.some(bundle => {
        return bundle.components && bundle.components.some(tag => tag === cmpData.tag);
    });
    // if it's not in the config bundle then it's safe to exclude
    // this component from going into this build's collection
    return !isInBundle;
}
function serializeComponent(config, collectionDir, moduleFile) {
    if (!moduleFile || !moduleFile.cmpMeta || moduleFile.isCollectionDependency || moduleFile.excludeFromCollection) {
        return null;
    }
    const cmpData = {};
    const cmpMeta = moduleFile.cmpMeta;
    // get the current absolute path to our built js file
    // and figure out the relative path from the src dir
    const relToSrc = normalizePath(config.sys.path.relative(config.srcDir, moduleFile.jsFilePath));
    // figure out the absolute path when it's in the collection dir
    const compiledComponentAbsoluteFilePath = normalizePath(config.sys.path.join(collectionDir, relToSrc));
    // create a relative path from the collection file to the compiled component's output javascript file
    const compiledComponentRelativeFilePath = normalizePath(config.sys.path.relative(collectionDir, compiledComponentAbsoluteFilePath));
    // create a relative path to the directory where the compiled component's output javascript is sitting in
    const compiledComponentRelativeDirPath = normalizePath(config.sys.path.dirname(compiledComponentRelativeFilePath));
    serializeTag(cmpData, cmpMeta);
    serializeComponentDependencies(cmpData, cmpMeta);
    serializeComponentClass(cmpData, cmpMeta);
    serializeComponentPath(config, collectionDir, compiledComponentAbsoluteFilePath, cmpData);
    serializeStyles(config, compiledComponentRelativeDirPath, cmpData, cmpMeta);
    serializeAssetsDir(config, compiledComponentRelativeDirPath, cmpData, cmpMeta);
    serializeProps(cmpData, cmpMeta);
    serializeStates(cmpData, cmpMeta);
    serializeListeners(cmpData, cmpMeta);
    serializeMethods(cmpData, cmpMeta);
    serializeContextMember(cmpData, cmpMeta);
    serializeConnectMember(cmpData, cmpMeta);
    serializeHostElementMember(cmpData, cmpMeta);
    serializeEvents(cmpData, cmpMeta);
    serializeHost(cmpData, cmpMeta);
    serializeEncapsulation(cmpData, cmpMeta);
    return cmpData;
}
function parseComponentDataToModuleFile(config, collection, collectionDir, cmpData) {
    const moduleFile = {
        sourceFilePath: normalizePath(config.sys.path.join(collectionDir, cmpData.componentPath)),
        cmpMeta: {},
        isCollectionDependency: true,
        excludeFromCollection: excludeFromCollection(config, cmpData),
        localImports: [],
        externalImports: [],
        potentialCmpRefs: []
    };
    const cmpMeta = moduleFile.cmpMeta;
    parseTag(cmpData, cmpMeta);
    parseComponentDependencies(cmpData, cmpMeta);
    parseComponentClass(cmpData, cmpMeta);
    parseModuleJsFilePath(config, collectionDir, cmpData, moduleFile);
    parseStyles(config, collectionDir, cmpData, cmpMeta);
    parseAssetsDir(config, collectionDir, cmpData, cmpMeta);
    parseProps(config, collection, cmpData, cmpMeta);
    parseStates(cmpData, cmpMeta);
    parseListeners(cmpData, cmpMeta);
    parseMethods(cmpData, cmpMeta);
    parseContextMember(cmpData, cmpMeta);
    parseConnectMember(cmpData, cmpMeta);
    parseHostElementMember(cmpData, cmpMeta);
    parseEvents(cmpData, cmpMeta);
    parseHost(cmpData, cmpMeta);
    parseEncapsulation(cmpData, cmpMeta);
    // DEPRECATED: 2017-12-27
    parseWillChangeDeprecated(cmpData, cmpMeta);
    parseDidChangeDeprecated(cmpData, cmpMeta);
    return moduleFile;
}
function serializeTag(cmpData, cmpMeta) {
    cmpData.tag = cmpMeta.tagNameMeta;
}
function parseTag(cmpData, cmpMeta) {
    cmpMeta.tagNameMeta = cmpData.tag;
}
function serializeComponentPath(config, collectionDir, compiledComponentAbsoluteFilePath, cmpData) {
    // convert absolute path into a path that's relative to the collection file
    cmpData.componentPath = normalizePath(config.sys.path.relative(collectionDir, compiledComponentAbsoluteFilePath));
}
function parseModuleJsFilePath(config, collectionDir, cmpData, moduleFile) {
    // convert the path that's relative to the collection file
    // into an absolute path to the component's js file path
    if (typeof cmpData.componentPath !== 'string') {
        throw new Error(`parseModuleJsFilePath, "componentPath" missing on cmpData: ${cmpData.tag}`);
    }
    moduleFile.jsFilePath = normalizePath(config.sys.path.join(collectionDir, cmpData.componentPath));
    // remember the original component path from its collection
    moduleFile.originalCollectionComponentPath = cmpData.componentPath;
}
function serializeComponentDependencies(cmpData, cmpMeta) {
    cmpData.dependencies = (cmpMeta.dependencies || []).sort();
}
function parseComponentDependencies(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.dependencies)) {
        cmpMeta.dependencies = [];
    }
    else {
        cmpMeta.dependencies = cmpData.dependencies.sort();
    }
}
function serializeComponentClass(cmpData, cmpMeta) {
    cmpData.componentClass = cmpMeta.componentClass;
}
function parseComponentClass(cmpData, cmpMeta) {
    cmpMeta.componentClass = cmpData.componentClass;
}
function serializeStyles(config, compiledComponentRelativeDirPath, cmpData, cmpMeta) {
    if (cmpMeta.stylesMeta) {
        cmpData.styles = {};
        const modeNames = Object.keys(cmpMeta.stylesMeta).map(m => m.toLowerCase()).sort();
        modeNames.forEach(modeName => {
            cmpData.styles[modeName] = serializeStyle(config, compiledComponentRelativeDirPath, cmpMeta.stylesMeta[modeName]);
        });
    }
}
function parseStyles(config, collectionDir, cmpData, cmpMeta) {
    const stylesData = cmpData.styles;
    cmpMeta.stylesMeta = {};
    if (stylesData) {
        Object.keys(stylesData).forEach(modeName => {
            modeName = modeName.toLowerCase();
            cmpMeta.stylesMeta[modeName] = parseStyle(config, collectionDir, cmpData, stylesData[modeName]);
        });
    }
}
function serializeStyle(config, compiledComponentRelativeDirPath, modeStyleMeta) {
    const modeStyleData = {};
    if (modeStyleMeta.externalStyles && modeStyleMeta.externalStyles.length > 0) {
        modeStyleData.stylePaths = modeStyleMeta.externalStyles.map(externalStyle => {
            // convert style paths which are relative to the component file
            // to be style paths that are relative to the collection file
            // we've already figured out the component's relative path from the collection file
            // use the value we already created in serializeComponentPath()
            // create a relative path from the collection file to the style path
            return normalizePath(config.sys.path.join(compiledComponentRelativeDirPath, externalStyle.cmpRelativePath));
        });
        modeStyleData.stylePaths.sort();
    }
    if (typeof modeStyleMeta.styleStr === 'string') {
        modeStyleData.style = modeStyleMeta.styleStr;
    }
    return modeStyleData;
}
function parseStyle(config, collectionDir, cmpData, modeStyleData) {
    const modeStyle = {
        styleStr: modeStyleData.style
    };
    if (modeStyleData.stylePaths) {
        modeStyle.externalStyles = modeStyleData.stylePaths.map(stylePath => {
            const externalStyle = {};
            externalStyle.absolutePath = normalizePath(config.sys.path.join(collectionDir, stylePath));
            externalStyle.cmpRelativePath = normalizePath(config.sys.path.relative(config.sys.path.dirname(cmpData.componentPath), stylePath));
            externalStyle.originalCollectionPath = normalizePath(stylePath);
            return externalStyle;
        });
    }
    return modeStyle;
}
function serializeAssetsDir(config, compiledComponentRelativeDirPath, cmpData, cmpMeta) {
    if (invalidArrayData(cmpMeta.assetsDirsMeta)) {
        return;
    }
    // convert asset paths which are relative to the component file
    // to be asset paths that are relative to the collection file
    // we've already figured out the component's relative path from the collection file
    // use the value we already created in serializeComponentPath()
    // create a relative path from the collection file to the asset path
    cmpData.assetPaths = cmpMeta.assetsDirsMeta.map(assetMeta => {
        return normalizePath(config.sys.path.join(compiledComponentRelativeDirPath, assetMeta.cmpRelativePath));
    }).sort();
}
function parseAssetsDir(config, collectionDir, cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.assetPaths)) {
        return;
    }
    cmpMeta.assetsDirsMeta = cmpData.assetPaths.map(assetsPath => {
        const assetsMeta = {
            absolutePath: normalizePath(config.sys.path.join(collectionDir, assetsPath)),
            cmpRelativePath: normalizePath(config.sys.path.relative(config.sys.path.dirname(cmpData.componentPath), assetsPath)),
            originalCollectionPath: normalizePath(assetsPath)
        };
        return assetsMeta;
    }).sort((a, b) => {
        if (a.cmpRelativePath < b.cmpRelativePath)
            return -1;
        if (a.cmpRelativePath > b.cmpRelativePath)
            return 1;
        return 0;
    });
}
function serializeProps(cmpData, cmpMeta) {
    if (!cmpMeta.membersMeta)
        return;
    Object.keys(cmpMeta.membersMeta).sort(nameSort).forEach(memberName => {
        const memberMeta = cmpMeta.membersMeta[memberName];
        if (memberMeta.memberType === 1 /* Prop */ || memberMeta.memberType === 2 /* PropMutable */) {
            cmpData.props = cmpData.props || [];
            const propData = {
                name: memberName
            };
            if (memberMeta.propType === 3 /* Boolean */) {
                propData.type = BOOLEAN_KEY;
            }
            else if (memberMeta.propType === 4 /* Number */) {
                propData.type = NUMBER_KEY;
            }
            else if (memberMeta.propType === 2 /* String */) {
                propData.type = STRING_KEY;
            }
            else if (memberMeta.propType === 1 /* Any */) {
                propData.type = ANY_KEY;
            }
            if (memberMeta.memberType === 2 /* PropMutable */) {
                propData.mutable = true;
            }
            if (typeof memberMeta.attribName === 'string') {
                propData.attr = memberMeta.attribName;
            }
            if (memberMeta.watchCallbacks && memberMeta.watchCallbacks.length) {
                propData.watch = memberMeta.watchCallbacks.slice();
            }
            cmpData.props.push(propData);
        }
    });
}
function parseProps(config, collection, cmpData, cmpMeta) {
    const propsData = cmpData.props;
    if (invalidArrayData(propsData)) {
        return;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    propsData.forEach(propData => {
        cmpMeta.membersMeta[propData.name] = {};
        if (propData.mutable) {
            cmpMeta.membersMeta[propData.name].memberType = 2 /* PropMutable */;
        }
        else {
            cmpMeta.membersMeta[propData.name].memberType = 1 /* Prop */;
        }
        // the standard is the first character of the type is capitalized
        // however, lowercase and normalize for good measure
        const type = typeof propData.type === 'string' ? propData.type.toLowerCase().trim() : null;
        if (type === BOOLEAN_KEY.toLowerCase()) {
            cmpMeta.membersMeta[propData.name].propType = 3 /* Boolean */;
        }
        else if (type === NUMBER_KEY.toLowerCase()) {
            cmpMeta.membersMeta[propData.name].propType = 4 /* Number */;
        }
        else if (type === STRING_KEY.toLowerCase()) {
            cmpMeta.membersMeta[propData.name].propType = 2 /* String */;
        }
        else if (type === ANY_KEY.toLowerCase()) {
            cmpMeta.membersMeta[propData.name].propType = 1 /* Any */;
        }
        else if (!collection.compiler || !collection.compiler.version || config.sys.semver.lt(collection.compiler.version, '0.0.6-23')) {
            // older compilers didn't remember "any" type
            cmpMeta.membersMeta[propData.name].propType = 1 /* Any */;
        }
        if (cmpMeta.membersMeta[propData.name].propType) {
            // deprecated 0.7.3, 2018-03-19
            cmpMeta.membersMeta[propData.name].attribName = propData.name;
        }
        if (typeof propData.attr === 'string') {
            cmpMeta.membersMeta[propData.name].attribName = propData.attr;
        }
        if (!invalidArrayData(propData.watch)) {
            cmpMeta.membersMeta[propData.name].watchCallbacks = propData.watch.slice().sort();
        }
    });
}
function parseWillChangeDeprecated(cmpData, cmpMeta) {
    // DEPRECATED: 2017-12-27
    // previous way of storing change, 0.1.0 and below
    const propWillChangeData = cmpData.propsWillChange;
    if (invalidArrayData(propWillChangeData)) {
        return;
    }
    propWillChangeData.forEach((willChangeData) => {
        const propName = willChangeData.name;
        const methodName = willChangeData.method;
        cmpMeta.membersMeta = cmpMeta.membersMeta || {};
        cmpMeta.membersMeta[propName] = cmpMeta.membersMeta[propName] || {};
        cmpMeta.membersMeta[propName].watchCallbacks = cmpMeta.membersMeta[propName].watchCallbacks || [];
        cmpMeta.membersMeta[propName].watchCallbacks.push(methodName);
    });
}
function parseDidChangeDeprecated(cmpData, cmpMeta) {
    // DEPRECATED: 2017-12-27
    // previous way of storing change, 0.1.0 and below
    const propDidChangeData = cmpData.propsDidChange;
    if (invalidArrayData(propDidChangeData)) {
        return;
    }
    propDidChangeData.forEach((didChangeData) => {
        const propName = didChangeData.name;
        const methodName = didChangeData.method;
        cmpMeta.membersMeta = cmpMeta.membersMeta || {};
        cmpMeta.membersMeta[propName] = cmpMeta.membersMeta[propName] || {};
        cmpMeta.membersMeta[propName].watchCallbacks = cmpMeta.membersMeta[propName].watchCallbacks || [];
        cmpMeta.membersMeta[propName].watchCallbacks.push(methodName);
    });
}
function serializeStates(cmpData, cmpMeta) {
    if (!cmpMeta.membersMeta)
        return;
    Object.keys(cmpMeta.membersMeta).sort(nameSort).forEach(memberName => {
        const member = cmpMeta.membersMeta[memberName];
        if (member.memberType === 5 /* State */) {
            cmpData.states = cmpData.states || [];
            cmpData.states.push({
                name: memberName
            });
        }
    });
}
function parseStates(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.states)) {
        return;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    cmpData.states.forEach(stateData => {
        cmpMeta.membersMeta[stateData.name] = {
            memberType: 5 /* State */
        };
    });
}
function serializeListeners(cmpData, cmpMeta) {
    if (invalidArrayData(cmpMeta.listenersMeta)) {
        return;
    }
    cmpData.listeners = cmpMeta.listenersMeta.map(listenerMeta => {
        const listenerData = {
            event: listenerMeta.eventName,
            method: listenerMeta.eventMethodName
        };
        if (listenerMeta.eventPassive === false) {
            listenerData.passive = false;
        }
        if (listenerMeta.eventDisabled === true) {
            listenerData.enabled = false;
        }
        if (listenerMeta.eventCapture === false) {
            listenerData.capture = false;
        }
        return listenerData;
    }).sort((a, b) => {
        if (a.event.toLowerCase() < b.event.toLowerCase())
            return -1;
        if (a.event.toLowerCase() > b.event.toLowerCase())
            return 1;
        return 0;
    });
}
function parseListeners(cmpData, cmpMeta) {
    const listenersData = cmpData.listeners;
    if (invalidArrayData(listenersData)) {
        return;
    }
    cmpMeta.listenersMeta = listenersData.map(listenerData => {
        const listener = {
            eventName: listenerData.event,
            eventMethodName: listenerData.method,
            eventPassive: (listenerData.passive !== false),
            eventDisabled: (listenerData.enabled === false),
            eventCapture: (listenerData.capture !== false)
        };
        return listener;
    });
}
function serializeMethods(cmpData, cmpMeta) {
    if (!cmpMeta.membersMeta)
        return;
    Object.keys(cmpMeta.membersMeta).sort(nameSort).forEach(memberName => {
        const member = cmpMeta.membersMeta[memberName];
        if (member.memberType === 6 /* Method */) {
            cmpData.methods = cmpData.methods || [];
            cmpData.methods.push({
                name: memberName
            });
        }
    });
}
function parseMethods(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.methods)) {
        return;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    cmpData.methods.forEach(methodData => {
        cmpMeta.membersMeta[methodData.name] = {
            memberType: 6 /* Method */
        };
    });
}
function serializeContextMember(cmpData, cmpMeta) {
    if (!cmpMeta.membersMeta)
        return;
    Object.keys(cmpMeta.membersMeta).forEach(memberName => {
        const member = cmpMeta.membersMeta[memberName];
        if (member.ctrlId && member.memberType === 3 /* PropContext */) {
            cmpData.context = cmpData.context || [];
            cmpData.context.push({
                name: memberName,
                id: member.ctrlId
            });
        }
    });
}
function parseContextMember(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.context)) {
        return;
    }
    cmpData.context.forEach(methodData => {
        if (methodData.id) {
            cmpMeta.membersMeta = cmpMeta.membersMeta || {};
            cmpMeta.membersMeta[methodData.name] = {
                memberType: 3 /* PropContext */,
                ctrlId: methodData.id
            };
        }
    });
}
function serializeConnectMember(cmpData, cmpMeta) {
    if (!cmpMeta.membersMeta)
        return;
    Object.keys(cmpMeta.membersMeta).forEach(memberName => {
        const member = cmpMeta.membersMeta[memberName];
        if (member.ctrlId && member.memberType === 4 /* PropConnect */) {
            cmpData.connect = cmpData.connect || [];
            cmpData.connect.push({
                name: memberName,
                tag: member.ctrlId
            });
        }
    });
}
function parseConnectMember(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.connect)) {
        return;
    }
    cmpData.connect.forEach(methodData => {
        if (methodData.tag) {
            cmpMeta.membersMeta = cmpMeta.membersMeta || {};
            cmpMeta.membersMeta[methodData.name] = {
                memberType: 4 /* PropConnect */,
                ctrlId: methodData.tag
            };
        }
    });
}
function serializeHostElementMember(cmpData, cmpMeta) {
    if (!cmpMeta.membersMeta)
        return;
    Object.keys(cmpMeta.membersMeta).forEach(memberName => {
        const member = cmpMeta.membersMeta[memberName];
        if (member.memberType === 7 /* Element */) {
            cmpData.hostElement = {
                name: memberName
            };
        }
    });
}
function parseHostElementMember(cmpData, cmpMeta) {
    if (!cmpData.hostElement) {
        return;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    cmpMeta.membersMeta[cmpData.hostElement.name] = {
        memberType: 7 /* Element */
    };
}
function serializeEvents(cmpData, cmpMeta) {
    if (invalidArrayData(cmpMeta.eventsMeta)) {
        return;
    }
    cmpData.events = cmpMeta.eventsMeta.map(eventMeta => {
        const eventData = {
            event: eventMeta.eventName
        };
        if (eventMeta.eventMethodName !== eventMeta.eventName) {
            eventData.method = eventMeta.eventMethodName;
        }
        if (eventMeta.eventBubbles === false) {
            eventData.bubbles = false;
        }
        if (eventMeta.eventCancelable === false) {
            eventData.cancelable = false;
        }
        if (eventMeta.eventComposed === false) {
            eventData.composed = false;
        }
        return eventData;
    }).sort((a, b) => {
        if (a.event.toLowerCase() < b.event.toLowerCase())
            return -1;
        if (a.event.toLowerCase() > b.event.toLowerCase())
            return 1;
        return 0;
    });
}
function parseEvents(cmpData, cmpMeta) {
    const eventsData = cmpData.events;
    if (invalidArrayData(eventsData)) {
        return;
    }
    cmpMeta.eventsMeta = eventsData.map(eventData => ({
        eventName: eventData.event,
        eventMethodName: (eventData.method) ? eventData.method : eventData.event,
        eventBubbles: (eventData.bubbles !== false),
        eventCancelable: (eventData.cancelable !== false),
        eventComposed: (eventData.composed !== false)
    }));
}
function serializeHost(cmpData, cmpMeta) {
    if (!cmpMeta.hostMeta || Array.isArray(cmpMeta.hostMeta) || !Object.keys(cmpMeta.hostMeta).length) {
        return;
    }
    cmpData.host = cmpMeta.hostMeta;
}
function parseHost(cmpData, cmpMeta) {
    if (!cmpData.host) {
        return;
    }
    cmpMeta.hostMeta = cmpData.host;
}
function serializeEncapsulation(cmpData, cmpMeta) {
    if (cmpMeta.encapsulationMeta === 1 /* ShadowDom */) {
        cmpData.shadow = true;
    }
    else if (cmpMeta.encapsulationMeta === 2 /* ScopedCss */) {
        cmpData.scoped = true;
    }
}
function parseEncapsulation(cmpData, cmpMeta) {
    if (cmpData.shadow === true) {
        cmpMeta.encapsulationMeta = 1 /* ShadowDom */;
    }
    else if (cmpData.scoped === true) {
        cmpMeta.encapsulationMeta = 2 /* ScopedCss */;
    }
    else {
        cmpMeta.encapsulationMeta = 0 /* NoEncapsulation */;
    }
}
function serializeAppGlobal(config, collectionDir, collectionData, globalModule) {
    if (!globalModule) {
        return;
    }
    // get the current absolute path to our built js file
    // and figure out the relative path from the src dir
    const relToSrc = normalizePath(config.sys.path.relative(config.srcDir, globalModule.jsFilePath));
    // figure out the absolute path when it's in the collection dir
    const compiledComponentAbsoluteFilePath = normalizePath(config.sys.path.join(collectionDir, relToSrc));
    // create a relative path from the collection file to the compiled output javascript file
    collectionData.global = normalizePath(config.sys.path.relative(collectionDir, compiledComponentAbsoluteFilePath));
}
function parseGlobal(config, collectionDir, collectionData, collection) {
    if (typeof collectionData.global !== 'string')
        return;
    collection.global = {
        sourceFilePath: normalizePath(config.sys.path.join(collectionDir, collectionData.global)),
        jsFilePath: normalizePath(config.sys.path.join(collectionDir, collectionData.global)),
        localImports: [],
        externalImports: [],
        potentialCmpRefs: []
    };
}
function serializeBundles(config, collectionData) {
    collectionData.bundles = config.bundles.map(b => {
        return {
            components: b.components.slice().sort()
        };
    });
}
function parseBundles(collectionData, collection) {
    if (invalidArrayData(collectionData.bundles)) {
        collection.bundles = [];
        return;
    }
    collection.bundles = collectionData.bundles.map(b => {
        return {
            components: b.components.slice().sort()
        };
    });
}
function invalidArrayData(arr) {
    return (!arr || !Array.isArray(arr) || arr.length === 0);
}
function nameSort(a, b) {
    if (a.toLowerCase() < b.toLowerCase())
        return -1;
    if (a.toLowerCase() > b.toLowerCase())
        return 1;
    return 0;
}
const BOOLEAN_KEY = 'Boolean';
const NUMBER_KEY = 'Number';
const STRING_KEY = 'String';
const ANY_KEY = 'Any';

function parseCollectionModule(config, compilerCtx, pkgJsonFilePath, pkgData) {
    // note this MUST be synchronous because this is used during transpile
    const collectionName = pkgData.name;
    let collection = compilerCtx.collections.find(c => c.collectionName === collectionName);
    if (collection) {
        // we've already cached the collection, no need for another resolve/readFile/parse
        // thought being that /node_modules/ isn't changing between watch builds
        return collection;
    }
    // get the root directory of the dependency
    const collectionPackageRootDir = config.sys.path.dirname(pkgJsonFilePath);
    // figure out the full path to the collection collection file
    const collectionFilePath = pathJoin(config, collectionPackageRootDir, pkgData.collection);
    const relPath = config.sys.path.relative(config.rootDir, collectionFilePath);
    config.logger.debug(`load collection: ${collectionName}, ${relPath}`);
    // we haven't cached the collection yet, let's read this file
    // sync on purpose :(
    const collectionJsonStr = compilerCtx.fs.readFileSync(collectionFilePath);
    // get the directory where the collection collection file is sitting
    const collectionDir = normalizePath(config.sys.path.dirname(collectionFilePath));
    // parse the json string into our collection data
    collection = parseCollectionData(config, collectionName, collectionDir, collectionJsonStr);
    if (pkgData.module && pkgData.module !== pkgData.main) {
        collection.hasExports = true;
    }
    // remember the source of this collection node_module
    collection.moduleDir = collectionPackageRootDir;
    // append any collection data
    collection.moduleFiles.forEach(collectionModuleFile => {
        if (!compilerCtx.moduleFiles[collectionModuleFile.jsFilePath]) {
            compilerCtx.moduleFiles[collectionModuleFile.jsFilePath] = collectionModuleFile;
        }
    });
    // cache it for later yo
    compilerCtx.collections.push(collection);
    return collection;
}

function getCollections(config, compilerCtx, collections, moduleFile, importNode) {
    if (!importNode.moduleSpecifier || !compilerCtx || !collections) {
        return;
    }
    const moduleId = importNode.moduleSpecifier.text;
    // see if we can add this collection dependency
    addCollection(config, compilerCtx, collections, moduleFile, config.rootDir, moduleId);
}
function addCollection(config, compilerCtx, collections, moduleFile, resolveFromDir, moduleId) {
    if (moduleId.startsWith('.') || moduleId.startsWith('/')) {
        // not a node module import, so don't bother
        return;
    }
    moduleFile.externalImports = moduleFile.externalImports || [];
    if (!moduleFile.externalImports.includes(moduleId)) {
        moduleFile.externalImports.push(moduleId);
        moduleFile.externalImports.sort();
    }
    if (compilerCtx.resolvedCollections.includes(moduleId)) {
        // we've already handled this collection moduleId before
        return;
    }
    // cache that we've already parsed this
    compilerCtx.resolvedCollections.push(moduleId);
    let pkgJsonFilePath;
    try {
        // get the full package.json file path
        pkgJsonFilePath = normalizePath(config.sys.resolveModule(resolveFromDir, moduleId));
    }
    catch (e) {
        // it's someone else's job to handle unresolvable paths
        return;
    }
    if (pkgJsonFilePath === 'package.json') {
        // the resolved package is actually this very same package, so whatever
        return;
    }
    // open up and parse the package.json
    // sync on purpose :(
    const pkgJsonStr = compilerCtx.fs.readFileSync(pkgJsonFilePath);
    const pkgData = JSON.parse(pkgJsonStr);
    if (!pkgData.collection || !pkgData.types) {
        // this import is not a stencil collection
        return;
    }
    // this import is a stencil collection
    // let's parse it and gather all the module data about it
    // internally it'll cached collection data if we've already done this
    const collection = parseCollectionModule(config, compilerCtx, pkgJsonFilePath, pkgData);
    // check if we already added this collection to the build context
    const alreadyHasCollection = collections.some(c => {
        return c.collectionName === collection.collectionName;
    });
    if (alreadyHasCollection) {
        // we already have this collection in our build context
        return;
    }
    // let's add the collection to the build context
    collections.push(collection);
    if (Array.isArray(collection.dependencies)) {
        // this collection has more collections
        // let's keep digging down and discover all of them
        collection.dependencies.forEach(dependencyModuleId => {
            const resolveFromDir = config.sys.path.dirname(pkgJsonFilePath);
            addCollection(config, compilerCtx, collections, moduleFile, resolveFromDir, dependencyModuleId);
        });
    }
}

var __awaiter$j = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getUserCompilerOptions(config, compilerCtx) {
    return __awaiter$j(this, void 0, void 0, function* () {
        if (compilerCtx.compilerOptions) {
            return compilerCtx.compilerOptions;
        }
        let compilerOptions = Object.assign({}, DEFAULT_COMPILER_OPTIONS);
        try {
            const normalizedConfigPath = normalizePath(config.tsconfig);
            const sourceText = yield compilerCtx.fs.readFile(normalizedConfigPath);
            try {
                const sourceJson = JSON.parse(sourceText);
                const parsedCompilerOptions = ts.convertCompilerOptionsFromJson(sourceJson.compilerOptions, '.').options;
                compilerOptions = Object.assign({}, compilerOptions, parsedCompilerOptions);
            }
            catch (e) {
                config.logger.warn('tsconfig.json is malformed, using default settings');
            }
        }
        catch (e) {
            config.logger.debug(`getUserCompilerOptions: ${e}`);
        }
        if (config._isTesting) {
            compilerOptions.module = ts.ModuleKind.CommonJS;
        }
        // apply user config to tsconfig
        compilerOptions.rootDir = config.srcDir;
        // during the transpile we'll write the output
        // to the correct location(s)
        compilerOptions.outDir = undefined;
        // generate .d.ts files when generating a distribution and in prod mode
        const typesOutputTarget = config.outputTargets.find(o => !!o.typesDir);
        if (typesOutputTarget) {
            compilerOptions.declaration = true;
            compilerOptions.declarationDir = typesOutputTarget.typesDir;
        }
        else {
            compilerOptions.declaration = false;
        }
        validateCompilerOptions(compilerOptions);
        compilerCtx.compilerOptions = compilerOptions;
        return compilerOptions;
    });
}
function validateCompilerOptions(compilerOptions) {
    if (compilerOptions.allowJs && compilerOptions.declaration) {
        compilerOptions.allowJs = false;
    }
    // triple stamp a double stamp we've got the required settings
    compilerOptions.jsx = DEFAULT_COMPILER_OPTIONS.jsx;
    compilerOptions.jsxFactory = DEFAULT_COMPILER_OPTIONS.jsxFactory;
    compilerOptions.experimentalDecorators = DEFAULT_COMPILER_OPTIONS.experimentalDecorators;
    compilerOptions.noEmitOnError = DEFAULT_COMPILER_OPTIONS.noEmit;
    compilerOptions.suppressOutputPathCheck = DEFAULT_COMPILER_OPTIONS.suppressOutputPathCheck;
    compilerOptions.module = DEFAULT_COMPILER_OPTIONS.module;
    compilerOptions.moduleResolution = DEFAULT_COMPILER_OPTIONS.moduleResolution;
    if (compilerOptions.target === ts.ScriptTarget.ES3 || compilerOptions.target === ts.ScriptTarget.ES5) {
        compilerOptions.target = DEFAULT_COMPILER_OPTIONS.target;
    }
}
const DEFAULT_COMPILER_OPTIONS = {
    // to allow jsx to work
    jsx: ts.JsxEmit.React,
    // the factory function to use
    jsxFactory: 'h',
    // transpileModule does not write anything to disk so there is no need
    // to verify that there are no conflicts between input and output paths.
    suppressOutputPathCheck: true,
    // // Clear out other settings that would not be used in transpiling this module
    lib: [
        'lib.dom.d.ts',
        'lib.es5.d.ts',
        'lib.es2015.d.ts',
        'lib.es2016.d.ts',
        'lib.es2017.d.ts'
    ],
    // We are not doing a full typecheck, we are not resolving the whole context,
    // so pass --noResolve to avoid reporting missing file errors.
    // noResolve: true,
    allowSyntheticDefaultImports: true,
    // must always allow decorators
    experimentalDecorators: true,
    // transpile down to es2017
    target: ts.ScriptTarget.ES2017,
    // create es2015 modules
    module: ts.ModuleKind.ESNext,
    // resolve using NodeJs style
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    // ensure that we do emit something
    noEmitOnError: false
};

var __awaiter$k = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Check if class has component decorator
 * @param classNode
 */
function isComponentClass(classNode) {
    if (!Array.isArray(classNode.decorators)) {
        return false;
    }
    const componentDecoratorIndex = classNode.decorators.findIndex(dec => (ts.isCallExpression(dec.expression) && ts.isIdentifier(dec.expression.expression) && dec.expression.expression.text === 'Component'));
    return (componentDecoratorIndex !== -1);
}
function isInstanceOfObjectMap(object) {
    return (!object.hasOwnProperty('kind') &&
        !object.hasOwnProperty('flags') &&
        !object.hasOwnProperty('pos') &&
        !object.hasOwnProperty('end'));
}
function getTextOfPropertyName(name) {
    switch (name.kind) {
        case ts.SyntaxKind.Identifier:
            return name.text;
        case ts.SyntaxKind.StringLiteral:
        case ts.SyntaxKind.NumericLiteral:
            return name.text;
        case ts.SyntaxKind.ComputedPropertyName:
            const expression = name.expression;
            if (ts.isStringLiteral(expression) || ts.isNumericLiteral(expression)) {
                return name.expression.text;
            }
    }
    return undefined;
}
function objectLiteralToObjectMap(objectLiteral) {
    const attrs = objectLiteral.properties;
    return attrs.reduce((final, attr) => {
        const name = getTextOfPropertyName(attr.name);
        let val;
        switch (attr.initializer.kind) {
            case ts.SyntaxKind.ObjectLiteralExpression:
                val = objectLiteralToObjectMap(attr.initializer);
                break;
            case ts.SyntaxKind.StringLiteral:
            case ts.SyntaxKind.Identifier:
            case ts.SyntaxKind.PropertyAccessExpression:
            default:
                val = attr.initializer;
        }
        final[name] = val;
        return final;
    }, {});
}
function objectMapToObjectLiteral(objMap) {
    const newProperties = Object.keys(objMap).map((key) => {
        const value = objMap[key];
        if (!ts.isIdentifier(value) && isInstanceOfObjectMap(value)) {
            return ts.createPropertyAssignment(ts.createLiteral(key), objectMapToObjectLiteral(value));
        }
        return ts.createPropertyAssignment(ts.createLiteral(key), value);
    });
    return ts.createObjectLiteral(newProperties);
}
/**
 * Convert a js value into typescript AST
 * @param val array, object, string, boolean, or number
 * @returns Typescript Object Literal, Array Literal, String Literal, Boolean Literal, Numeric Literal
 */
function convertValueToLiteral(val) {
    if (val === String) {
        return ts.createIdentifier('String');
    }
    if (val === Number) {
        return ts.createIdentifier('Number');
    }
    if (val === Boolean) {
        return ts.createIdentifier('Boolean');
    }
    if (Array.isArray(val)) {
        return arrayToArrayLiteral(val);
    }
    if (typeof val === 'object') {
        return objectToObjectLiteral(val);
    }
    return ts.createLiteral(val);
}
/**
 * Convert a js object into typescript AST
 * @param obj key value object
 * @returns Typescript Object Literal Expression
 */
function objectToObjectLiteral(obj) {
    if (Object.keys(obj).length === 0) {
        return ts.createObjectLiteral([]);
    }
    const newProperties = Object.keys(obj).map((key) => {
        return ts.createPropertyAssignment(ts.createLiteral(key), convertValueToLiteral(obj[key]));
    });
    return ts.createObjectLiteral(newProperties, true);
}
/**
 * Convert a js array into typescript AST
 * @param list array
 * @returns Typescript Array Literal Expression
 */
function arrayToArrayLiteral(list) {
    const newList = list.map(convertValueToLiteral);
    return ts.createArrayLiteral(newList);
}
/**
 * Execute an array of transforms over a string containing typescript source
 * @param sourceText Typescript source as a string
 * @param transformers Array of transforms to run agains the source string
 * @returns a string
 */
function transformSourceString(fileName, sourceText, transformers) {
    return __awaiter$k(this, void 0, void 0, function* () {
        const transformed = ts.transform(ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.ES2017), transformers);
        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }, {
            onEmitNode: transformed.emitNodeWithNotification,
            substituteNode: transformed.substituteNode
        });
        const result = printer.printBundle(ts.createBundle(transformed.transformed));
        transformed.dispose();
        return result;
    });
}

function addComponentMetadata(moduleFiles) {
    return (transformContext) => {
        function visitClass(classNode, cmpMeta) {
            const staticMembers = addStaticMeta(cmpMeta);
            const newMembers = Object.keys(staticMembers).map(memberName => {
                return createGetter(memberName, staticMembers[memberName]);
            });
            return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, [...classNode.members, ...newMembers]);
        }
        function visit(node, cmpMeta) {
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    return visitClass(node, cmpMeta);
                default:
                    return ts.visitEachChild(node, (node) => {
                        return visit(node, cmpMeta);
                    }, transformContext);
            }
        }
        return (tsSourceFile) => {
            const moduleFile = moduleFiles[tsSourceFile.fileName];
            if (moduleFile && moduleFile.cmpMeta) {
                return visit(tsSourceFile, moduleFile.cmpMeta);
            }
            return tsSourceFile;
        };
    };
}
function addStaticMeta(cmpMeta) {
    const staticMembers = {};
    staticMembers.is = convertValueToLiteral(cmpMeta.tagNameMeta);
    const encapsulation = formatConstructorEncapsulation(cmpMeta.encapsulationMeta);
    if (encapsulation) {
        staticMembers.encapsulation = convertValueToLiteral(encapsulation);
    }
    if (cmpMeta.hostMeta && Object.keys(cmpMeta.hostMeta).length > 0) {
        staticMembers.host = convertValueToLiteral(cmpMeta.hostMeta);
    }
    const propertiesMeta = formatComponentConstructorProperties(cmpMeta.membersMeta);
    if (propertiesMeta && Object.keys(propertiesMeta).length > 0) {
        staticMembers.properties = convertValueToLiteral(propertiesMeta);
    }
    const eventsMeta = formatComponentConstructorEvents(cmpMeta.eventsMeta);
    if (eventsMeta && eventsMeta.length > 0) {
        staticMembers.events = convertValueToLiteral(eventsMeta);
    }
    const listenerMeta = formatComponentConstructorListeners(cmpMeta.listenersMeta);
    if (listenerMeta && listenerMeta.length > 0) {
        staticMembers.listeners = convertValueToLiteral(listenerMeta);
    }
    if (cmpMeta.stylesMeta) {
        const styleModes = Object.keys(cmpMeta.stylesMeta);
        if (styleModes.length > 0) {
            // awesome, we know we've got styles!
            // let's add the placeholder which we'll use later
            // after we generate the css
            staticMembers.style = convertValueToLiteral(getStylePlaceholder(cmpMeta.tagNameMeta));
            if (!cmpMeta.stylesMeta[DEFAULT_STYLE_MODE]) {
                // if there's only one style, then there's no need for styleId
                // but if there are numerous style modes, then we'll need to add this
                staticMembers.styleMode = convertValueToLiteral(getStyleIdPlaceholder(cmpMeta.tagNameMeta));
            }
        }
    }
    return staticMembers;
}
function createGetter(name, returnExpression) {
    return ts.createGetAccessor(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], name, undefined, undefined, ts.createBlock([
        ts.createReturn(returnExpression)
    ]));
}

function componentDependencies(compilerCtx) {
    return (transformContext) => {
        function visit(node, moduleFile) {
            if (node.kind === ts.SyntaxKind.CallExpression) {
                callExpression(moduleFile, node);
            }
            else if (node.kind === ts.SyntaxKind.StringLiteral) {
                stringLiteral(moduleFile, node);
            }
            return ts.visitEachChild(node, (node) => {
                return visit(node, moduleFile);
            }, transformContext);
        }
        return (tsSourceFile) => {
            const moduleFile = getModuleFile(compilerCtx, tsSourceFile.fileName);
            // reset since we're doing a full parse again
            moduleFile.potentialCmpRefs.length = 0;
            moduleFile.hasSlot = false;
            moduleFile.hasSvg = false;
            addPropConnects(compilerCtx, moduleFile);
            return visit(tsSourceFile, moduleFile);
        };
    };
}
function addPropConnects(compilerCtx, moduleFile) {
    if (!moduleFile.cmpMeta) {
        return;
    }
    if (moduleFile.cmpMeta.membersMeta) {
        Object.keys(moduleFile.cmpMeta.membersMeta).forEach(memberName => {
            const memberMeta = moduleFile.cmpMeta.membersMeta[memberName];
            if (memberMeta.memberType === 4 /* PropConnect */) {
                addPropConnect(compilerCtx, moduleFile, memberMeta.ctrlId);
            }
        });
    }
}
function addPropConnect(compilerCtx, moduleFile, tag) {
    if (!moduleFile.potentialCmpRefs.some(cr => cr.tag === tag)) {
        moduleFile.potentialCmpRefs.push({
            tag: tag
        });
    }
    compilerCtx.collections.forEach(collection => {
        collection.bundles.forEach(bundle => {
            if (bundle.components.includes(tag)) {
                bundle.components.forEach(bundleTag => {
                    if (bundleTag !== tag) {
                        if (!moduleFile.potentialCmpRefs.some(cr => cr.tag === bundleTag)) {
                            moduleFile.potentialCmpRefs.push({
                                tag: bundleTag
                            });
                        }
                    }
                });
            }
        });
    });
}
function callExpression(moduleFile, node) {
    if (node.arguments && node.arguments[0]) {
        if (node.expression.kind === ts.SyntaxKind.Identifier) {
            // h('tag')
            callExpressionArg(moduleFile, node.expression, node.arguments);
        }
        else if (node.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
            // document.createElement('tag')
            if (node.expression.name) {
                callExpressionArg(moduleFile, node.expression.name, node.arguments);
            }
        }
    }
}
function callExpressionArg(moduleFile, callExpressionName, args) {
    if (TAG_CALL_EXPRESSIONS.includes(callExpressionName.escapedText)) {
        if (args[0].kind === ts.SyntaxKind.StringLiteral) {
            let tag = args[0].text;
            if (typeof tag === 'string') {
                tag = tag.toLowerCase();
                if (tag.includes('-')) {
                    if (!moduleFile.potentialCmpRefs.some(cr => cr.tag === tag)) {
                        moduleFile.potentialCmpRefs.push({
                            tag: tag
                        });
                    }
                }
                else if (tag === 'slot') {
                    moduleFile.hasSlot = true;
                }
                else if (tag === 'svg') {
                    moduleFile.hasSvg = true;
                }
            }
        }
    }
}
function stringLiteral(moduleFile, node) {
    if (typeof node.text === 'string' && node.text.includes('</')) {
        if (node.text.includes('-')) {
            moduleFile.potentialCmpRefs.push({
                html: node.text
            });
        }
        if (!moduleFile.hasSlot && node.text.includes('<slot')) {
            moduleFile.hasSlot = true;
        }
        if (!moduleFile.hasSvg && node.text.includes('<svg')) {
            moduleFile.hasSvg = true;
        }
    }
}
const TAG_CALL_EXPRESSIONS = [
    'h',
    'createElement',
    'createElementNS'
];

function evalText(text) {
    const fnStr = `return ${text};`;
    return new Function(fnStr)();
}
const getDeclarationParameters = (decorator) => {
    if (!ts.isCallExpression(decorator.expression)) {
        return [];
    }
    return decorator.expression.arguments.map((arg) => {
        return evalText(arg.getText().trim());
    });
};
function isDecoratorNamed(name) {
    return (dec) => {
        return (ts.isCallExpression(dec.expression) && dec.expression.expression.getText() === name);
    };
}
function isPropertyWithDecorators(member) {
    return ts.isPropertyDeclaration(member)
        && Array.isArray(member.decorators)
        && member.decorators.length > 0;
}
function isMethodWithDecorators(member) {
    return ts.isMethodDeclaration(member)
        && Array.isArray(member.decorators)
        && member.decorators.length > 0;
}
function serializeSymbol(checker, symbol) {
    return {
        name: symbol.getName(),
        documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
        type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
    };
}
function isMethod(member, methodName) {
    if (ts.isMethodDeclaration(member)) {
        return member.getFirstToken().getText() === methodName;
    }
    return false;
}
function getAttributeTypeInfo(baseNode, sourceFile) {
    return getAllTypeReferences(baseNode)
        .reduce((allReferences, rt) => {
        allReferences[rt] = getTypeReferenceLocation(rt, sourceFile);
        return allReferences;
    }, {});
}
function getAllTypeReferences(node) {
    const referencedTypes = [];
    function visit(node) {
        switch (node.kind) {
            case ts.SyntaxKind.TypeReference:
                const typeNode = node;
                if (ts.isIdentifier(typeNode.typeName)) {
                    const name = typeNode.typeName;
                    referencedTypes.push(name.escapedText.toString());
                }
                if (typeNode.typeArguments) {
                    typeNode.typeArguments
                        .filter(ta => ts.isTypeReferenceNode(ta))
                        .forEach((tr) => {
                        const name = tr.typeName;
                        referencedTypes.push(name.escapedText.toString());
                    });
                }
            /* tslint:disable */
            default:
                return ts.forEachChild(node, (node) => {
                    return visit(node);
                });
        }
        /* tslint:enable */
    }
    visit(node);
    return referencedTypes;
}
function getTypeReferenceLocation(typeName, sourceFile) {
    const sourceFileObj = sourceFile.getSourceFile();
    // Loop through all top level imports to find any reference to the type for 'import' reference location
    const importTypeDeclaration = sourceFileObj.statements.find(st => {
        const statement = ts.isImportDeclaration(st) &&
            st.importClause &&
            ts.isImportClause(st.importClause) &&
            st.importClause.namedBindings &&
            ts.isNamedImports(st.importClause.namedBindings) &&
            Array.isArray(st.importClause.namedBindings.elements) &&
            st.importClause.namedBindings.elements.find(nbe => nbe.name.getText() === typeName);
        if (!statement) {
            return false;
        }
        return true;
    });
    if (importTypeDeclaration) {
        const localImportPath = importTypeDeclaration.moduleSpecifier.text;
        return {
            referenceLocation: 'import',
            importReferenceLocation: localImportPath
        };
    }
    // Loop through all top level exports to find if any reference to the type for 'local' reference location
    const isExported = sourceFileObj.statements.some(st => {
        // Is the interface defined in the file and exported
        const isInterfaceDeclarationExported = ((ts.isInterfaceDeclaration(st) &&
            st.name.getText() === typeName) &&
            Array.isArray(st.modifiers) &&
            st.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));
        const isTypeAliasDeclarationExported = ((ts.isTypeAliasDeclaration(st) &&
            st.name.getText() === typeName) &&
            Array.isArray(st.modifiers) &&
            st.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));
        // Is the interface exported through a named export
        const isTypeInExportDeclaration = ts.isExportDeclaration(st) &&
            ts.isNamedExports(st.exportClause) &&
            st.exportClause.elements.some(nee => nee.name.getText() === typeName);
        return isInterfaceDeclarationExported || isTypeAliasDeclarationExported || isTypeInExportDeclaration;
    });
    if (isExported) {
        return {
            referenceLocation: 'local'
        };
    }
    // This is most likely a global type, if it is a local that is not exported then typescript will inform the dev
    return {
        referenceLocation: 'global',
    };
}

function getStylesMeta(componentOptions) {
    let stylesMeta = {};
    if (typeof componentOptions.styles === 'string') {
        // styles: 'div { padding: 10px }'
        componentOptions.styles = componentOptions.styles.trim();
        if (componentOptions.styles.length > 0) {
            stylesMeta = {
                [DEFAULT_STYLE_MODE]: {
                    styleStr: componentOptions.styles
                }
            };
        }
    }
    if (typeof componentOptions.styleUrl === 'string' && componentOptions.styleUrl.trim()) {
        // styleUrl: 'my-styles.css'
        stylesMeta = {
            [DEFAULT_STYLE_MODE]: {
                externalStyles: [{
                        originalComponentPath: componentOptions.styleUrl.trim()
                    }]
            }
        };
    }
    else if (Array.isArray(componentOptions.styleUrls)) {
        // styleUrls: ['my-styles.css', 'my-other-styles']
        stylesMeta = {
            [DEFAULT_STYLE_MODE]: {
                externalStyles: componentOptions.styleUrls.map(styleUrl => {
                    const externalStyle = {
                        originalComponentPath: styleUrl.trim()
                    };
                    return externalStyle;
                })
            }
        };
    }
    else {
        // styleUrls: {
        //   ios: 'badge.ios.css',
        //   md: 'badge.md.css',
        //   wp: 'badge.wp.css'
        // }
        Object.keys(componentOptions.styleUrls || {}).reduce((stylesMeta, styleType) => {
            const styleUrls = componentOptions.styleUrls;
            const sUrls = [].concat(styleUrls[styleType]);
            stylesMeta[styleType] = {
                externalStyles: sUrls.map(sUrl => {
                    const externalStyle = {
                        originalComponentPath: sUrl
                    };
                    return externalStyle;
                })
            };
            return stylesMeta;
        }, stylesMeta);
    }
    return stylesMeta;
}

function getComponentDecoratorMeta(diagnostics, checker, node) {
    if (!node.decorators) {
        return undefined;
    }
    const componentDecorator = node.decorators.find(isDecoratorNamed('Component'));
    if (!componentDecorator) {
        return undefined;
    }
    const [componentOptions] = getDeclarationParameters(componentDecorator);
    if (!componentOptions.tag || componentOptions.tag.trim() === '') {
        throw new Error(`tag missing in component decorator: ${JSON.stringify(componentOptions, null, 2)}`);
    }
    const symbol = checker.getSymbolAtLocation(node.name);
    const cmpMeta = {
        tagNameMeta: componentOptions.tag,
        stylesMeta: getStylesMeta(componentOptions),
        assetsDirsMeta: [],
        hostMeta: getHostMeta(diagnostics, componentOptions.host),
        dependencies: [],
        jsdoc: serializeSymbol(checker, symbol)
    };
    // normalizeEncapsulation
    cmpMeta.encapsulationMeta =
        componentOptions.shadow ? 1 /* ShadowDom */ :
            componentOptions.scoped ? 2 /* ScopedCss */ :
                0 /* NoEncapsulation */;
    // assetsDir: './somedir'
    if (componentOptions.assetsDir) {
        const assetsMeta = {
            originalComponentPath: componentOptions.assetsDir
        };
        cmpMeta.assetsDirsMeta.push(assetsMeta);
    }
    // assetsDirs: ['./somedir', '../someotherdir']
    if (Array.isArray(componentOptions.assetsDirs)) {
        cmpMeta.assetsDirsMeta = cmpMeta.assetsDirsMeta.concat(componentOptions.assetsDirs.map(assetDir => ({ originalComponentPath: assetDir })));
    }
    return cmpMeta;
}
function getHostMeta(diagnostics, hostData) {
    hostData = hostData || {};
    Object.keys(hostData).forEach(key => {
        const type = typeof hostData[key];
        if (type !== 'string' && type !== 'number' && type !== 'boolean') {
            // invalid data
            delete hostData[key];
            let itsType = 'object';
            if (type === 'function') {
                itsType = 'function';
            }
            else if (Array.isArray(hostData[key])) {
                itsType = 'Array';
            }
            const diagnostic = buildWarn(diagnostics);
            diagnostic.messageText = [
                `The @Component decorator's host property "${key}" has a type of "${itsType}". `,
                `However, a @Component decorator's "host" can only take static data, `,
                `such as a string, number or boolean. `,
                `Please use the "hostData()" method instead `,
                `if attributes or properties need to be dynamically added to `,
                `the host element.`
            ].join('');
        }
    });
    return hostData;
}

function getElementDecoratorMeta(checker, classNode) {
    return classNode.members
        .filter(isPropertyWithDecorators)
        .reduce((membersMeta, member) => {
        const elementDecorator = member.decorators.find(isDecoratorNamed('Element'));
        if (elementDecorator) {
            membersMeta[member.name.getText()] = {
                memberType: 7 /* Element */
            };
        }
        return membersMeta;
    }, {});
}

function getEventDecoratorMeta(diagnostics, checker, classNode, sourceFile) {
    return classNode.members
        .filter(isPropertyWithDecorators)
        .reduce((membersMeta, member) => {
        const elementDecorator = member.decorators.find(isDecoratorNamed('Event'));
        if (elementDecorator == null) {
            return membersMeta;
        }
        const [eventOptions] = getDeclarationParameters(elementDecorator);
        const metadata = convertOptionsToMeta(diagnostics, eventOptions, member.name.getText());
        if (member.type) {
            const genericType = gatherEventEmitterGeneric(member.type);
            if (genericType) {
                metadata.eventType = {
                    text: genericType.getText()
                };
                if (ts.isTypeReferenceNode(genericType)) {
                    metadata.eventType.typeReferences = getAttributeTypeInfo(member, sourceFile);
                }
            }
        }
        if (metadata) {
            const symbol = checker.getSymbolAtLocation(member.name);
            metadata.jsdoc = serializeSymbol(checker, symbol);
            metadata.jsdoc.name = metadata.eventName;
            membersMeta.push(metadata);
        }
        return membersMeta;
    }, []);
}
function convertOptionsToMeta(diagnostics, rawEventOpts = {}, memberName) {
    if (!memberName) {
        return null;
    }
    return {
        eventMethodName: memberName,
        eventName: getEventName$1(diagnostics, rawEventOpts, memberName),
        eventBubbles: typeof rawEventOpts.bubbles === 'boolean' ? rawEventOpts.bubbles : true,
        eventCancelable: typeof rawEventOpts.cancelable === 'boolean' ? rawEventOpts.cancelable : true,
        eventComposed: typeof rawEventOpts.composed === 'boolean' ? rawEventOpts.composed : true
    };
}
function getEventName$1(diagnostics, rawEventOpts, memberName) {
    if (typeof rawEventOpts.eventName === 'string' && rawEventOpts.eventName.trim().length > 0) {
        // always use the event name if given
        return rawEventOpts.eventName.trim();
    }
    // event name wasn't provided
    // so let's default to use the member name
    validateEventEmitterMemeberName(diagnostics, memberName);
    return memberName;
}
function validateEventEmitterMemeberName(diagnostics, memberName) {
    const firstChar = memberName.charAt(0);
    if (/[A-Z]/.test(firstChar)) {
        const diagnostic = buildWarn(diagnostics);
        diagnostic.messageText = [
            `In order to be compatible with all event listeners on elements, the `,
            `@Event() "${memberName}" cannot start with a capital letter. `,
            `Please lowercase the first character for the event to best work with all listeners.`
        ].join('');
    }
}
function gatherEventEmitterGeneric(type) {
    if (ts.isTypeReferenceNode(type) &&
        ts.isIdentifier(type.typeName) &&
        type.typeName.text === 'EventEmitter' &&
        type.typeArguments &&
        type.typeArguments.length > 0) {
        const eeGen = type.typeArguments[0];
        return eeGen;
    }
    return null;
}

function getListenDecoratorMeta(checker, classNode) {
    const listeners = [];
    classNode.members
        .filter(isMethodWithDecorators)
        .forEach(member => {
        member.decorators
            .filter(isDecoratorNamed('Listen'))
            .map(dec => getDeclarationParameters(dec))
            .forEach(([listenText, listenOptions]) => {
            listenText.split(',').forEach(eventName => {
                const symbol = checker.getSymbolAtLocation(member.name);
                const jsdoc = serializeSymbol(checker, symbol);
                listeners.push(Object.assign({}, validateListener(eventName.trim(), listenOptions, member.name.getText()), { jsdoc }));
            });
        });
    });
    return listeners;
}
function validateListener(eventName, rawListenOpts = {}, methodName) {
    let rawEventName = eventName;
    let splt = eventName.split(':');
    if (splt.length > 2) {
        throw new Error(`@Listen can only contain one colon: ${eventName}`);
    }
    if (splt.length > 1) {
        const prefix = splt[0].toLowerCase().trim();
        if (!isValidElementRefPrefix(prefix)) {
            throw new Error(`invalid @Listen prefix "${prefix}" for "${eventName}"`);
        }
        rawEventName = splt[1].toLowerCase().trim();
    }
    splt = rawEventName.split('.');
    if (splt.length > 2) {
        throw new Error(`@Listen can only contain one period: ${eventName}`);
    }
    if (splt.length > 1) {
        const suffix = splt[1].toLowerCase().trim();
        if (!isValidKeycodeSuffix(suffix)) {
            throw new Error(`invalid @Listen suffix "${suffix}" for "${eventName}"`);
        }
        rawEventName = splt[0].toLowerCase().trim();
    }
    const listenMeta = {
        eventName: eventName,
        eventMethodName: methodName
    };
    listenMeta.eventCapture = (typeof rawListenOpts.capture === 'boolean') ? rawListenOpts.capture : false;
    listenMeta.eventPassive = (typeof rawListenOpts.passive === 'boolean') ? rawListenOpts.passive :
        // if the event name is kown to be a passive event then set it to true
        (PASSIVE_TRUE_DEFAULTS.indexOf(rawEventName.toLowerCase()) > -1);
    // default to enabled=true if it wasn't provided
    listenMeta.eventDisabled = (rawListenOpts.enabled === false);
    return listenMeta;
}
function isValidElementRefPrefix(prefix) {
    return (VALID_ELEMENT_REF_PREFIXES.indexOf(prefix) > -1);
}
function isValidKeycodeSuffix(prefix) {
    return (VALID_KEYCODE_SUFFIX.indexOf(prefix) > -1);
}
const PASSIVE_TRUE_DEFAULTS = [
    'dragstart', 'drag', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop',
    'mouseenter', 'mouseover', 'mousemove', 'mousedown', 'mouseup', 'mouseleave', 'mouseout', 'mousewheel',
    'pointerover', 'pointerenter', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerout', 'pointerleave',
    'resize',
    'scroll',
    'touchstart', 'touchmove', 'touchend', 'touchenter', 'touchleave', 'touchcancel',
    'wheel',
];
const VALID_ELEMENT_REF_PREFIXES = [
    'child', 'parent', 'body', 'document', 'window'
];
const VALID_KEYCODE_SUFFIX = [
    'enter', 'escape', 'space', 'tab', 'up', 'right', 'down', 'left'
];

function validatePublicName(diagnostics, componentClass, memberName, decorator, memberType) {
    if (isReservedMember(memberName)) {
        const diagnostic = buildWarn(diagnostics);
        diagnostic.messageText = [
            `The ${decorator} name "${memberName}" used within the "${componentClass}" class is a reserved public name. `,
            `Please rename the "${memberName}" ${memberType} so it does not conflict with an existing standardized prototype member. `,
            `Reusing ${memberType} names that are already defined on the element's prototype may cause `,
            `unexpected runtime errors or user-interface issues on various browsers, so it's best to avoid them entirely.`
        ].join('');
    }
}
const READ_ONLY_PROPERTIES = [
    'attributes',
    'baseURI',
    'childElementCount',
    'childNodes',
    'children',
    'classList',
    'clientHeight',
    'clientLeft',
    'clientTop',
    'clientWidth',
    'contentEditable',
    'dataset',
    'firstChild',
    'firstElementChild',
    'host',
    'is',
    'isConnected',
    'isContentEditable',
    'lastChild',
    'lastElementChild',
    'localName',
    'namespaceURI',
    'nextElementSibling',
    'nextSibling',
    'nodeName',
    'nodePrincipal',
    'nodeType',
    'nodeValue',
    'offsetHeight',
    'offsetLeft',
    'offsetParent',
    'offsetTop',
    'offsetWidth',
    'ownerDocument',
    'parentElement',
    'parentNode',
    'prefix',
    'previousElementSibling',
    'previousSibling',
    'rootNode',
    'runtimeStyle',
    'scrollHeight',
    'scrollLeft',
    'scrollLeftMax',
    'scrollTop',
    'scrollTopMax',
    'scrollWidth',
    'shadowRoot',
    'slot',
    'tagName',
    'title',
];
const METHODS = [
    'addEventListener',
    'after',
    'animate',
    'append',
    'appendChild',
    'attachEvent',
    'attachShadow',
    'before',
    'blur',
    'click',
    'cloneNode',
    'closest',
    'compareDocumentPosition',
    'contains',
    'detachEvent',
    'dispatchEvent',
    'fireEvent',
    'focus',
    'getAttribute',
    'getAttributeNames',
    'getAttributeNode',
    'getAttributeNodeNS',
    'getAttributeNS',
    'getBoundingClientRect',
    'getClientRects',
    'getElementsByClassName',
    'getElementsByTagName',
    'getElementsByTagNameNS',
    'getRootNode',
    'getUserData',
    'hasAttribute',
    'hasAttributeNS',
    'hasAttributes',
    'hasChildNodes',
    'insertAdjacentElement',
    'insertAdjacentHTML',
    'insertAdjacentText',
    'insertBefore',
    'isDefaultNamespace',
    'isEqualNode',
    'isSameNode',
    'isSupported',
    'lookupNamespaceURI',
    'lookupPrefix',
    'matches',
    'normalize',
    'prepend',
    'querySelector',
    'querySelectorAll',
    'querySelectorAll',
    'releasePointerCapture',
    'removeChild',
    'remove',
    'removeAttribute',
    'removeAttributeNode',
    'removeAttributeNS',
    'removeEventListener',
    'replaceChild',
    'replaceWith',
    'requestFullscreen',
    'requestPointerLock',
    'scrollIntoView',
    'scrollIntoViewIfNeeded',
    'setAttribute',
    'setAttributeNode',
    'setAttributeNodeNS',
    'setAttributeNS',
    'setCapture',
    'setPointerCapture',
];
const EVENT_HANDLERS = [
    'onabort',
    'onanimationend',
    'onanimationendcapture',
    'onanimationiteration',
    'onanimationiterationcapture',
    'onanimationstart',
    'onanimationstartcapture',
    'onauxclick',
    'onbeforecopy',
    'onbeforecut',
    'onbeforepaste',
    'onblur',
    'onblurcapture',
    'oncancel',
    'oncanplaythrough',
    'onchange',
    'onchangecapture',
    'onclick',
    'onclickcapture',
    'onclose',
    'oncompositionend',
    'oncompositionendcapture',
    'oncompositionstart',
    'oncompositionstartcapture',
    'oncompositionupdate',
    'oncompositionupdatecapture',
    'oncontextmenu',
    'oncontextmenucapture',
    'oncopy',
    'oncopycapture',
    'oncuechange',
    'oncut',
    'oncutcapture',
    'ondblclick',
    'ondblclickcapture',
    'ondrag',
    'ondragcapture',
    'ondragend',
    'ondragendcapture',
    'ondragenter',
    'ondragentercapture',
    'ondragexit',
    'ondragexitcapture',
    'ondragleave',
    'ondragleavecapture',
    'ondragover',
    'ondragovercapture',
    'ondragstart',
    'ondragstartcapture',
    'ondrop',
    'ondropcapture',
    'ondurationchange',
    'onemptied',
    'onended',
    'onerror',
    'onerrorcapture',
    'onfocus',
    'onfocuscapture',
    'onfullscreenchange',
    'onfullscreenerror',
    'ongotpointercapture',
    'oninput',
    'oninputcapture',
    'oninvalid',
    'oninvalidcapture',
    'onkeydown',
    'onkeydowncapture',
    'onkeypress',
    'onkeypresscapture',
    'onkeyup',
    'onkeyupcapture',
    'onload',
    'onloadcapture',
    'onloadeddata',
    'onloadedmetadata',
    'onloadstart',
    'onlostpointercapture',
    'onmousedown',
    'onmousedowncapture',
    'onmouseenter',
    'onmouseleave',
    'onmousemove',
    'onmousemovecapture',
    'onmouseout',
    'onmouseoutcapture',
    'onmouseover',
    'onmouseovercapture',
    'onmouseup',
    'onmouseupcapture',
    'onpaste',
    'onpastecapture',
    'onpause',
    'onplay',
    'onplaying',
    'onpointercancel',
    'onpointerdown',
    'onpointerenter',
    'onpointerleave',
    'onpointermove',
    'onpointerout',
    'onpointerover',
    'onpointerup',
    'onprogress',
    'onratechange',
    'onreset',
    'onresetcapture',
    'onresize',
    'onscroll',
    'onscrollcapture',
    'onsearch',
    'onseeked',
    'onseeking',
    'onselectstart',
    'onstalled',
    'onsubmit',
    'onsubmitcapture',
    'onsuspend',
    'ontimeupdate',
    'ontoggle',
    'ontouchcancel',
    'ontouchcancelcapture',
    'ontouchend',
    'ontouchendcapture',
    'ontouchmove',
    'ontouchmovecapture',
    'ontouchstart',
    'ontouchstartcapture',
    'ontransitionend',
    'ontransitionendcapture',
    'onvolumechange',
    'onwaiting',
    'onwebkitfullscreenchange',
    'onwebkitfullscreenerror',
    'onwheel',
    'onwheelcapture',
];
const RESERVED_PUBLIC_MEMBERS = [
    ...READ_ONLY_PROPERTIES,
    ...METHODS,
    ...EVENT_HANDLERS
].map(p => p.toLowerCase());
function isReservedMember(memberName) {
    memberName = memberName.toLowerCase();
    return RESERVED_PUBLIC_MEMBERS.includes(memberName);
}

function getMethodDecoratorMeta(diagnostics, checker, classNode, sourceFile, componentClass) {
    return classNode.members
        .filter(isMethodWithDecorators)
        .reduce((membersMeta, member) => {
        const methodDecorator = member.decorators.find(isDecoratorNamed('Method'));
        if (methodDecorator == null) {
            return membersMeta;
        }
        const symbol = checker.getSymbolAtLocation(member.name);
        const methodName = member.name.getText();
        const methodSignature = checker.getSignatureFromDeclaration(member);
        const flags = ts.TypeFormatFlags.WriteArrowStyleSignature;
        const returnType = checker.getReturnTypeOfSignature(methodSignature);
        const typeString = checker.signatureToString(methodSignature, classNode, flags, ts.SignatureKind.Call);
        let methodReturnTypes = {};
        const returnTypeNode = checker.typeToTypeNode(returnType);
        if (returnTypeNode) {
            methodReturnTypes = getAttributeTypeInfo(returnTypeNode, sourceFile);
        }
        validatePublicName(diagnostics, componentClass, methodName, '@Method()', 'method');
        membersMeta[methodName] = {
            memberType: 6 /* Method */,
            attribType: {
                text: typeString,
                typeReferences: Object.assign({}, methodReturnTypes, getAttributeTypeInfo(member, sourceFile))
            },
            jsdoc: serializeSymbol(checker, symbol)
        };
        return membersMeta;
    }, {});
}

function getPropDecoratorMeta(diagnostics, checker, classNode, sourceFile, componentClass) {
    return classNode.members
        .filter(member => Array.isArray(member.decorators) && member.decorators.length > 0)
        .reduce((allMembers, prop) => {
        const memberData = {};
        const propDecorator = prop.decorators.find(isDecoratorNamed('Prop'));
        if (propDecorator == null) {
            return allMembers;
        }
        const propOptions = getPropOptions(propDecorator, diagnostics);
        const memberName = prop.name.text;
        const symbol = checker.getSymbolAtLocation(prop.name);
        if (propOptions && typeof propOptions.connect === 'string') {
            // @Prop({ connect: 'ion-alert-controller' })
            memberData.memberType = 4 /* PropConnect */;
            memberData.ctrlId = propOptions.connect;
        }
        else if (propOptions && typeof propOptions.context === 'string') {
            // @Prop({ context: 'config' })
            memberData.memberType = 3 /* PropContext */;
            memberData.ctrlId = propOptions.context;
        }
        else {
            // @Prop()
            const type = checker.getTypeAtLocation(prop);
            validatePublicName(diagnostics, componentClass, memberName, '@Prop()', 'property');
            memberData.memberType = getMemberType(propOptions);
            memberData.attribName = getAttributeName(propOptions, memberName);
            memberData.attribType = getAttribType(diagnostics, sourceFile, prop);
            memberData.reflectToAttrib = getReflectToAttr(propOptions);
            memberData.propType = propTypeFromTSType(type, memberData.attribType.text);
            memberData.jsdoc = serializeSymbol(checker, symbol);
        }
        allMembers[memberName] = memberData;
        return allMembers;
    }, {});
}
function getPropOptions(propDecorator, diagnostics) {
    const suppliedOptions = propDecorator.expression.arguments
        .map(arg => {
        try {
            const fnStr = `return ${arg.getText()};`;
            return new Function(fnStr)();
        }
        catch (e) {
            catchError(diagnostics, e, `parse prop options: ${e}`);
        }
    });
    const propOptions = suppliedOptions[0];
    return propOptions;
}
function getMemberType(propOptions) {
    if (propOptions && propOptions.mutable === true) {
        return 2 /* PropMutable */;
    }
    return 1 /* Prop */;
}
function getAttributeName(propOptions, memberName) {
    if (propOptions && typeof propOptions.attr === 'string' && propOptions.attr.trim().length > 0) {
        return propOptions.attr.trim();
    }
    return toDashCase(memberName);
}
function getReflectToAttr(propOptions) {
    if (propOptions && propOptions.reflectToAttr === true) {
        return true;
    }
    return false;
}
function getAttribType(diagnostics, sourceFile, prop) {
    let attribType;
    // If the @Prop() attribute does not have a defined type then infer it
    if (!prop.type) {
        let attribTypeText = inferPropType(prop.initializer);
        if (!attribTypeText) {
            attribTypeText = 'any';
            const diagnostic = buildWarn(diagnostics);
            diagnostic.messageText = `Prop type provided is not supported, defaulting to any: '${prop.getFullText()}'`;
        }
        attribType = {
            text: attribTypeText,
        };
    }
    else {
        attribType = {
            text: prop.type.getText(),
            typeReferences: getAttributeTypeInfo(prop.type, sourceFile)
        };
    }
    return attribType;
}
function inferPropType(expression) {
    if (expression == null) {
        return undefined;
    }
    if (ts.isStringLiteral(expression)) {
        return 'string';
    }
    if (ts.isNumericLiteral(expression)) {
        return 'number';
    }
    if ([ts.SyntaxKind.BooleanKeyword, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].indexOf(expression.kind) !== -1) {
        return 'boolean';
    }
    if ((ts.SyntaxKind.NullKeyword === expression.kind) ||
        (ts.SyntaxKind.UndefinedKeyword === expression.kind) ||
        (ts.isRegularExpressionLiteral(expression)) ||
        (ts.isArrayLiteralExpression(expression)) ||
        (ts.isObjectLiteralExpression(expression))) {
        return 'any';
    }
    return undefined;
}
function propTypeFromTSType(type, text) {
    const isStr = checkType(type, isString);
    const isNu = checkType(type, isNumber);
    const isBool = checkType(type, isBoolean);
    // if type is more than a primitive type at the same time, we mark it as any
    if (Number(isStr) + Number(isNu) + Number(isBool) > 1) {
        return 1 /* Any */;
    }
    // at this point we know the prop's type is NOT the mix of primitive types
    if (isStr) {
        return 2 /* String */;
    }
    if (isNu) {
        return 4 /* Number */;
    }
    if (isBool) {
        return 3 /* Boolean */;
    }
    if (text === 'any') {
        return 1 /* Any */;
    }
    return 0 /* Unknown */;
}
function checkType(type, check) {
    if (type.flags & ts.TypeFlags.Union) {
        const union = type;
        if (union.types.some(type => checkType(type, check))) {
            return true;
        }
    }
    return check(type);
}
function isBoolean(t) {
    if (t) {
        return !!(t.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLike | ts.TypeFlags.BooleanLike));
    }
    return false;
}
function isNumber(t) {
    if (t) {
        return !!(t.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLike | ts.TypeFlags.NumberLiteral));
    }
    return false;
}
function isString(t) {
    if (t) {
        return !!(t.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral));
    }
    return false;
}

function getStateDecoratorMeta(classNode) {
    return classNode.members
        .filter(isPropertyWithDecorators)
        .reduce((membersMeta, member) => {
        const elementDecorator = member.decorators.find(isDecoratorNamed('State'));
        if (elementDecorator) {
            membersMeta[member.name.getText()] = {
                memberType: 5 /* State */
            };
        }
        return membersMeta;
    }, {});
}

function getWatchDecoratorMeta(diagnostics, classNode, cmpMeta) {
    const methods = classNode.members.filter(isMethodWithDecorators);
    getChangeMetaByName(diagnostics, methods, cmpMeta, 'Watch');
    getChangeMetaByName(diagnostics, methods, cmpMeta, 'PropWillChange');
    getChangeMetaByName(diagnostics, methods, cmpMeta, 'PropDidChange');
}
function getChangeMetaByName(diagnostics, methods, cmpMeta, decoratorName) {
    methods.forEach(({ decorators, name }) => {
        decorators
            .filter(isDecoratorNamed(decoratorName))
            .forEach(propChangeDecorator => {
            const [propName] = getDeclarationParameters(propChangeDecorator);
            if (propName) {
                updateWatchCallback(diagnostics, cmpMeta, propName, name, decoratorName);
            }
        });
    });
}
function updateWatchCallback(diagnostics, cmpMeta, propName, decoratorData, decoratorName) {
    if (!isPropWatchable(cmpMeta, propName)) {
        const error = buildError(diagnostics);
        error.messageText = `@Watch('${propName}') is trying to watch for changes in a property that does not exist.
Make sure only properties decorated with @State() or @Prop() are watched.`;
        return;
    }
    cmpMeta.membersMeta[propName].watchCallbacks = cmpMeta.membersMeta[propName].watchCallbacks || [];
    cmpMeta.membersMeta[propName].watchCallbacks.push(decoratorData.getText());
    if (decoratorName === 'PropWillChange' || decoratorName === 'PropDidChange') {
        const diagnostic = buildWarn(diagnostics);
        diagnostic.messageText = `@${decoratorName}('${propName}') decorator within "${cmpMeta.tagNameMeta}" component has been deprecated. Please update to @Watch('${propName}').`;
    }
}
function isPropWatchable(cmpMeta, propName) {
    const membersMeta = cmpMeta.membersMeta;
    if (!membersMeta) {
        return false;
    }
    const member = membersMeta[propName];
    if (!member) {
        return false;
    }
    const type = member.memberType;
    return type === 5 /* State */ || type === 1 /* Prop */ || type === 2 /* PropMutable */;
}

function normalizeAssetsDir(config, componentFilePath, assetsMetas) {
    return assetsMetas.map((assetMeta) => {
        return Object.assign({}, assetMeta, normalizeAssetDir(config, componentFilePath, assetMeta.originalComponentPath));
    });
}
function normalizeAssetDir(config, componentFilePath, assetsDir) {
    const assetsMeta = {};
    // get the absolute path of the directory which the component is sitting in
    const componentDir = normalizePath(config.sys.path.dirname(componentFilePath));
    // get the relative path from the component file to the assets directory
    assetsDir = normalizePath(assetsDir.trim());
    if (config.sys.path.isAbsolute(assetsDir)) {
        // this path is absolute already!
        // add as the absolute path
        assetsMeta.absolutePath = assetsDir;
        // if this is an absolute path already, let's convert it to be relative
        assetsMeta.cmpRelativePath = config.sys.path.relative(componentDir, assetsDir);
    }
    else {
        // this path is relative to the component
        assetsMeta.cmpRelativePath = assetsDir;
        // create the absolute path to the asset dir
        assetsMeta.absolutePath = pathJoin(config, componentDir, assetsDir);
    }
    return assetsMeta;
}

function normalizeStyles(config, componentFilePath, stylesMeta) {
    const newStylesMeta = {};
    Object.keys(stylesMeta).forEach((modeName) => {
        newStylesMeta[modeName] = {
            externalStyles: []
        };
        const externalStyles = stylesMeta[modeName].externalStyles || [];
        newStylesMeta[modeName].externalStyles = externalStyles.map(externalStyle => {
            const { cmpRelativePath, absolutePath } = normalizeModeStylePaths(config, componentFilePath, externalStyle.originalComponentPath);
            const normalizedExternalStyles = {
                absolutePath: absolutePath,
                cmpRelativePath: cmpRelativePath,
                originalComponentPath: externalStyle.originalComponentPath,
                originalCollectionPath: externalStyle.originalCollectionPath
            };
            return normalizedExternalStyles;
        });
        if (typeof stylesMeta[modeName].styleStr === 'string') {
            newStylesMeta[modeName].styleStr = stylesMeta[modeName].styleStr;
        }
    });
    return newStylesMeta;
}
function normalizeModeStylePaths(config, componentFilePath, stylePath) {
    let cmpRelativePath;
    let absolutePath;
    // get the absolute path of the directory which the component is sitting in
    const componentDir = normalizePath(config.sys.path.dirname(componentFilePath));
    // get the relative path from the component file to the style
    let componentRelativeStylePath = normalizePath(stylePath.trim());
    if (config.sys.path.isAbsolute(componentRelativeStylePath)) {
        // this path is absolute already!
        // add to our list of style absolute paths
        absolutePath = componentRelativeStylePath;
        // if this is an absolute path already, let's convert it to be relative
        componentRelativeStylePath = config.sys.path.relative(componentDir, componentRelativeStylePath);
        // add to our list of style relative paths
        cmpRelativePath = componentRelativeStylePath;
    }
    else {
        // this path is relative to the component
        // add to our list of style relative paths
        cmpRelativePath = componentRelativeStylePath;
        // create the absolute path to the style file
        const absoluteStylePath = normalizePath(config.sys.path.join(componentDir, componentRelativeStylePath));
        // add to our list of style absolute paths
        absolutePath = absoluteStylePath;
    }
    return {
        cmpRelativePath,
        absolutePath
    };
}

function validateComponentClass(diagnostics, cmpMeta, classNode) {
    requiresReturnStatement(diagnostics, cmpMeta, classNode, 'hostData');
    requiresReturnStatement(diagnostics, cmpMeta, classNode, 'render');
}
function requiresReturnStatement(diagnostics, cmpMeta, classNode, methodName) {
    const classElm = classNode.members.find(m => isMethod(m, methodName));
    if (!classElm)
        return;
    let hasReturn = false;
    function visitNode(node) {
        if (node.kind === ts.SyntaxKind.ReturnStatement) {
            hasReturn = true;
        }
        ts.forEachChild(node, visitNode);
    }
    ts.forEachChild(classElm, visitNode);
    if (!hasReturn) {
        const diagnostic = buildWarn(diagnostics);
        diagnostic.messageText = `The "${methodName}()" method within the "${cmpMeta.tagNameMeta}" component is missing a "return" statement.`;
    }
}

function gatherMetadata(config, compilerCtx, buildCtx, typeChecker) {
    return (transformContext) => {
        function visit(node, tsSourceFile, moduleFile) {
            if (node.kind === ts.SyntaxKind.ImportDeclaration) {
                getCollections(config, compilerCtx, buildCtx.collections, moduleFile, node);
            }
            if (ts.isClassDeclaration(node)) {
                const cmpMeta = visitClass(buildCtx.diagnostics, typeChecker, node, tsSourceFile);
                if (cmpMeta) {
                    moduleFile.cmpMeta = cmpMeta;
                    cmpMeta.stylesMeta = normalizeStyles(config, moduleFile.sourceFilePath, cmpMeta.stylesMeta);
                    cmpMeta.assetsDirsMeta = normalizeAssetsDir(config, moduleFile.sourceFilePath, cmpMeta.assetsDirsMeta);
                }
            }
            return ts.visitEachChild(node, (node) => {
                return visit(node, tsSourceFile, moduleFile);
            }, transformContext);
        }
        return (tsSourceFile) => {
            const moduleFile = getModuleFile(compilerCtx, tsSourceFile.fileName);
            moduleFile.externalImports.length = 0;
            moduleFile.localImports.length = 0;
            return visit(tsSourceFile, tsSourceFile, moduleFile);
        };
    };
}
function visitClass(diagnostics, typeChecker, classNode, sourceFile) {
    const cmpMeta = getComponentDecoratorMeta(diagnostics, typeChecker, classNode);
    if (!cmpMeta) {
        return null;
    }
    const componentClass = classNode.name.getText().trim();
    cmpMeta.componentClass = componentClass;
    cmpMeta.membersMeta = Object.assign({}, getElementDecoratorMeta(typeChecker, classNode), getMethodDecoratorMeta(diagnostics, typeChecker, classNode, sourceFile, componentClass), getStateDecoratorMeta(classNode), getPropDecoratorMeta(diagnostics, typeChecker, classNode, sourceFile, componentClass));
    cmpMeta.eventsMeta = getEventDecoratorMeta(diagnostics, typeChecker, classNode, sourceFile);
    cmpMeta.listenersMeta = getListenDecoratorMeta(typeChecker, classNode);
    // watch meta collection MUST happen after prop/state decorator meta collection
    getWatchDecoratorMeta(diagnostics, classNode, cmpMeta);
    // validate the user's component class for any common errors
    validateComponentClass(diagnostics, cmpMeta, classNode);
    // Return Class Declaration with Decorator removed and as default export
    return cmpMeta;
}

function getModuleImports(config, compilerCtx) {
    return (transformContext) => {
        function visitImport(moduleFile, dirPath, importNode) {
            if (importNode.moduleSpecifier && ts.isStringLiteral(importNode.moduleSpecifier)) {
                let importPath = importNode.moduleSpecifier.text;
                if (config.sys.path.isAbsolute(importPath)) {
                    importPath = normalizePath(importPath);
                    moduleFile.localImports.push(importPath);
                }
                else if (importPath.startsWith('.')) {
                    importPath = normalizePath(config.sys.path.resolve(dirPath, importPath));
                    moduleFile.localImports.push(importPath);
                }
                else {
                    moduleFile.externalImports.push(importPath);
                }
            }
            return importNode;
        }
        function visit(moduleFile, dirPath, node) {
            switch (node.kind) {
                case ts.SyntaxKind.ImportDeclaration:
                    return visitImport(moduleFile, dirPath, node);
                default:
                    return ts.visitEachChild(node, (node) => {
                        return visit(moduleFile, dirPath, node);
                    }, transformContext);
            }
        }
        return (tsSourceFile) => {
            const moduleFile = getModuleFile(compilerCtx, tsSourceFile.fileName);
            const dirPath = config.sys.path.dirname(tsSourceFile.fileName);
            return visit(moduleFile, dirPath, tsSourceFile);
        };
    };
}

/**
 * Ok, so formatting overkill, we know. But whatever, it makes for great
 * error reporting within a terminal. So, yeah, let's code it up, shall we?
 */
function loadTypeScriptDiagnostics(config, resultsDiagnostics, tsDiagnostics) {
    const maxErrors = Math.min(tsDiagnostics.length, MAX_ERRORS);
    for (let i = 0; i < maxErrors; i++) {
        resultsDiagnostics.push(loadDiagnostic(config, tsDiagnostics[i]));
    }
}
function loadDiagnostic(config, tsDiagnostic) {
    const d = {
        level: 'warn',
        type: 'typescript',
        language: 'typescript',
        header: 'TypeScript',
        code: tsDiagnostic.code.toString(),
        messageText: formatMessageText(tsDiagnostic),
        relFilePath: null,
        absFilePath: null,
        lines: []
    };
    if (tsDiagnostic.category === ts.DiagnosticCategory.Error) {
        d.level = 'error';
    }
    if (tsDiagnostic.file) {
        d.absFilePath = normalizePath(tsDiagnostic.file.fileName);
        if (config) {
            d.relFilePath = normalizePath(config.sys.path.relative(config.cwd, d.absFilePath));
            if (!d.relFilePath.includes('/')) {
                d.relFilePath = './' + d.relFilePath;
            }
        }
        const sourceText = tsDiagnostic.file.text;
        const srcLines = splitLineBreaks(sourceText);
        const posData = tsDiagnostic.file.getLineAndCharacterOfPosition(tsDiagnostic.start);
        const errorLine = {
            lineIndex: posData.line,
            lineNumber: posData.line + 1,
            text: srcLines[posData.line],
            errorCharStart: posData.character,
            errorLength: Math.max(tsDiagnostic.length, 1)
        };
        d.lineNumber = errorLine.lineNumber;
        d.columnNumber = errorLine.errorCharStart;
        d.lines.push(errorLine);
        if (errorLine.errorLength === 0 && errorLine.errorCharStart > 0) {
            errorLine.errorLength = 1;
            errorLine.errorCharStart--;
        }
        if (errorLine.lineIndex > 0) {
            const previousLine = {
                lineIndex: errorLine.lineIndex - 1,
                lineNumber: errorLine.lineNumber - 1,
                text: srcLines[errorLine.lineIndex - 1],
                errorCharStart: -1,
                errorLength: -1
            };
            d.lines.unshift(previousLine);
        }
        if (errorLine.lineIndex + 1 < srcLines.length) {
            const nextLine = {
                lineIndex: errorLine.lineIndex + 1,
                lineNumber: errorLine.lineNumber + 1,
                text: srcLines[errorLine.lineIndex + 1],
                errorCharStart: -1,
                errorLength: -1
            };
            d.lines.push(nextLine);
        }
    }
    return d;
}
function formatMessageText(tsDiagnostic) {
    let diagnosticChain = tsDiagnostic.messageText;
    if (typeof diagnosticChain === 'string') {
        return diagnosticChain;
    }
    const ignoreCodes = [];
    const isStencilConfig = tsDiagnostic.file.fileName.includes('stencil.config');
    if (isStencilConfig) {
        ignoreCodes.push(2322);
    }
    let result = '';
    while (diagnosticChain) {
        if (!ignoreCodes.includes(diagnosticChain.code)) {
            result += diagnosticChain.messageText + ' ';
        }
        diagnosticChain = diagnosticChain.next;
    }
    if (isStencilConfig) {
        result = result.replace(`type 'StencilConfig'`, `Stencil Config`);
        result = result.replace(`Object literal may only specify known properties, but `, ``);
        result = result.replace(`Object literal may only specify known properties, and `, ``);
    }
    return result.trim();
}

function removeCollectionImports(compilerCtx) {
    /*
  
      // remove side effect collection imports like:
      import 'ionicons';
  
      // do not remove collection imports with importClauses:
      import * as asdf 'ionicons';
      import { asdf } '@ionic/core';
  
    */
    return (transformContext) => {
        function visitImport(importNode) {
            if (!importNode.importClause && importNode.moduleSpecifier && ts.isStringLiteral(importNode.moduleSpecifier)) {
                // must not have an import clause
                // must have a module specifier and
                // the module specifier must be a string literal
                const moduleImport = importNode.moduleSpecifier.text;
                // test if this side effect import is a collection
                const isCollectionImport = compilerCtx.collections.some(c => {
                    return c.collectionName === moduleImport;
                });
                if (isCollectionImport) {
                    // turns out this is a side effect import is a collection,
                    // we actually don't want to include this in the JS output
                    // we've already gather the types we needed, kthxbai
                    return null;
                }
            }
            return importNode;
        }
        function visit(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ImportDeclaration:
                    return visitImport(node);
                default:
                    return ts.visitEachChild(node, visit, transformContext);
            }
        }
        return (tsSourceFile) => {
            return visit(tsSourceFile);
        };
    };
}

const CLASS_DECORATORS_TO_REMOVE = new Set(['Component']);
// same as the "declare" variables in the root index.ts file
const DECORATORS_TO_REMOVE = new Set([
    'Element',
    'Event',
    'Listen',
    'Method',
    'Prop',
    'PropDidChange',
    'PropWillChange',
    'State',
    'Watch'
]);
/**
 * Remove all decorators that are for metadata purposes
 */
function removeDecorators() {
    return (transformContext) => {
        function visit(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    if (!isComponentClass(node)) {
                        return node;
                    }
                    return visitComponentClass(node);
                default:
                    return ts.visitEachChild(node, visit, transformContext);
            }
        }
        return (tsSourceFile) => visit(tsSourceFile);
    };
}
/**
 * Visit the component class and remove decorators
 * @param classNode
 */
function visitComponentClass(classNode) {
    classNode.decorators = removeDecoratorsByName(classNode.decorators, CLASS_DECORATORS_TO_REMOVE);
    classNode.members.forEach((member) => {
        if (Array.isArray(member.decorators)) {
            member.decorators = removeDecoratorsByName(member.decorators, DECORATORS_TO_REMOVE);
        }
    });
    return classNode;
}
/**
 * Remove a decorator from the an array by name
 * @param decorators array of decorators
 * @param name name to remove
 */
function removeDecoratorsByName(decoratorList, names) {
    const updatedDecoratorList = decoratorList.filter(dec => {
        const toRemove = ts.isCallExpression(dec.expression) &&
            ts.isIdentifier(dec.expression.expression) &&
            names.has(dec.expression.expression.text);
        return !toRemove;
    });
    if (updatedDecoratorList.length === 0 && decoratorList.length > 0) {
        return undefined;
    }
    if (updatedDecoratorList.length !== decoratorList.length) {
        return ts.createNodeArray(updatedDecoratorList);
    }
    return decoratorList;
}

function removeStencilImports() {
    return (transformContext) => {
        function visitImport(importNode) {
            if (importNode.moduleSpecifier &&
                ts.isStringLiteral(importNode.moduleSpecifier) &&
                importNode.moduleSpecifier.text === '@stencil/core') {
                return null;
            }
            return importNode;
        }
        function visit(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ImportDeclaration:
                    return visitImport(node);
                default:
                    return ts.visitEachChild(node, visit, transformContext);
            }
        }
        return (tsSourceFile) => {
            return visit(tsSourceFile);
        };
    };
}

var __awaiter$l = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function transpileService(config, compilerCtx, buildCtx) {
    return __awaiter$l(this, void 0, void 0, function* () {
        let changedTsFiles;
        if (shouldScanForTsChanges(compilerCtx, buildCtx)) {
            // either we haven't figured out all the root ts files yet
            // or we already know we need to do a full rebuild
            // or new files were added or deleted
            // so let's scan the entire src directory looking for ts files to transpile
            // rootTsFiles always used as a way to know the active modules being used
            // basically so our cache knows which stuff we can forget about
            compilerCtx.rootTsFiles = yield scanDirForTsFiles(config, compilerCtx, buildCtx);
            changedTsFiles = compilerCtx.rootTsFiles.slice();
        }
        else {
            changedTsFiles = buildCtx.filesChanged.filter(filePath => {
                // do transpiling if one of the changed files is a ts file
                // and the changed file is not the components.d.ts file
                // when the components.d.ts file is written to disk it shouldn't cause a new build
                return isFileIncludePath(config, filePath);
            });
        }
        if (!compilerCtx.tsService) {
            // create the typescript language service
            const timeSpan = buildCtx.createTimeSpan(`buildTsService started`, true);
            compilerCtx.tsService = yield buildTsService(config, compilerCtx, buildCtx);
            timeSpan.finish(`buildTsService finished`);
        }
        const doTranspile = (changedTsFiles.length > 0);
        if (doTranspile) {
            // we've found ts files we need to tranpsile
            // or at least one ts file has changed
            const timeSpan = buildCtx.createTimeSpan(`transpile started`);
            // only use the file system cache when it's enabled and this is the first build
            const useFsCache = config.enableCache && !buildCtx.isRebuild;
            // go ahead and kick off the ts service
            yield compilerCtx.tsService(compilerCtx, buildCtx, changedTsFiles, true, useFsCache);
            timeSpan.finish(`transpile finished`);
        }
        return doTranspile;
    });
}
function buildTsService(config, compilerCtx, buildCtx) {
    return __awaiter$l(this, void 0, void 0, function* () {
        const transpileCtx = {
            compilerCtx: compilerCtx,
            buildCtx: buildCtx,
            configKey: null,
            snapshotVersions: new Map(),
            filesFromFsCache: [],
            hasQueuedTsServicePrime: false
        };
        const userCompilerOptions = yield getUserCompilerOptions(config, transpileCtx.compilerCtx);
        const compilerOptions = Object.assign({}, userCompilerOptions);
        compilerOptions.isolatedModules = false;
        compilerOptions.suppressOutputPathCheck = true;
        compilerOptions.allowNonTsExtensions = true;
        compilerOptions.lib = undefined;
        compilerOptions.types = undefined;
        compilerOptions.noEmit = undefined;
        compilerOptions.noEmitOnError = undefined;
        compilerOptions.paths = undefined;
        compilerOptions.rootDirs = undefined;
        compilerOptions.declaration = undefined;
        compilerOptions.declarationDir = undefined;
        compilerOptions.out = undefined;
        compilerOptions.outFile = undefined;
        compilerOptions.outDir = undefined;
        // create a config key that will be used as part of the file's cache key
        transpileCtx.configKey = createConfiKey(config, compilerOptions);
        const servicesHost = {
            getScriptFileNames: () => transpileCtx.compilerCtx.rootTsFiles,
            getScriptVersion: (filePath) => transpileCtx.snapshotVersions.get(filePath),
            getScriptSnapshot: (filePath) => {
                try {
                    const sourceText = transpileCtx.compilerCtx.fs.readFileSync(filePath);
                    return ts.ScriptSnapshot.fromString(sourceText);
                }
                catch (e) { }
                return undefined;
            },
            getCurrentDirectory: () => config.cwd,
            getCompilationSettings: () => compilerOptions,
            getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
            fileExists: (filePath) => transpileCtx.compilerCtx.fs.accessSync(filePath),
            readFile: (filePath) => {
                try {
                    return transpileCtx.compilerCtx.fs.readFileSync(filePath);
                }
                catch (e) { }
                return undefined;
            },
            readDirectory: ts.sys.readDirectory,
            getCustomTransformers: () => {
                const typeChecker = services.getProgram().getTypeChecker();
                return {
                    before: [
                        gatherMetadata(config, transpileCtx.compilerCtx, transpileCtx.buildCtx, typeChecker),
                        removeDecorators(),
                        addComponentMetadata(transpileCtx.compilerCtx.moduleFiles),
                    ],
                    after: [
                        removeStencilImports(),
                        removeCollectionImports(transpileCtx.compilerCtx),
                        getModuleImports(config, transpileCtx.compilerCtx),
                        componentDependencies(transpileCtx.compilerCtx)
                    ]
                };
            }
        };
        // create our typescript language service to be reused
        const services = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
        // return the function we'll continually use on each rebuild
        return (compilerCtx, buildCtx, tsFilePaths, checkCacheKey, useFsCache) => __awaiter$l(this, void 0, void 0, function* () {
            transpileCtx.compilerCtx = compilerCtx;
            transpileCtx.buildCtx = buildCtx;
            // ensure components.d.ts isn't in the transpile (for now)
            const cmpDts = getComponentsDtsSrcFilePath(config);
            tsFilePaths = tsFilePaths.filter(tsFilePath => tsFilePath !== cmpDts);
            // loop through each ts file that has changed
            yield Promise.all(tsFilePaths.map((tsFilePath) => __awaiter$l(this, void 0, void 0, function* () {
                yield tranpsileTsFile(config, services, transpileCtx, tsFilePath, checkCacheKey, useFsCache);
            })));
            if (config.watch && !transpileCtx.hasQueuedTsServicePrime) {
                // prime the ts service cache for all the ts files pulled from the file system cache
                transpileCtx.hasQueuedTsServicePrime = true;
                primeTsServiceCache(transpileCtx);
            }
        });
    });
}
function tranpsileTsFile(config, services, ctx, tsFilePath, checkCacheKey, useFsCache) {
    return __awaiter$l(this, void 0, void 0, function* () {
        if (!ctx.buildCtx.isActiveBuild) {
            ctx.buildCtx.debug(`tranpsileTsFile aborted, not active build: ${tsFilePath}`);
            return;
        }
        if (ctx.buildCtx.hasError) {
            ctx.buildCtx.debug(`tranpsileTsFile aborted: ${tsFilePath}`);
            return;
        }
        // look up the old cache key using the ts file path
        const oldCacheKey = ctx.snapshotVersions.get(tsFilePath);
        // read the file content to be transpiled
        const content = yield ctx.compilerCtx.fs.readFile(tsFilePath);
        // create a cache key out of the content and compiler options
        const cacheKey = `transpileService_${config.sys.generateContentHash(content + tsFilePath + ctx.configKey, 32)}`;
        if (oldCacheKey === cacheKey && checkCacheKey) {
            // file is unchanged, thanks typescript caching!
            return;
        }
        // save the cache key for future lookups
        ctx.snapshotVersions.set(tsFilePath, cacheKey);
        let ensureExternalImports = null;
        if (useFsCache) {
            // let's check to see if we've already cached this in our filesystem
            // but only bother for the very first build
            const cachedStr = yield ctx.compilerCtx.cache.get(cacheKey);
            if (cachedStr != null) {
                // remember which files we were able to get from cached versions
                // so we can later fully prime the ts service cache
                ctx.filesFromFsCache.push(tsFilePath);
                // whoa cool, we found we already cached this in our filesystem
                const cachedModuleFile = JSON.parse(cachedStr);
                // and there you go, thanks fs cache!
                // put the cached module file data in our context
                ctx.compilerCtx.moduleFiles[tsFilePath] = cachedModuleFile.moduleFile;
                // add any collections to the context which this cached file may know about
                cachedModuleFile.moduleFile.externalImports.forEach(moduleId => {
                    addCollection(config, ctx.compilerCtx, ctx.compilerCtx.collections, cachedModuleFile.moduleFile, config.rootDir, moduleId);
                });
                // write the cached js output too
                yield outputFile(config, ctx, cachedModuleFile.moduleFile.jsFilePath, cachedModuleFile.jsText);
                return;
            }
        }
        else {
            // purposely not using the fs cache
            // this is probably when we want to prime the
            // in-memory ts cache after the first build has completed
            const existingModuleFile = ctx.compilerCtx.moduleFiles[tsFilePath];
            if (existingModuleFile && Array.isArray(existingModuleFile.externalImports)) {
                ensureExternalImports = existingModuleFile.externalImports.slice();
            }
        }
        // let's do this!
        const output = services.getEmitOutput(tsFilePath);
        // keep track of how many files we transpiled (great for debugging/testing)
        ctx.buildCtx.transpileBuildCount++;
        if (output.emitSkipped) {
            // oh no! we've got some typescript diagnostics for this file!
            const tsDiagnostics = services.getCompilerOptionsDiagnostics()
                .concat(services.getSyntacticDiagnostics(tsFilePath));
            loadTypeScriptDiagnostics(config, ctx.buildCtx.diagnostics, tsDiagnostics);
            return;
        }
        yield Promise.all(output.outputFiles.map((tsOutput) => __awaiter$l(this, void 0, void 0, function* () {
            const outputFilePath = normalizePath(tsOutput.name);
            if (!ctx.buildCtx.isActiveBuild) {
                ctx.buildCtx.debug(`tranpsileTsFile write aborted, not active build: ${tsFilePath}`);
                return;
            }
            if (ctx.buildCtx.hasError) {
                ctx.buildCtx.debug(`tranpsileTsFile write aborted: ${tsFilePath}`);
                return;
            }
            if (outputFilePath.endsWith('.js')) {
                // this is the JS output of the typescript file transpiling
                const moduleFile = getModuleFile(ctx.compilerCtx, tsFilePath);
                moduleFile.jsFilePath = outputFilePath;
                if (Array.isArray(ensureExternalImports)) {
                    ensureExternalImports.forEach(moduleId => {
                        addCollection(config, ctx.compilerCtx, ctx.compilerCtx.collections, moduleFile, config.rootDir, moduleId);
                    });
                }
                if (config.enableCache) {
                    // cache this module file and js text for later
                    const cacheModuleFile = {
                        moduleFile: moduleFile,
                        jsText: tsOutput.text
                    };
                    // let's turn our data into a string to be cached for later fs lookups
                    const cachedStr = JSON.stringify(cacheModuleFile);
                    yield ctx.compilerCtx.cache.put(cacheKey, cachedStr);
                }
            }
            // write the text to our in-memory fs and output targets
            yield outputFile(config, ctx, outputFilePath, tsOutput.text);
        })));
    });
}
function outputFile(config, ctx, outputFilePath, outputText) {
    return __awaiter$l(this, void 0, void 0, function* () {
        // the in-memory .js version is be virtually next to the source ts file
        // but it never actually gets written to disk, just there in spirit
        yield ctx.compilerCtx.fs.writeFile(outputFilePath, outputText, { inMemoryOnly: true });
        // also write the output to each of the output targets
        const outputTargets = config.outputTargets.filter(o => o.type === 'dist');
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$l(this, void 0, void 0, function* () {
            const relPath = config.sys.path.relative(config.srcDir, outputFilePath);
            const outputTargetFilePath = pathJoin(config, outputTarget.collectionDir, relPath);
            yield ctx.compilerCtx.fs.writeFile(outputTargetFilePath, outputText);
        })));
    });
}
function shouldScanForTsChanges(compilerCtx, buildCtx) {
    if (!compilerCtx.rootTsFiles) {
        return true;
    }
    if (buildCtx.requiresFullBuild) {
        return true;
    }
    if (buildCtx.filesAdded.length > 0 || buildCtx.filesDeleted.length > 0) {
        return true;
    }
    if (buildCtx.dirsAdded.length > 0 || buildCtx.dirsDeleted.length > 0) {
        return true;
    }
    return false;
}
function scanDirForTsFiles(config, compilerCtx, buildCtx) {
    return __awaiter$l(this, void 0, void 0, function* () {
        const scanDirTimeSpan = buildCtx.createTimeSpan(`scan ${config.srcDir} started`, true);
        // loop through this directory and sub directories looking for
        // files that need to be transpiled
        const dirItems = yield compilerCtx.fs.readdir(config.srcDir, { recursive: true });
        // filter down to only the ts files we should include
        const tsFileItems = dirItems.filter(item => {
            return item.isFile && isFileIncludePath(config, item.absPath);
        });
        scanDirTimeSpan.finish(`scan for ts files finished`);
        const componentsDtsSrcFilePath = getComponentsDtsSrcFilePath(config);
        // return just the abs path
        // make sure it doesn't include components.d.ts
        return tsFileItems
            .map(tsFileItem => tsFileItem.absPath)
            .filter(tsFilePath => {
            return tsFilePath !== componentsDtsSrcFilePath;
        });
    });
}
function primeTsServiceCache(transpileCtx) {
    if (transpileCtx.filesFromFsCache.length === 0) {
        return;
    }
    // if this is a watch build and we have files that were pulled directly from the cache
    // let's go through and run the ts service on these files again again so
    // that the ts service cache is all updated and ready to go. But this can
    // happen after the first build since so far we're good to go w/ the fs cache
    const unsubscribe = transpileCtx.compilerCtx.events.subscribe('buildFinish', () => {
        unsubscribe();
        if (transpileCtx.buildCtx.hasError) {
            return;
        }
        // we can wait a bit and let things cool down on the main thread first
        setTimeout(() => __awaiter$l(this, void 0, void 0, function* () {
            if (transpileCtx.buildCtx.hasError) {
                return;
            }
            const timeSpan = transpileCtx.buildCtx.createTimeSpan(`prime ts service cache started, ${transpileCtx.filesFromFsCache.length} file(s)`, true);
            // loop through each file system cached ts files and run the transpile again
            // so that we get the ts service's cache all up to speed
            yield transpileCtx.compilerCtx.tsService(transpileCtx.compilerCtx, transpileCtx.buildCtx, transpileCtx.filesFromFsCache, false, false);
            timeSpan.finish(`prime ts service cache finished`);
        }), PRIME_TS_CACHE_TIMEOUT);
    });
}
// how long we should wait after the first build
// to go ahead and prime the in-memory TS cache
const PRIME_TS_CACHE_TIMEOUT = 1000;
function isFileIncludePath(config, readPath) {
    for (var i = 0; i < config.excludeSrc.length; i++) {
        if (config.sys.minimatch(readPath, config.excludeSrc[i])) {
            // this file is a file we want to exclude
            return false;
        }
    }
    for (i = 0; i < config.includeSrc.length; i++) {
        if (config.sys.minimatch(readPath, config.includeSrc[i])) {
            // this file is a file we want to include
            return true;
        }
    }
    // not a file we want to include, let's not add it
    return false;
}
function createConfiKey(config, compilerOptions) {
    // create a unique config key with stuff that "might" matter for typescript builds
    // not using the entire config object
    // since not everything is a primitive and could have circular references
    return config.sys.generateContentHash(JSON.stringify([
        config.devMode,
        config.minifyCss,
        config.minifyJs,
        config.buildEs5,
        config.rootDir,
        config.srcDir,
        config.autoprefixCss,
        config.preamble,
        config.namespace,
        config.hashedFileNameLength,
        config.hashFileNames,
        config.outputTargets,
        config.enableCache,
        config.assetVersioning,
        config.buildAppCore,
        config.excludeSrc,
        config.includeSrc,
        compilerOptions,
        'typescript2.9.20'
    ]), 32);
}

var __awaiter$m = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function validateTypesMain(config, compilerCtx, buildCtx) {
    return __awaiter$m(this, void 0, void 0, function* () {
        if (!buildCtx.isActiveBuild) {
            buildCtx.debug(`validateTypesMain aborted, not active build`);
            return;
        }
        if (buildCtx.hasError) {
            buildCtx.debug(`validateTypesMain aborted`);
            return;
        }
        // send data over to our worker process to validate types
        // don't let this block the main thread and we'll check
        // its response sometime later
        const timeSpan = buildCtx.createTimeSpan(`validateTypes started`, true);
        const componentsDtsSrcFilePath = getComponentsDtsSrcFilePath(config);
        const rootTsFiles = compilerCtx.rootTsFiles.slice();
        // ensure components.d.ts IS in the type validation transpile
        if (!rootTsFiles.includes(componentsDtsSrcFilePath)) {
            rootTsFiles.push(componentsDtsSrcFilePath);
        }
        const collectionNames = compilerCtx.collections.map(c => c.collectionName);
        buildCtx.validateTypesHandler = (results) => __awaiter$m(this, void 0, void 0, function* () {
            timeSpan.finish(`validateTypes finished`);
            compilerCtx.fs.cancelDeleteDirectoriesFromDisk(results.dirPaths);
            compilerCtx.fs.cancelDeleteFilesFromDisk(results.filePaths);
            if (results.diagnostics.length === 0) {
                // ┏(-_-)┛ ┗(-_-)┓ ┗(-_-)┛ ┏(-_-)┓
                // app successful validated
                // and types written to disk if it's a dist build
                // null it out so we know there's nothing to wait on
                buildCtx.validateTypesHandler = null;
                buildCtx.validateTypesPromise = null;
                return;
            }
            if (buildCtx.hasFinished) {
                // the build has already finished before the
                // type checking transpile finished, which is fine for watch
                // we'll need to create build to show the diagnostics
                if (buildCtx.isActiveBuild) {
                    buildCtx.debug(`validateTypesHandler, build already finished, creating a new build`);
                    const diagnosticsBuildCtx = new BuildContext(config, compilerCtx);
                    diagnosticsBuildCtx.start();
                    diagnosticsBuildCtx.diagnostics.push(...results.diagnostics);
                    diagnosticsBuildCtx.finish();
                }
            }
            else {
                // cool the build hasn't finished yet
                // so let's add the diagnostics to the build now
                // so that the current build will print these
                buildCtx.diagnostics.push(...results.diagnostics);
                // null out so we don't try this again
                buildCtx.validateTypesHandler = null;
                buildCtx.validateTypesPromise = null;
                yield buildCtx.finish();
            }
        });
        // get the typescript compiler options
        const compilerOptions = yield getUserCompilerOptions(config, compilerCtx);
        // only write dts files when we have an output target with a types directory
        const emitDtsFiles = config.outputTargets.some(o => !!o.typesDir);
        // kick off validating types by sending the data over to the worker process
        buildCtx.validateTypesPromise = config.sys.validateTypes(compilerOptions, emitDtsFiles, config.cwd, collectionNames, rootTsFiles);
        // when the validate types build finishes
        // let's run the handler we put on the build context
        buildCtx.validateTypesPromise.then(buildCtx.validateTypesHandler.bind(buildCtx));
    });
}

var __awaiter$n = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function transpileApp(config, compilerCtx, buildCtx) {
    return __awaiter$n(this, void 0, void 0, function* () {
        try {
            const doTranspile = yield transpileService(config, compilerCtx, buildCtx);
            yield processMetadata(config, compilerCtx, buildCtx, doTranspile);
        }
        catch (e) {
            // gah!!
            catchError(buildCtx.diagnostics, e);
        }
    });
}
function processMetadata(config, compilerCtx, buildCtx, doTranspile) {
    return __awaiter$n(this, void 0, void 0, function* () {
        if (!buildCtx.isActiveBuild) {
            buildCtx.debug(`processMetadata aborted, not active build`);
            return;
        }
        if (buildCtx.hasError) {
            buildCtx.debug(`processMetadata aborted`);
            return;
        }
        // let's clean up the module file cache so we only
        // hold on to stuff we know is being used
        cleanModuleFileCache(compilerCtx);
        // get all the active module files
        const moduleFiles = Object.keys(compilerCtx.moduleFiles).map(key => compilerCtx.moduleFiles[key]);
        // see if any of the active modules are using slot or svg
        // useful for the build process later on
        buildCtx.hasSlot = moduleFiles.some(mf => mf.hasSlot);
        buildCtx.hasSvg = moduleFiles.some(mf => mf.hasSvg);
        if (doTranspile && !buildCtx.hasError) {
            // ts changes have happened!!
            // create the components.d.ts file and write to disk
            yield generateComponentTypes(config, compilerCtx, buildCtx);
            if (!config._isTesting) {
                // now that we've updated teh components.d.ts file
                // lets do a full typescript build (but in another thread)
                validateTypesMain(config, compilerCtx, buildCtx);
            }
        }
    });
}
function cleanModuleFileCache(compilerCtx) {
    // let's clean up the module file cache so we only
    // hold on to stuff we know is being used
    const foundSourcePaths = [];
    compilerCtx.rootTsFiles.forEach(rootTsFile => {
        const moduleFile = compilerCtx.moduleFiles[rootTsFile];
        addSourcePaths(compilerCtx, foundSourcePaths, moduleFile);
    });
    const cachedSourcePaths = Object.keys(compilerCtx.moduleFiles);
    cachedSourcePaths.forEach(sourcePath => {
        if (sourcePath.endsWith('.d.ts') || sourcePath.endsWith('.js')) {
            // don't bother cleaning up for .d.ts and .js modules files
            return;
        }
        if (!foundSourcePaths.includes(sourcePath)) {
            // this source path is a typescript file
            // but we never found it again, so let's forget it
            delete compilerCtx.moduleFiles[sourcePath];
        }
    });
}
function addSourcePaths(compilerCtx, foundSourcePaths, moduleFile) {
    if (moduleFile && !foundSourcePaths.includes(moduleFile.sourceFilePath)) {
        foundSourcePaths.push(moduleFile.sourceFilePath);
        moduleFile.localImports.forEach(localImport => {
            const moduleFile = compilerCtx.moduleFiles[localImport];
            if (moduleFile) {
                addSourcePaths(compilerCtx, foundSourcePaths, moduleFile);
            }
        });
    }
}

var __awaiter$o = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function docs(config, compilerCtx) {
    return __awaiter$o(this, void 0, void 0, function* () {
        compilerCtx = getCompilerCtx(config, compilerCtx);
        const buildCtx = new BuildContext(config, compilerCtx);
        config.logger.info(config.logger.cyan(`${config.sys.compiler.name} v${config.sys.compiler.version}`));
        // keep track of how long the entire build process takes
        const timeSpan = config.logger.createTimeSpan(`generate docs, ${config.fsNamespace}, started`);
        try {
            // begin the build
            // async scan the src directory for ts files
            // then transpile them all in one go
            yield transpileApp(config, compilerCtx, buildCtx);
            // generate each of the docs
            yield generateDocs(config, compilerCtx);
        }
        catch (e) {
            // catch all phase
            catchError(buildCtx.diagnostics, e);
        }
        // finalize phase
        buildCtx.diagnostics = cleanDiagnostics(buildCtx.diagnostics);
        config.logger.printDiagnostics(buildCtx.diagnostics);
        // create a nice pretty message stating what happend
        let buildStatus = 'finished';
        let statusColor = 'green';
        if (hasError(buildCtx.diagnostics)) {
            buildStatus = 'failed';
            statusColor = 'red';
        }
        timeSpan.finish(`generate docs ${buildStatus}`, statusColor, true, true);
    });
}
function generateDocs(config, compilerCtx) {
    return __awaiter$o(this, void 0, void 0, function* () {
        const docsOutputTargets = config.outputTargets.filter(o => o.type === 'docs');
        if (docsOutputTargets.length > 0) {
            yield generateReadmes(config, compilerCtx, docsOutputTargets);
        }
    });
}

var __awaiter$p = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateServiceWorkers(config, compilerCtx, buildCtx) {
    return __awaiter$p(this, void 0, void 0, function* () {
        const wwwServiceOutputs = config.outputTargets.filter(o => o.type === 'www' && o.serviceWorker);
        yield Promise.all(wwwServiceOutputs.map((outputTarget) => __awaiter$p(this, void 0, void 0, function* () {
            yield generateServiceWorker(config, compilerCtx, buildCtx, outputTarget);
        })));
    });
}
function generateServiceWorker(config, compilerCtx, buildCtx, outputTarget) {
    return __awaiter$p(this, void 0, void 0, function* () {
        const shouldSkipSW = yield canSkipGenerateSW(config, compilerCtx, buildCtx, outputTarget);
        if (shouldSkipSW) {
            return;
        }
        if (hasSrcConfig(outputTarget)) {
            yield Promise.all([
                copyLib(config, buildCtx, outputTarget),
                injectManifest(config, buildCtx, outputTarget)
            ]);
        }
        else {
            yield generateSW(config, buildCtx, outputTarget.serviceWorker);
        }
    });
}
function copyLib(config, buildCtx, outputTarget) {
    return __awaiter$p(this, void 0, void 0, function* () {
        const timeSpan = buildCtx.createTimeSpan(`copy service worker library started`, true);
        try {
            yield config.sys.workbox.copyWorkboxLibraries(outputTarget.dir);
        }
        catch (e) {
            // workaround for workbox issue in the latest alpha
            const d = buildWarn(buildCtx.diagnostics);
            d.messageText = 'Service worker library already exists';
        }
        timeSpan.finish(`copy service worker library finished`);
    });
}
function generateSW(config, buildCtx, serviceWorker) {
    return __awaiter$p(this, void 0, void 0, function* () {
        const timeSpan = buildCtx.createTimeSpan(`generate service worker started`);
        try {
            yield config.sys.workbox.generateSW(serviceWorker);
            timeSpan.finish(`generate service worker finished`);
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
    });
}
function injectManifest(config, buildCtx, outputTarget) {
    return __awaiter$p(this, void 0, void 0, function* () {
        const timeSpan = buildCtx.createTimeSpan(`inject manifest into service worker started`);
        try {
            yield config.sys.workbox.injectManifest(outputTarget.serviceWorker);
            timeSpan.finish('inject manifest into service worker finished');
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
    });
}
function hasSrcConfig(outputTarget) {
    return !!outputTarget.serviceWorker.swSrc;
}
function canSkipGenerateSW(config, compilerCtx, buildCtx, outputTarget) {
    return __awaiter$p(this, void 0, void 0, function* () {
        if (!outputTarget.serviceWorker) {
            return true;
        }
        if (!config.srcIndexHtml) {
            return true;
        }
        const hasServiceWorkerChanged = hasServiceWorkerChanges(config, buildCtx);
        if ((compilerCtx.hasSuccessfulBuild && buildCtx.appFileBuildCount === 0 && !hasServiceWorkerChanged) || hasError(buildCtx.diagnostics)) {
            // no need to rebuild index.html if there were no app file changes
            return true;
        }
        const hasSrcIndexHtml = yield compilerCtx.fs.access(config.srcIndexHtml);
        if (!hasSrcIndexHtml) {
            buildCtx.debug(`generateServiceWorker, no index.html, so skipping sw build`);
            return true;
        }
        // let's build us some service workerz
        return false;
    });
}

function normalizePrerenderLocation(config, outputTarget, windowLocationHref, url) {
    let prerenderLocation = null;
    try {
        if (typeof url !== 'string') {
            return null;
        }
        // remove any quotes that somehow got in the href
        url = url.replace(/\'|\"/g, '');
        // parse the <a href> passed in
        const hrefParseUrl = config.sys.url.parse(url);
        // don't bother for basically empty <a> tags
        if (!hrefParseUrl.pathname) {
            return null;
        }
        // parse the window.location
        const windowLocationUrl = config.sys.url.parse(windowLocationHref);
        // urls must be on the same host
        // but only check they're the same host when the href has a host
        if (hrefParseUrl.hostname && hrefParseUrl.hostname !== windowLocationUrl.hostname) {
            return null;
        }
        // convert it back to a nice in pretty path
        prerenderLocation = {
            url: config.sys.url.resolve(windowLocationHref, url)
        };
        const normalizedUrl = config.sys.url.parse(prerenderLocation.url);
        normalizedUrl.hash = null;
        if (!outputTarget.prerenderPathQuery) {
            normalizedUrl.search = null;
        }
        prerenderLocation.url = config.sys.url.format(normalizedUrl);
        prerenderLocation.path = config.sys.url.parse(prerenderLocation.url).path;
        if (!prerenderLocation.path.startsWith(outputTarget.baseUrl)) {
            if (prerenderLocation.path !== outputTarget.baseUrl.substr(0, outputTarget.baseUrl.length - 1)) {
                return null;
            }
        }
        const filter = (typeof outputTarget.prerenderFilter === 'function') ? outputTarget.prerenderFilter : prerenderFilter;
        const isValidUrl = filter(hrefParseUrl);
        if (!isValidUrl) {
            return null;
        }
        if (hrefParseUrl.hash && outputTarget.prerenderPathHash) {
            prerenderLocation.url += hrefParseUrl.hash;
            prerenderLocation.path += hrefParseUrl.hash;
        }
    }
    catch (e) {
        config.logger.error(`normalizePrerenderLocation`, e);
        return null;
    }
    return prerenderLocation;
}
function prerenderFilter(url) {
    const parts = url.pathname.split('/');
    const basename = parts[parts.length - 1];
    return !basename.includes('.');
}
function crawlAnchorsForNextUrls(config, outputTarget, prerenderQueue, windowLocationHref, anchors) {
    anchors && anchors.forEach(anchor => {
        if (isValidCrawlableAnchor(anchor)) {
            addLocationToProcess(config, outputTarget, windowLocationHref, prerenderQueue, anchor.href);
        }
    });
}
function isValidCrawlableAnchor(anchor) {
    if (!anchor) {
        return false;
    }
    if (typeof anchor.href !== 'string' || anchor.href.trim() === '' || anchor.href.trim() === '#') {
        return false;
    }
    if (typeof anchor.target === 'string' && anchor.target.trim().toLowerCase() !== '_self') {
        return false;
    }
    return true;
}
function addLocationToProcess(config, outputTarget, windowLocationHref, prerenderQueue, locationUrl) {
    const prerenderLocation = normalizePrerenderLocation(config, outputTarget, windowLocationHref, locationUrl);
    if (!prerenderLocation || prerenderQueue.some(p => p.url === prerenderLocation.url)) {
        // either it's not a good location to prerender
        // or we've already got it in the queue
        return;
    }
    // set that this location is pending to be prerendered
    prerenderLocation.status = 'pending';
    // add this to our queue of locations to prerender
    prerenderQueue.push(prerenderLocation);
}
function getPrerenderQueue(config, outputTarget) {
    const prerenderHost = `http://prerender.stenciljs.com`;
    const prerenderQueue = [];
    if (Array.isArray(outputTarget.prerenderLocations)) {
        outputTarget.prerenderLocations.forEach(prerenderLocation => {
            addLocationToProcess(config, outputTarget, prerenderHost, prerenderQueue, prerenderLocation.path);
        });
    }
    return prerenderQueue;
}
function getWritePathFromUrl(config, outputTarget, url) {
    const parsedUrl = config.sys.url.parse(url);
    let pathName = parsedUrl.pathname;
    if (pathName.startsWith(outputTarget.baseUrl)) {
        pathName = pathName.substring(outputTarget.baseUrl.length);
    }
    else if (outputTarget.baseUrl === pathName + '/') {
        pathName = '/';
    }
    // figure out the directory where this file will be saved
    const dir = pathJoin(config, outputTarget.dir, pathName);
    // create the full path where this will be saved (normalize for windowz)
    let filePath;
    if (dir + '/' === outputTarget.dir + '/') {
        // this is the root of the output target directory
        // use the configured index.html
        const basename = outputTarget.indexHtml.substr(dir.length + 1);
        filePath = pathJoin(config, dir, basename);
    }
    else {
        filePath = pathJoin(config, dir, `index.html`);
    }
    return filePath;
}

var __awaiter$q = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateHostConfig(config, compilerCtx, outputTarget, entryModules, hydrateResultss) {
    return __awaiter$q(this, void 0, void 0, function* () {
        const hostConfig = {
            hosting: {
                rules: []
            }
        };
        hydrateResultss = hydrateResultss.sort((a, b) => {
            if (a.url.toLowerCase() < b.url.toLowerCase())
                return -1;
            if (a.url.toLowerCase() > b.url.toLowerCase())
                return 1;
            return 0;
        });
        hydrateResultss.forEach(hydrateResults => {
            const hostRule = generateHostRule(config, compilerCtx, outputTarget, entryModules, hydrateResults);
            if (hostRule) {
                hostConfig.hosting.rules.push(hostRule);
            }
        });
        addDefaults(config, outputTarget, hostConfig);
        const hostConfigFilePath = pathJoin(config, outputTarget.dir, HOST_CONFIG_FILENAME);
        yield mergeUserHostConfigFile(config, compilerCtx, hostConfig);
        yield compilerCtx.fs.writeFile(hostConfigFilePath, JSON.stringify(hostConfig, null, 2));
    });
}
function generateHostRule(config, compilerCtx, outputTarget, entryModules, hydrateResults) {
    const hostRule = {
        include: hydrateResults.path,
        headers: generateHostRuleHeaders(config, compilerCtx, outputTarget, entryModules, hydrateResults)
    };
    if (hostRule.headers.length === 0) {
        return null;
    }
    return hostRule;
}
function generateHostRuleHeaders(config, compilerCtx, outputTarget, entryModules, hydrateResults) {
    const hostRuleHeaders = [];
    addStyles(config, hostRuleHeaders, hydrateResults);
    addCoreJs(config, outputTarget, compilerCtx.appCoreWWWPath, hostRuleHeaders);
    addBundles(config, outputTarget, entryModules, hostRuleHeaders, hydrateResults.components);
    addScripts(config, hostRuleHeaders, hydrateResults);
    addImgs(config, hostRuleHeaders, hydrateResults);
    return hostRuleHeaders;
}
function addCoreJs(config, outputTarget, appCoreWWWPath, hostRuleHeaders) {
    const url = getUrlFromFilePath(config, outputTarget, appCoreWWWPath);
    hostRuleHeaders.push(formatLinkRelPreloadHeader(url));
}
function addBundles(config, outputTarget, entryModules, hostRuleHeaders, components) {
    components = sortComponents(components);
    const bundleIds = getBundleIds(entryModules, components);
    bundleIds.forEach(bundleId => {
        if (hostRuleHeaders.length < MAX_LINK_REL_PRELOAD_COUNT) {
            const bundleUrl = getBundleUrl(config, outputTarget, bundleId);
            hostRuleHeaders.push(formatLinkRelPreloadHeader(bundleUrl));
        }
    });
}
function getBundleIds(entryModules, components) {
    const bundleIds = [];
    components.forEach(cmp => {
        entryModules.forEach(mb => {
            const moduleFile = mb.moduleFiles.find(mf => mf.cmpMeta && mf.cmpMeta.tagNameMeta === cmp.tag);
            if (!moduleFile) {
                return;
            }
            let bundleId;
            if (typeof moduleFile.cmpMeta.bundleIds === 'string') {
                bundleId = moduleFile.cmpMeta.bundleIds;
            }
            else {
                bundleId = moduleFile.cmpMeta.bundleIds[DEFAULT_MODE];
                if (!bundleId) {
                    bundleId = moduleFile.cmpMeta.bundleIds[DEFAULT_STYLE_MODE];
                }
            }
            if (bundleId && bundleIds.indexOf(bundleId) === -1) {
                bundleIds.push(bundleId);
            }
        });
    });
    return bundleIds;
}
function getBundleUrl(config, outputTarget, bundleId) {
    const unscopedFileName = getBrowserFilename(bundleId, false);
    const unscopedWwwBuildPath = pathJoin(config, getAppBuildDir(config, outputTarget), unscopedFileName);
    return getUrlFromFilePath(config, outputTarget, unscopedWwwBuildPath);
}
function getUrlFromFilePath(config, outputTarget, filePath) {
    let url = pathJoin(config, '/', config.sys.path.relative(outputTarget.dir, filePath));
    url = outputTarget.baseUrl + url.substring(1);
    return url;
}
function sortComponents(components) {
    return components.sort((a, b) => {
        if (a.depth > b.depth)
            return -1;
        if (a.depth < b.depth)
            return 1;
        if (a.count > b.count)
            return -1;
        if (a.count < b.count)
            return 1;
        if (a.tag < b.tag)
            return -1;
        if (a.tag > b.tag)
            return 1;
        return 0;
    });
}
function addStyles(config, hostRuleHeaders, hydrateResults) {
    hydrateResults.styleUrls.forEach(styleUrl => {
        if (hostRuleHeaders.length >= MAX_LINK_REL_PRELOAD_COUNT) {
            return;
        }
        const url = config.sys.url.parse(styleUrl);
        if (url.hostname === hydrateResults.hostname) {
            hostRuleHeaders.push(formatLinkRelPreloadHeader(url.path));
        }
    });
}
function addScripts(config, hostRuleHeaders, hydrateResults) {
    hydrateResults.scriptUrls.forEach(scriptUrl => {
        if (hostRuleHeaders.length >= MAX_LINK_REL_PRELOAD_COUNT) {
            return;
        }
        const url = config.sys.url.parse(scriptUrl);
        if (url.hostname === hydrateResults.hostname) {
            hostRuleHeaders.push(formatLinkRelPreloadHeader(url.path));
        }
    });
}
function addImgs(config, hostRuleHeaders, hydrateResults) {
    hydrateResults.imgUrls.forEach(imgUrl => {
        if (hostRuleHeaders.length >= MAX_LINK_REL_PRELOAD_COUNT) {
            return;
        }
        const url = config.sys.url.parse(imgUrl);
        if (url.hostname === hydrateResults.hostname) {
            hostRuleHeaders.push(formatLinkRelPreloadHeader(url.path));
        }
    });
}
function formatLinkRelPreloadHeader(url) {
    const header = {
        name: 'Link',
        value: formatLinkRelPreloadValue(url)
    };
    return header;
}
function formatLinkRelPreloadValue(url) {
    const parts = [
        `<${url}>`,
        `rel=preload`
    ];
    const ext = url.split('.').pop().toLowerCase();
    if (ext === SCRIPT_EXT) {
        parts.push(`as=script`);
    }
    else if (ext === STYLE_EXT) {
        parts.push(`as=style`);
    }
    else if (IMG_EXTS.indexOf(ext) > -1) {
        parts.push(`as=image`);
    }
    return parts.join(';');
}
function addDefaults(config, outputTarget, hostConfig) {
    addBuildDirCacheControl(config, outputTarget, hostConfig);
    addServiceWorkerNoCacheControl(config, outputTarget, hostConfig);
}
function addBuildDirCacheControl(config, outputTarget, hostConfig) {
    const url = getUrlFromFilePath(config, outputTarget, getAppBuildDir(config, outputTarget));
    hostConfig.hosting.rules.push({
        include: pathJoin(config, url, '**'),
        headers: [
            {
                name: `Cache-Control`,
                value: `public, max-age=31536000`
            }
        ]
    });
}
function addServiceWorkerNoCacheControl(config, outputTarget, hostConfig) {
    if (!outputTarget.serviceWorker) {
        return;
    }
    const url = getUrlFromFilePath(config, outputTarget, outputTarget.serviceWorker.swDest);
    hostConfig.hosting.rules.push({
        include: url,
        headers: [
            {
                name: `Cache-Control`,
                value: `no-cache, no-store, must-revalidate`
            }
        ]
    });
}
function mergeUserHostConfigFile(config, compilerCtx, hostConfig) {
    return __awaiter$q(this, void 0, void 0, function* () {
        const hostConfigFilePath = pathJoin(config, config.srcDir, HOST_CONFIG_FILENAME);
        try {
            const userHostConfigStr = yield compilerCtx.fs.readFile(hostConfigFilePath);
            const userHostConfig = JSON.parse(userHostConfigStr);
            mergeUserHostConfig(userHostConfig, hostConfig);
        }
        catch (e) { }
    });
}
function mergeUserHostConfig(userHostConfig, hostConfig) {
    if (!userHostConfig || !userHostConfig.hosting) {
        return;
    }
    if (!Array.isArray(userHostConfig.hosting.rules)) {
        return;
    }
    const rules = userHostConfig.hosting.rules.concat(hostConfig.hosting.rules);
    hostConfig.hosting.rules = rules;
}
const DEFAULT_MODE = 'md';
const MAX_LINK_REL_PRELOAD_COUNT = 6;
const HOST_CONFIG_FILENAME = 'host.config.json';
const IMG_EXTS = ['png', 'gif', 'svg', 'jpg', 'jpeg', 'webp'];
const STYLE_EXT = 'css';
const SCRIPT_EXT = 'js';

function getFilePathFromUrl(config, outputTarget, windowLocationHref, url) {
    if (typeof url !== 'string' || url.trim() === '') {
        return null;
    }
    const location = normalizePrerenderLocation(config, outputTarget, windowLocationHref, url);
    if (!location) {
        return null;
    }
    return config.sys.path.join(outputTarget.dir, location.path);
}
function createHashedFileName(fileName, hash) {
    const parts = fileName.split('.');
    parts.splice(parts.length - 1, 0, hash);
    return parts.join('.');
}

var __awaiter$r = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function versionElementAssets(config, compilerCtx, outputTarget, windowLocationHref, doc) {
    return __awaiter$r(this, void 0, void 0, function* () {
        if (!config.assetVersioning.versionHtml) {
            return;
        }
        yield Promise.all(ELEMENT_TYPES.map((elmType) => __awaiter$r(this, void 0, void 0, function* () {
            yield versionElementTypeAssets(config, compilerCtx, outputTarget, windowLocationHref, doc, elmType.selector, elmType.selector);
        })));
    });
}
const ELEMENT_TYPES = [
    { selector: 'link[rel="apple-touch-icon"][href]', attr: 'href' },
    { selector: 'link[rel="icon"][href]', attr: 'href' },
    { selector: 'link[rel="manifest"][href]', attr: 'href' },
    { selector: 'link[rel="stylesheet"][href]', attr: 'href' }
];
function versionElementTypeAssets(config, compilerCtx, outputTarget, windowLocationHref, doc, selector, attrName) {
    return __awaiter$r(this, void 0, void 0, function* () {
        const elements = doc.querySelectorAll(selector);
        const promises = [];
        for (let i = 0; i < elements.length; i++) {
            promises.push(versionElementAsset(config, compilerCtx, outputTarget, windowLocationHref, elements[i], attrName));
        }
        yield Promise.all(promises);
    });
}
function versionElementAsset(config, compilerCtx, outputTarget, windowLocationHref, elm, attrName) {
    return __awaiter$r(this, void 0, void 0, function* () {
        const url = elm.getAttribute(attrName);
        const versionedUrl = yield versionAsset(config, compilerCtx, outputTarget, windowLocationHref, url);
        if (versionedUrl) {
            elm.setAttribute(attrName, versionedUrl);
        }
    });
}
function versionAsset(config, compilerCtx, outputTarget, windowLocationHref, url) {
    return __awaiter$r(this, void 0, void 0, function* () {
        try {
            const orgFilePath = getFilePathFromUrl(config, outputTarget, windowLocationHref, url);
            if (!orgFilePath) {
                return null;
            }
            if (hasFileExtension(orgFilePath, TXT_EXT$1)) {
                const content = yield compilerCtx.fs.readFile(orgFilePath);
                const hash = config.sys.generateContentHash(content, config.hashedFileNameLength);
                const dirName = config.sys.path.dirname(orgFilePath);
                const fileName = config.sys.path.basename(orgFilePath);
                const hashedFileName = createHashedFileName(fileName, hash);
                const hashedFilePath = config.sys.path.join(dirName, hashedFileName);
                yield compilerCtx.fs.writeFile(hashedFilePath, content);
                yield compilerCtx.fs.remove(orgFilePath);
                return hashedFileName;
            }
        }
        catch (e) { }
        return null;
    });
}
const TXT_EXT$1 = ['js', 'css', 'svg', 'json'];

var __awaiter$s = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function versionManifestAssets(config, compilerCtx, outputTarget, windowLocationHref, doc) {
    return __awaiter$s(this, void 0, void 0, function* () {
        if (!config.assetVersioning.versionManifest) {
            return;
        }
        const manifestLink = doc.querySelector('link[rel="manifest"][href]');
        if (!manifestLink) {
            return;
        }
        return versionManifest(config, compilerCtx, outputTarget, windowLocationHref, manifestLink);
    });
}
function versionManifest(config, compilerCtx, outputTarget, windowLocationHref, linkElm) {
    return __awaiter$s(this, void 0, void 0, function* () {
        const url = linkElm.getAttribute('href');
        if (!url) {
            return;
        }
        const orgFilePath = getFilePathFromUrl(config, outputTarget, windowLocationHref, url);
        if (!orgFilePath) {
            return;
        }
        if (!hasFileExtension(orgFilePath, ['json'])) {
            return;
        }
        try {
            const jsonStr = yield compilerCtx.fs.readFile(orgFilePath);
            const manifest = JSON.parse(jsonStr);
            if (Array.isArray(manifest.icons)) {
                yield Promise.all(manifest.icons.map((manifestIcon) => __awaiter$s(this, void 0, void 0, function* () {
                    yield versionManifestIcon(config, compilerCtx, outputTarget, windowLocationHref, manifest, manifestIcon);
                })));
            }
            yield generateVersionedManifest(config, compilerCtx, linkElm, orgFilePath, manifest);
        }
        catch (e) {
            config.logger.error(`versionManifest: ${e}`);
        }
    });
}
function versionManifestIcon(config, compilerCtx, outputTarget, windowLocationHref, manifest, manifestIcon) {
    return __awaiter$s(this, void 0, void 0, function* () {
    });
}
function generateVersionedManifest(config, compilerCtx, linkElm, orgFilePath, manifest) {
    return __awaiter$s(this, void 0, void 0, function* () {
        const jsonStr = JSON.stringify(manifest);
        const dir = config.sys.path.dirname(orgFilePath);
        const orgFileName = config.sys.path.basename(orgFilePath);
        const hash = config.sys.generateContentHash(jsonStr, config.hashedFileNameLength);
        const newFileName = orgFileName.toLowerCase().replace(`.json`, `.${hash}.json`);
        const newFilePath = config.sys.path.join(dir, newFileName);
        yield Promise.all([
            compilerCtx.fs.remove(orgFilePath),
            compilerCtx.fs.writeFile(newFilePath, jsonStr)
        ]);
        let url = linkElm.getAttribute('href');
        url = url.replace(orgFileName, newFileName);
        linkElm.setAttribute('href', url);
    });
}

var __awaiter$t = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function assetVersioning(config, compilerCtx, outputTarget, windowLocationHref, doc) {
    return __awaiter$t(this, void 0, void 0, function* () {
        yield versionElementAssets(config, compilerCtx, outputTarget, windowLocationHref, doc);
        yield versionManifestAssets(config, compilerCtx, outputTarget, windowLocationHref, doc);
    });
}

function collapseHtmlWhitepace(node) {
    // this isn't about reducing HTML filesize (cuz it doesn't really matter after gzip)
    // this is more about having many less nodes for the client side to
    // have to climb through while it's creating vnodes from this HTML
    if (node.nodeType === 1 /* ElementNode */) {
        const attributeList = node.attributes;
        for (let j = attributeList.length - 1; j >= 0; j--) {
            const attr = attributeList[j];
            if (!attr.value) {
                if (SAFE_TO_REMOVE_EMPTY_ATTRS.includes(attr.name)) {
                    node.removeAttribute(attr.name);
                }
            }
        }
    }
    if (WHITESPACE_SENSITIVE_TAGS.includes(node.tagName)) {
        return;
    }
    let lastWhitespaceTextNode = null;
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const childNode = node.childNodes[i];
        if (childNode.nodeType === 3 /* TextNode */ || childNode.nodeType === 8 /* CommentNode */) {
            childNode.nodeValue = childNode.nodeValue.replace(REDUCE_WHITESPACE_REGEX, ' ');
            if (childNode.nodeValue === ' ') {
                if (lastWhitespaceTextNode === null) {
                    childNode.nodeValue = ' ';
                    lastWhitespaceTextNode = childNode;
                }
                else {
                    childNode.parentNode.removeChild(childNode);
                }
                continue;
            }
        }
        else if (childNode.childNodes) {
            collapseHtmlWhitepace(childNode);
        }
        lastWhitespaceTextNode = null;
    }
}
const REDUCE_WHITESPACE_REGEX = /\s\s+/g;
const WHITESPACE_SENSITIVE_TAGS = ['PRE', 'SCRIPT', 'STYLE', 'TEXTAREA'];
const SAFE_TO_REMOVE_EMPTY_ATTRS = [
    'class',
    'style',
];

var __awaiter$u = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function inlineExternalAssets(config, compilerCtx, outputTarget, windowLocationPath, doc) {
    return __awaiter$u(this, void 0, void 0, function* () {
        const linkElements = doc.querySelectorAll('link[href][rel="stylesheet"]');
        for (var i = 0; i < linkElements.length; i++) {
            inlineStyle(config, compilerCtx, outputTarget, windowLocationPath, doc, linkElements[i]);
        }
        const scriptElements = doc.querySelectorAll('script[src]');
        for (i = 0; i < scriptElements.length; i++) {
            yield inlineScript(config, compilerCtx, outputTarget, windowLocationPath, scriptElements[i]);
        }
    });
}
function inlineStyle(config, compilerCtx, outputTarget, windowLocationPath, doc, linkElm) {
    return __awaiter$u(this, void 0, void 0, function* () {
        const content = yield getAssetContent(config, compilerCtx, outputTarget, windowLocationPath, linkElm.href);
        if (!content) {
            return;
        }
        config.logger.debug(`optimize ${windowLocationPath}, inline style: ${config.sys.url.parse(linkElm.href).pathname}`);
        const styleElm = doc.createElement('style');
        styleElm.innerHTML = content;
        linkElm.parentNode.insertBefore(styleElm, linkElm);
        linkElm.parentNode.removeChild(linkElm);
    });
}
function inlineScript(config, compilerCtx, outputTarget, windowLocationPath, scriptElm) {
    return __awaiter$u(this, void 0, void 0, function* () {
        const content = yield getAssetContent(config, compilerCtx, outputTarget, windowLocationPath, scriptElm.src);
        if (!content) {
            return;
        }
        config.logger.debug(`optimize ${windowLocationPath}, inline script: ${scriptElm.src}`);
        scriptElm.innerHTML = content;
        scriptElm.removeAttribute('src');
    });
}
function getAssetContent(config, ctx, outputTarget, windowLocationPath, assetUrl) {
    return __awaiter$u(this, void 0, void 0, function* () {
        if (typeof assetUrl !== 'string' || assetUrl.trim() === '') {
            return null;
        }
        // figure out the url's so we can check the hostnames
        const fromUrl = config.sys.url.parse(windowLocationPath);
        const toUrl = config.sys.url.parse(assetUrl);
        if (fromUrl.hostname !== toUrl.hostname) {
            // not the same hostname, so we wouldn't have the file content
            return null;
        }
        // figure out the local file path
        const filePath = getFilePathFromUrl$1(config, outputTarget, fromUrl, toUrl);
        // doesn't look like we've got it cached in app files
        try {
            // try looking it up directly
            const content = yield ctx.fs.readFile(filePath);
            // rough estimate of size
            const fileSize = content.length;
            if (fileSize > outputTarget.inlineAssetsMaxSize) {
                // welp, considered too big, don't inline
                return null;
            }
            return content;
        }
        catch (e) {
            // never found the content for this file
            return null;
        }
    });
}
function getFilePathFromUrl$1(config, outputTarget, fromUrl, toUrl) {
    const resolvedUrl = '.' + config.sys.url.resolve(fromUrl.pathname, toUrl.pathname);
    return pathJoin(config, outputTarget.dir, resolvedUrl);
}

var __awaiter$v = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function inlineLoaderScript(config, compilerCtx, outputTarget, windowLocationPath, doc) {
    return __awaiter$v(this, void 0, void 0, function* () {
        // create the script url we'll be looking for
        const loaderFileName = getLoaderFileName(config);
        // find the external loader script
        // which is usually in the <head> and a pretty small external file
        // now that we're prerendering the html, and all the styles and html
        // will get hardcoded in the output, it's safe to now put the
        // loader script at the bottom of <body>
        const scriptElm = findExternalLoaderScript(doc, loaderFileName);
        if (scriptElm) {
            // append the loader script content to the bottom of <body>
            yield updateInlineLoaderScriptElement(config, compilerCtx, outputTarget, doc, windowLocationPath, scriptElm);
        }
    });
}
function findExternalLoaderScript(doc, loaderFileName) {
    const scriptElements = doc.getElementsByTagName('script');
    for (let i = 0; i < scriptElements.length; i++) {
        const src = scriptElements[i].getAttribute('src');
        if (isLoaderScriptSrc(loaderFileName, src)) {
            // this is a script element with a src attribute which is
            // pointing to the app's external loader script
            // remove the script from the document, be gone with you
            return scriptElements[i];
        }
    }
    return null;
}
function isLoaderScriptSrc(loaderFileName, scriptSrc) {
    try {
        if (typeof scriptSrc !== 'string' || scriptSrc.trim() === '') {
            return false;
        }
        scriptSrc = scriptSrc.toLowerCase();
        if (scriptSrc.startsWith('http') || scriptSrc.startsWith('file')) {
            return false;
        }
        scriptSrc = scriptSrc.split('?')[0].split('#')[0];
        loaderFileName = loaderFileName.split('?')[0].split('#')[0];
        if (scriptSrc === loaderFileName || scriptSrc.endsWith('/' + loaderFileName)) {
            return true;
        }
    }
    catch (e) { }
    return false;
}
function updateInlineLoaderScriptElement(config, compilerCtx, outputTarget, doc, windowLocationPath, scriptElm) {
    return __awaiter$v(this, void 0, void 0, function* () {
        // get the file path
        const appLoaderPath = getLoaderPath(config, outputTarget);
        // get the loader content
        let content = null;
        try {
            // let's look it up directly
            content = yield compilerCtx.fs.readFile(appLoaderPath);
        }
        catch (e) {
            config.logger.debug(`unable to inline loader: ${appLoaderPath}`, e);
        }
        if (!content) {
            // didn't get good loader content, don't bother
            return;
        }
        config.logger.debug(`optimize ${windowLocationPath}, inline loader`);
        // remove the external src
        scriptElm.removeAttribute('src');
        // only add the data-resources-url attr if we don't already have one
        const existingResourcesUrlAttr = scriptElm.getAttribute('data-resources-url');
        if (!existingResourcesUrlAttr) {
            const resourcesUrl = setDataResourcesUrlAttr(config, outputTarget);
            // add the resource path data attribute
            scriptElm.setAttribute('data-resources-url', resourcesUrl);
        }
        // inline the js content
        scriptElm.innerHTML = content;
        if (outputTarget.hydrateComponents) {
            // remove the script element from where it's currently at in the dom
            scriptElm.parentNode.removeChild(scriptElm);
            // place it back in the dom, but at the bottom of the body
            doc.body.appendChild(scriptElm);
        }
    });
}
function setDataResourcesUrlAttr(config, outputTarget) {
    let resourcesUrl = outputTarget.resourcesUrl;
    if (!resourcesUrl) {
        resourcesUrl = config.sys.path.join(outputTarget.buildDir, config.fsNamespace);
        resourcesUrl = normalizePath(config.sys.path.relative(outputTarget.dir, resourcesUrl));
        if (!resourcesUrl.startsWith('/')) {
            resourcesUrl = '/' + resourcesUrl;
        }
        if (!resourcesUrl.endsWith('/')) {
            resourcesUrl = resourcesUrl + '/';
        }
        resourcesUrl = outputTarget.baseUrl + resourcesUrl.substring(1);
    }
    return resourcesUrl;
}

var __awaiter$w = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Interal minifier, not exposed publicly.
 */
function minifyJs(config, compilerCtx, jsText, sourceTarget, preamble, buildTimestamp) {
    return __awaiter$w(this, void 0, void 0, function* () {
        const opts = { output: {}, compress: {}, mangle: true };
        if (sourceTarget === 'es5') {
            opts.ecma = 5;
            opts.output.ecma = 5;
            opts.compress.ecma = 5;
            opts.compress.arrows = false;
            opts.output.beautify = false;
        }
        else {
            opts.ecma = 6;
            opts.output.ecma = 6;
            opts.compress.ecma = 6;
            opts.toplevel = true;
            opts.compress.arrows = true;
            opts.output.beautify = false;
        }
        if (config.logLevel === 'debug') {
            opts.mangle = {};
            opts.mangle.keep_fnames = true;
            opts.compress.drop_console = false;
            opts.compress.drop_debugger = false;
            opts.output.beautify = true;
            opts.output.indent_level = 2;
            opts.output.comments = 'all';
        }
        else {
            opts.compress.pure_funcs = ['assert', 'console.debug'];
        }
        opts.compress.passes = 2;
        if (preamble) {
            opts.output.preamble = generatePreamble(config, { suffix: buildTimestamp });
        }
        let cacheKey;
        if (compilerCtx) {
            cacheKey = compilerCtx.cache.createKey('minifyJs', 'terser3.8.10', opts, jsText);
            const cachedContent = yield compilerCtx.cache.get(cacheKey);
            if (cachedContent != null) {
                return {
                    output: cachedContent,
                    diagnostics: []
                };
            }
        }
        const r = yield config.sys.minifyJs(jsText, opts);
        if (compilerCtx) {
            if (r && r.diagnostics.length === 0 && typeof r.output === 'string') {
                yield compilerCtx.cache.put(cacheKey, r.output);
            }
        }
        return r;
    });
}

var __awaiter$x = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function minifyStyle(config, compilerCtx, diagnostics, styleText, filePath) {
    return __awaiter$x(this, void 0, void 0, function* () {
        if (typeof styleText !== 'string' || !styleText.length) {
            //  don't bother with invalid data
            return styleText;
        }
        const cacheKey = compilerCtx.cache.createKey('minifyStyle', 'clean-css4.1.110', styleText, MINIFY_CSS_PROD);
        const cachedContent = yield compilerCtx.cache.get(cacheKey);
        if (cachedContent != null) {
            // let's use the cached data we already figured out
            return cachedContent;
        }
        const minifyResults = yield config.sys.minifyCss(styleText, filePath, MINIFY_CSS_PROD);
        minifyResults.diagnostics.forEach(d => {
            // collect up any diagnostics from minifying
            diagnostics.push(d);
        });
        if (typeof minifyResults.output === 'string' && !hasError(diagnostics)) {
            // cool, we got valid minified output
            // only cache if we got a cache key, if not it probably has an @import
            yield compilerCtx.cache.put(cacheKey, minifyResults.output);
            return minifyResults.output;
        }
        return styleText;
    });
}
const MINIFY_CSS_PROD = {
    level: 2
};

var __awaiter$y = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function minifyInlineScripts(config, compilerCtx, doc, diagnostics) {
    return __awaiter$y(this, void 0, void 0, function* () {
        const scripts = doc.querySelectorAll('script');
        const promises = [];
        for (let i = 0; i < scripts.length; i++) {
            promises.push(minifyInlineScript(config, compilerCtx, diagnostics, scripts[i]));
        }
        yield Promise.all(promises);
    });
}
function canMinifyInlineScript(script) {
    if (script.hasAttribute('src')) {
        return false;
    }
    if (typeof script.innerHTML !== 'string') {
        return false;
    }
    script.innerHTML = script.innerHTML.trim();
    if (script.innerHTML.length === 0) {
        return false;
    }
    let type = script.getAttribute('type');
    if (typeof type === 'string') {
        type = type.trim().toLowerCase();
        if (!VALID_SCRIPT_TYPES.includes(type)) {
            return false;
        }
    }
    if (script.innerHTML.includes('  ')) {
        return true;
    }
    if (script.innerHTML.includes('\t')) {
        return true;
    }
    return false;
}
const VALID_SCRIPT_TYPES = ['application/javascript', 'application/ecmascript', ''];
function minifyInlineScript(config, compilerCtx, diagnostics, script) {
    return __awaiter$y(this, void 0, void 0, function* () {
        if (!canMinifyInlineScript(script)) {
            return;
        }
        const minifyResults = yield minifyJs(config, compilerCtx, script.innerHTML, 'es5', false);
        minifyResults.diagnostics.forEach(diagnostic => {
            diagnostics.push(diagnostic);
        });
        if (typeof minifyResults.output === 'string') {
            script.innerHTML = minifyResults.output;
        }
    });
}
function minifyInlineStyles(config, compilerCtx, doc, diagnostics) {
    return __awaiter$y(this, void 0, void 0, function* () {
        const styles = doc.querySelectorAll('style');
        const promises = [];
        for (let i = 0; i < styles.length; i++) {
            promises.push(minifyInlineStyle(config, compilerCtx, diagnostics, styles[i]));
        }
        yield Promise.all(promises);
    });
}
function canMinifyInlineStyle(style) {
    if (typeof style.innerHTML !== 'string') {
        return false;
    }
    style.innerHTML = style.innerHTML.trim();
    if (style.innerHTML.length === 0) {
        return false;
    }
    if (style.innerHTML.includes('/*')) {
        return true;
    }
    if (style.innerHTML.includes('  ')) {
        return true;
    }
    if (style.innerHTML.includes('\t')) {
        return true;
    }
    return false;
}
function minifyInlineStyle(config, compilerCtx, diagnostics, style) {
    return __awaiter$y(this, void 0, void 0, function* () {
        if (canMinifyInlineStyle(style)) {
            style.innerHTML = yield minifyStyle(config, compilerCtx, diagnostics, style.innerHTML);
        }
    });
}

// http://www.w3.org/TR/CSS21/grammar.html
// https://github.com/visionmedia/css-parse/pull/49#issuecomment-30088027
const commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
function parseCss(_config, css, filePath) {
    /**
     * Positional.
     */
    var lineno = 1;
    var column = 1;
    var srcLines;
    /**
     * Update lineno and column based on `str`.
     */
    function updatePosition(str) {
        const lines = str.match(/\n/g);
        if (lines)
            lineno += lines.length;
        const i = str.lastIndexOf('\n');
        column = ~i ? str.length - i : column + str.length;
    }
    /**
     * Mark position and patch `node.position`.
     */
    function position() {
        const start = { line: lineno, column: column };
        return function (node) {
            node.position = new ParsePosition(start);
            whitespace();
            return node;
        };
    }
    /**
     * Store position information for a node
     */
    class ParsePosition {
        constructor(start) {
            this.start = start;
            this.end = { line: lineno, column: column };
            this.source = filePath;
        }
    }
    /**
     * Non-enumerable source string
     */
    ParsePosition.prototype.content = css;
    /**
     * Error `msg`.
     */
    const diagnostics = [];
    function error(msg) {
        if (!srcLines) {
            srcLines = css.split('\n');
        }
        const d = {
            level: 'error',
            type: 'css',
            language: 'css',
            header: 'CSS Parse',
            messageText: msg,
            absFilePath: filePath,
            lines: [{
                    lineIndex: lineno - 1,
                    lineNumber: lineno,
                    errorCharStart: column,
                    text: css[lineno - 1],
                }]
        };
        if (lineno > 1) {
            const previousLine = {
                lineIndex: lineno - 1,
                lineNumber: lineno - 1,
                text: css[lineno - 2],
                errorCharStart: -1,
                errorLength: -1
            };
            d.lines.unshift(previousLine);
        }
        if (lineno + 2 < srcLines.length) {
            const nextLine = {
                lineIndex: lineno,
                lineNumber: lineno + 1,
                text: srcLines[lineno],
                errorCharStart: -1,
                errorLength: -1
            };
            d.lines.push(nextLine);
        }
        diagnostics.push(d);
    }
    /**
     * Parse stylesheet.
     */
    function stylesheet() {
        const rulesList = rules();
        return {
            type: 'stylesheet',
            stylesheet: {
                source: filePath,
                rules: rulesList,
                diagnostics: diagnostics
            }
        };
    }
    /**
     * Opening brace.
     */
    function open() {
        return match(/^{\s*/);
    }
    /**
     * Closing brace.
     */
    function close() {
        return match(/^}/);
    }
    /**
     * Parse ruleset.
     */
    function rules() {
        var node;
        const rules = [];
        whitespace();
        comments(rules);
        while (css.length && css.charAt(0) !== '}' && (node = atrule() || rule())) {
            if (node !== false) {
                rules.push(node);
                comments(rules);
            }
        }
        return rules;
    }
    /**
     * Match `re` and return captures.
     */
    function match(re) {
        const m = re.exec(css);
        if (!m)
            return;
        const str = m[0];
        updatePosition(str);
        css = css.slice(str.length);
        return m;
    }
    /**
     * Parse whitespace.
     */
    function whitespace() {
        match(/^\s*/);
    }
    /**
     * Parse comments;
     */
    function comments(rules) {
        var c;
        rules = rules || [];
        while (c = comment()) {
            if (c !== false) {
                rules.push(c);
            }
        }
        return rules;
    }
    /**
     * Parse comment.
     */
    function comment() {
        const pos = position();
        if ('/' !== css.charAt(0) || '*' !== css.charAt(1))
            return;
        var i = 2;
        while ('' !== css.charAt(i) && ('*' !== css.charAt(i) || '/' !== css.charAt(i + 1)))
            ++i;
        i += 2;
        if ('' === css.charAt(i - 1)) {
            return error('End of comment missing');
        }
        const str = css.slice(2, i - 2);
        column += 2;
        updatePosition(str);
        css = css.slice(i);
        column += 2;
        return pos({
            type: 'comment',
            comment: str
        });
    }
    /**
     * Parse selector.
     */
    function selector() {
        const m = match(/^([^{]+)/);
        if (!m)
            return;
        /* @fix Remove all comments from selectors
         * http://ostermiller.org/findcomment.html */
        return trim(m[0])
            .replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g, '')
            .replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'/g, function (m) {
            return m.replace(/,/g, '\u200C');
        })
            .split(/\s*(?![^(]*\)),\s*/)
            .map(function (s) {
            return s.replace(/\u200C/g, ',');
        });
    }
    /**
     * Parse declaration.
     */
    function declaration() {
        const pos = position();
        // prop
        var prop = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
        if (!prop)
            return;
        prop = trim(prop[0]);
        // :
        if (!match(/^:\s*/))
            return error(`property missing ':'`);
        // val
        const val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);
        const ret = pos({
            type: 'declaration',
            property: prop.replace(commentre, ''),
            value: val ? trim(val[0]).replace(commentre, '') : ''
        });
        // ;
        match(/^[;\s]*/);
        return ret;
    }
    /**
     * Parse declarations.
     */
    function declarations() {
        const decls = [];
        if (!open())
            return error(`missing '{'`);
        comments(decls);
        // declarations
        var decl;
        while (decl = declaration()) {
            if (decl !== false) {
                decls.push(decl);
                comments(decls);
            }
        }
        if (!close())
            return error(`missing '}'`);
        return decls;
    }
    /**
     * Parse keyframe.
     */
    function keyframe() {
        var m;
        const vals = [];
        const pos = position();
        while (m = match(/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/)) {
            vals.push(m[1]);
            match(/^,\s*/);
        }
        if (!vals.length)
            return;
        return pos({
            type: 'keyframe',
            values: vals,
            declarations: declarations()
        });
    }
    /**
     * Parse keyframes.
     */
    function atkeyframes() {
        const pos = position();
        var m = match(/^@([-\w]+)?keyframes\s*/);
        if (!m)
            return;
        const vendor = m[1];
        // identifier
        m = match(/^([-\w]+)\s*/);
        if (!m)
            return error(`@keyframes missing name`);
        const name = m[1];
        if (!open())
            return error(`@keyframes missing '{'`);
        var frame;
        var frames = comments();
        while (frame = keyframe()) {
            frames.push(frame);
            frames = frames.concat(comments());
        }
        if (!close())
            return error(`@keyframes missing '}'`);
        return pos({
            type: 'keyframes',
            name: name,
            vendor: vendor,
            keyframes: frames
        });
    }
    /**
     * Parse supports.
     */
    function atsupports() {
        const pos = position();
        const m = match(/^@supports *([^{]+)/);
        if (!m)
            return;
        const supports = trim(m[1]);
        if (!open())
            return error(`@supports missing '{'`);
        const style = comments().concat(rules());
        if (!close())
            return error(`@supports missing '}'`);
        return pos({
            type: 'supports',
            supports: supports,
            rules: style
        });
    }
    /**
     * Parse host.
     */
    function athost() {
        const pos = position();
        const m = match(/^@host\s*/);
        if (!m)
            return;
        if (!open())
            return error(`@host missing '{'`);
        const style = comments().concat(rules());
        if (!close())
            return error(`@host missing '}'`);
        return pos({
            type: 'host',
            rules: style
        });
    }
    /**
     * Parse media.
     */
    function atmedia() {
        const pos = position();
        const m = match(/^@media *([^{]+)/);
        if (!m)
            return;
        const media = trim(m[1]);
        if (!open())
            return error(`@media missing '{'`);
        const style = comments().concat(rules());
        if (!close())
            return error(`@media missing '}'`);
        return pos({
            type: 'media',
            media: media,
            rules: style
        });
    }
    /**
     * Parse custom-media.
     */
    function atcustommedia() {
        const pos = position();
        const m = match(/^@custom-media\s+(--[^\s]+)\s*([^{;]+);/);
        if (!m)
            return;
        return pos({
            type: 'custom-media',
            name: trim(m[1]),
            media: trim(m[2])
        });
    }
    /**
     * Parse paged media.
     */
    function atpage() {
        const pos = position();
        const m = match(/^@page */);
        if (!m)
            return;
        const sel = selector() || [];
        if (!open())
            return error(`@page missing '{'`);
        var decls = comments();
        // declarations
        var decl;
        while (decl = declaration()) {
            decls.push(decl);
            decls = decls.concat(comments());
        }
        if (!close())
            return error(`@page missing '}'`);
        return pos({
            type: 'page',
            selectors: sel,
            declarations: decls
        });
    }
    /**
     * Parse document.
     */
    function atdocument() {
        const pos = position();
        const m = match(/^@([-\w]+)?document *([^{]+)/);
        if (!m)
            return;
        const vendor = trim(m[1]);
        const doc = trim(m[2]);
        if (!open())
            return error(`@document missing '{'`);
        const style = comments().concat(rules());
        if (!close())
            return error(`@document missing '}'`);
        return pos({
            type: 'document',
            document: doc,
            vendor: vendor,
            rules: style
        });
    }
    /**
     * Parse font-face.
     */
    function atfontface() {
        const pos = position();
        const m = match(/^@font-face\s*/);
        if (!m)
            return;
        if (!open())
            return error(`@font-face missing '{'`);
        var decls = comments();
        // declarations
        var decl;
        while (decl = declaration()) {
            decls.push(decl);
            decls = decls.concat(comments());
        }
        if (!close())
            return error(`@font-face missing '}'`);
        return pos({
            type: 'font-face',
            declarations: decls
        });
    }
    /**
     * Parse import
     */
    const atimport = _compileAtrule('import');
    /**
     * Parse charset
     */
    const atcharset = _compileAtrule('charset');
    /**
     * Parse namespace
     */
    const atnamespace = _compileAtrule('namespace');
    /**
     * Parse non-block at-rules
     */
    function _compileAtrule(name) {
        const re = new RegExp('^@' + name + '\\s*([^;]+);');
        return function () {
            const pos = position();
            const m = match(re);
            if (!m)
                return;
            const ret = { type: name };
            ret[name] = m[1].trim();
            return pos(ret);
        };
    }
    /**
     * Parse at rule.
     */
    function atrule() {
        if (css[0] !== '@')
            return;
        return atkeyframes()
            || atmedia()
            || atcustommedia()
            || atsupports()
            || atimport()
            || atcharset()
            || atnamespace()
            || atdocument()
            || atpage()
            || athost()
            || atfontface();
    }
    /**
     * Parse rule.
     */
    function rule() {
        const pos = position();
        const sel = selector();
        if (!sel)
            return error('selector missing');
        comments();
        return pos({
            type: 'rule',
            selectors: sel,
            declarations: declarations()
        });
    }
    return addParent(stylesheet());
}
/**
 * Trim `str`.
 */
function trim(str) {
    return str ? str.trim() : '';
}
/**
 * Adds non-enumerable parent node reference to each node.
 */
function addParent(obj, parent) {
    const isNode = obj && typeof obj.type === 'string';
    const childParent = isNode ? obj : parent;
    for (const k in obj) {
        const value = obj[k];
        if (Array.isArray(value)) {
            value.forEach(function (v) { addParent(v, childParent); });
        }
        else if (value && typeof value === 'object') {
            addParent(value, childParent);
        }
    }
    if (isNode) {
        Object.defineProperty(obj, 'parent', {
            configurable: true,
            writable: true,
            enumerable: false,
            value: parent || null
        });
    }
    return obj;
}

function getSelectors(sel) {
    // reusing global SELECTORS since this is a synchronous operation
    SELECTORS.all.length = SELECTORS.tags.length = SELECTORS.classNames.length = SELECTORS.ids.length = SELECTORS.attrs.length = 0;
    sel = sel.replace(/\./g, ' .')
        .replace(/\#/g, ' #')
        .replace(/\[/g, ' [')
        .replace(/\>/g, ' > ')
        .replace(/\+/g, ' + ')
        .replace(/\~/g, ' ~ ')
        .replace(/\*/g, ' * ')
        .replace(/\:not\((.*?)\)/g, ' ');
    const items = sel.split(' ');
    for (var i = 0; i < items.length; i++) {
        items[i] = items[i].split(':')[0];
        if (items[i].length === 0)
            continue;
        if (items[i].charAt(0) === '.') {
            SELECTORS.classNames.push(items[i].substr(1));
        }
        else if (items[i].charAt(0) === '#') {
            SELECTORS.ids.push(items[i].substr(1));
        }
        else if (items[i].charAt(0) === '[') {
            items[i] = items[i].substr(1).split('=')[0].split(']')[0].trim();
            SELECTORS.attrs.push(items[i].toLowerCase());
        }
        else if (/[a-z]/g.test(items[i].charAt(0))) {
            SELECTORS.tags.push(items[i].toLowerCase());
        }
    }
    SELECTORS.classNames = SELECTORS.classNames.sort((a, b) => {
        if (a.length < b.length)
            return -1;
        if (a.length > b.length)
            return 1;
        return 0;
    });
    return SELECTORS;
}
const SELECTORS = {
    all: [],
    tags: [],
    classNames: [],
    ids: [],
    attrs: []
};

/**
 * CSS stringify adopted from rework/css by
 * TJ Holowaychuk (@tj)
 * Licensed under the MIT License
 * https://github.com/reworkcss/css/blob/master/LICENSE
 */
class StringifyCss {
    constructor(opts) {
        this.usedSelectors = opts.usedSelectors;
    }
    /**
     * Visit `node`.
     */
    visit(node) {
        return this[node.type](node);
    }
    /**
     * Map visit over array of `nodes`, optionally using a `delim`
     */
    mapVisit(nodes, delim) {
        var buf = '';
        delim = delim || '';
        for (var i = 0, length = nodes.length; i < length; i++) {
            buf += this.visit(nodes[i]);
            if (delim && i < length - 1)
                buf += delim;
        }
        return buf;
    }
    /**
     * Compile `node`.
     */
    compile(node) {
        return node.stylesheet
            .rules.map(this.visit, this)
            .join('');
    }
    comment() {
        return '';
    }
    /**
     * Visit import node.
     */
    import(node) {
        return '@import ' + node.import + ';';
    }
    /**
     * Visit media node.
     */
    media(node) {
        const mediaCss = this.mapVisit(node.rules);
        if (mediaCss === '') {
            return '';
        }
        return '@media ' + node.media + '{' + this.mapVisit(node.rules) + '}';
    }
    /**
     * Visit document node.
     */
    document(node) {
        const documentCss = this.mapVisit(node.rules);
        if (documentCss === '') {
            return '';
        }
        const doc = '@' + (node.vendor || '') + 'document ' + node.document;
        return doc + '{' + documentCss + '}';
    }
    /**
     * Visit charset node.
     */
    charset(node) {
        return '@charset ' + node.charset + ';';
    }
    /**
     * Visit namespace node.
     */
    namespace(node) {
        return '@namespace ' + node.namespace + ';';
    }
    /**
     * Visit supports node.
     */
    supports(node) {
        const supportsCss = this.mapVisit(node.rules);
        if (supportsCss === '') {
            return '';
        }
        return '@supports ' + node.supports + '{' + supportsCss + '}';
    }
    /**
     * Visit keyframes node.
     */
    keyframes(node) {
        const keyframesCss = this.mapVisit(node.keyframes);
        if (keyframesCss === '') {
            return '';
        }
        return '@' + (node.vendor || '') + 'keyframes ' + node.name + '{' + keyframesCss + '}';
    }
    /**
     * Visit keyframe node.
     */
    keyframe(node) {
        const decls = node.declarations;
        return node.values.join(',') + '{' + this.mapVisit(decls) + '}';
    }
    /**
     * Visit page node.
     */
    page(node) {
        const sel = node.selectors.length
            ? node.selectors.join(', ')
            : '';
        return '@page ' + sel + '{' + this.mapVisit(node.declarations) + '}';
    }
    /**
     * Visit font-face node.
     */
    ['font-face'](node) {
        const fontCss = this.mapVisit(node.declarations);
        if (fontCss === '') {
            return '';
        }
        return '@font-face{' + fontCss + '}';
    }
    /**
     * Visit host node.
     */
    host(node) {
        return '@host{' + this.mapVisit(node.rules) + '}';
    }
    /**
     * Visit custom-media node.
     */
    ['custom-media'](node) {
        return '@custom-media ' + node.name + ' ' + node.media + ';';
    }
    /**
     * Visit rule node.
     */
    rule(node) {
        const decls = node.declarations;
        if (!decls.length)
            return '';
        var i, j;
        for (i = node.selectors.length - 1; i >= 0; i--) {
            const sel = getSelectors(node.selectors[i]);
            if (this.usedSelectors) {
                var include = true;
                // classes
                var jlen = sel.classNames.length;
                if (jlen > 0) {
                    for (j = 0; j < jlen; j++) {
                        if (this.usedSelectors.classNames.indexOf(sel.classNames[j]) === -1) {
                            include = false;
                            break;
                        }
                    }
                }
                // tags
                if (include) {
                    jlen = sel.tags.length;
                    if (jlen > 0) {
                        for (j = 0; j < jlen; j++) {
                            if (this.usedSelectors.tags.indexOf(sel.tags[j]) === -1) {
                                include = false;
                                break;
                            }
                        }
                    }
                }
                // attrs
                if (include) {
                    jlen = sel.attrs.length;
                    if (jlen > 0) {
                        for (j = 0; j < jlen; j++) {
                            if (this.usedSelectors.attrs.indexOf(sel.attrs[j]) === -1) {
                                include = false;
                                break;
                            }
                        }
                    }
                }
                // ids
                if (include) {
                    jlen = sel.ids.length;
                    if (jlen > 0) {
                        for (j = 0; j < jlen; j++) {
                            if (this.usedSelectors.ids.indexOf(sel.ids[j]) === -1) {
                                include = false;
                                break;
                            }
                        }
                    }
                }
                if (!include) {
                    node.selectors.splice(i, 1);
                }
            }
        }
        if (node.selectors.length === 0)
            return '';
        return `${node.selectors}{${this.mapVisit(decls)}}`;
    }
    /**
     * Visit declaration node.
     */
    declaration(node) {
        return node.property + ':' + node.value + ';';
    }
}

function removeUnusedStyles(config, usedSelectors, cssContent, diagnostics) {
    let cleanedCss = cssContent;
    try {
        // parse the css from being applied to the document
        const cssAst = parseCss(config, cssContent);
        if (cssAst.stylesheet.diagnostics.length) {
            cssAst.stylesheet.diagnostics.forEach(d => {
                diagnostics.push(d);
            });
            return cleanedCss;
        }
        try {
            // convert the parsed css back into a string
            // but only keeping what was found in our active selectors
            const stringify = new StringifyCss({ usedSelectors });
            cleanedCss = stringify.compile(cssAst);
        }
        catch (e) {
            diagnostics.push({
                level: 'error',
                type: 'css',
                header: 'CSS Stringify',
                messageText: e
            });
        }
    }
    catch (e) {
        diagnostics.push({
            level: 'error',
            type: 'css',
            header: 'CSS Parse',
            messageText: e
        });
    }
    return cleanedCss;
}

class UsedSelectors {
    constructor(elm) {
        this.tags = [];
        this.classNames = [];
        this.ids = [];
        this.attrs = [];
        this.collectSelectors(elm);
    }
    collectSelectors(elm) {
        var i;
        if (elm && elm.tagName) {
            // tags
            const tagName = elm.tagName.toLowerCase();
            if (this.tags.indexOf(tagName) === -1) {
                this.tags.push(tagName);
            }
            // classes
            const classList = elm.classList;
            for (i = 0; i < classList.length; i++) {
                const className = classList[i];
                if (this.classNames.indexOf(className) === -1) {
                    this.classNames.push(className);
                }
            }
            // attributes
            const attributes = elm.attributes;
            for (i = 0; i < attributes.length; i++) {
                const attr = attributes[i];
                const attrName = attr.name.toLowerCase();
                if (!attrName || attrName === 'class' || attrName === 'id' || attrName === 'style')
                    continue;
                if (this.attrs.indexOf(attrName) === -1) {
                    this.attrs.push(attrName);
                }
            }
            // ids
            var idValue = elm.getAttribute('id');
            if (idValue) {
                idValue = idValue.trim();
                if (idValue && this.ids.indexOf(idValue) === -1) {
                    this.ids.push(idValue);
                }
            }
            // drill down
            for (i = 0; i < elm.children.length; i++) {
                this.collectSelectors(elm.children[i]);
            }
        }
    }
}

function optimizeSsrStyles(config, outputTarget, doc, diagnostics) {
    const ssrStyleElm = mergeSsrStyles(doc);
    if (ssrStyleElm == null) {
        return;
    }
    if (outputTarget.removeUnusedStyles !== false) {
        // removeUnusedStyles is the default
        try {
            // pick out all of the selectors that are actually
            // being used in the html document
            const usedSelectors = new UsedSelectors(doc.documentElement);
            // remove any selectors that are not used in this document
            ssrStyleElm.innerHTML = removeUnusedStyles(config, usedSelectors, ssrStyleElm.innerHTML, diagnostics);
        }
        catch (e) {
            diagnostics.push({
                level: 'error',
                type: 'hydrate',
                header: 'HTML Selector Parse',
                messageText: e
            });
        }
    }
}
function mergeSsrStyles(doc) {
    // get all the styles that were added during prerendering
    const ssrStyleElms = doc.head.querySelectorAll(`style[data-styles]`);
    if (ssrStyleElms.length === 0) {
        // this doc doesn't have any ssr styles
        return null;
    }
    const styleText = [];
    let ssrStyleElm;
    for (let i = ssrStyleElms.length - 1; i >= 0; i--) {
        // iterate backwards for funzies
        ssrStyleElm = ssrStyleElms[i];
        // collect up all the style text from each style element
        styleText.push(ssrStyleElm.innerHTML);
        // remove this style element from the document
        ssrStyleElm.parentNode.removeChild(ssrStyleElm);
        if (i === 0) {
            // this is the first style element, let's use this
            // same element as the main one we'll load up
            // merge all of the styles we collected into one
            ssrStyleElm.innerHTML = styleText.reverse().join('').trim();
            if (ssrStyleElm.innerHTML.length > 0) {
                // let's keep the first style element
                // and make it the first element in the head
                doc.head.insertBefore(ssrStyleElm, doc.head.firstChild);
                // return the ssr style element we loaded up
                return ssrStyleElm;
            }
        }
    }
    return null;
}

function updateCanonicalLink(config, doc, windowLocationPath) {
    // https://webmasters.googleblog.com/2009/02/specify-your-canonical.html
    // <link rel="canonical" href="http://www.example.com/product.php?item=swedish-fish" />
    if (typeof windowLocationPath !== 'string') {
        return;
    }
    const canonicalLink = doc.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
        return;
    }
    const existingHref = canonicalLink.getAttribute('href');
    const updatedRref = updateCanonicalLinkHref(config, existingHref, windowLocationPath);
    canonicalLink.setAttribute('href', updatedRref);
}
function updateCanonicalLinkHref(config, href, windowLocationPath) {
    const parsedUrl = config.sys.url.parse(windowLocationPath);
    if (typeof href === 'string') {
        href = href.trim();
        if (href.endsWith('/')) {
            href = href.substr(0, href.length - 1);
        }
    }
    else {
        href = '';
    }
    return `${href}${parsedUrl.path}`;
}

var __awaiter$z = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function optimizeHtml(config, compilerCtx, hydrateTarget, windowLocationPath, doc, diagnostics) {
    return __awaiter$z(this, void 0, void 0, function* () {
        const promises = [];
        if (hydrateTarget.hydrateComponents) {
            doc.documentElement.setAttribute('data-ssr', (typeof hydrateTarget.timestamp === 'string' ? hydrateTarget.timestamp : ''));
        }
        if (hydrateTarget.canonicalLink) {
            try {
                updateCanonicalLink(config, doc, windowLocationPath);
            }
            catch (e) {
                diagnostics.push({
                    level: 'error',
                    type: 'hydrate',
                    header: 'Insert Canonical Link',
                    messageText: e
                });
            }
        }
        if (hydrateTarget.inlineStyles) {
            try {
                optimizeSsrStyles(config, hydrateTarget, doc, diagnostics);
            }
            catch (e) {
                diagnostics.push({
                    level: 'error',
                    type: 'hydrate',
                    header: 'Inline Component Styles',
                    messageText: e
                });
            }
        }
        if (hydrateTarget.inlineLoaderScript) {
            // remove the script to the external loader script request
            // inline the loader script at the bottom of the html
            promises.push(inlineLoaderScript(config, compilerCtx, hydrateTarget, windowLocationPath, doc));
        }
        if (hydrateTarget.inlineAssetsMaxSize > 0) {
            promises.push(inlineExternalAssets(config, compilerCtx, hydrateTarget, windowLocationPath, doc));
        }
        if (hydrateTarget.collapseWhitespace && !config.devMode && config.logLevel !== 'debug') {
            // collapseWhitespace is the default
            try {
                config.logger.debug(`optimize ${windowLocationPath}, collapse html whitespace`);
                collapseHtmlWhitepace(doc.documentElement);
            }
            catch (e) {
                diagnostics.push({
                    level: 'error',
                    type: 'hydrate',
                    header: 'Reduce HTML Whitespace',
                    messageText: e
                });
            }
        }
        // need to wait on to see if external files are inlined
        yield Promise.all(promises);
        // reset for new promises
        promises.length = 0;
        if (config.minifyCss) {
            promises.push(minifyInlineStyles(config, compilerCtx, doc, diagnostics));
        }
        if (config.minifyJs) {
            promises.push(minifyInlineScripts(config, compilerCtx, doc, diagnostics));
        }
        if (config.assetVersioning) {
            promises.push(assetVersioning(config, compilerCtx, hydrateTarget, windowLocationPath, doc));
        }
        yield Promise.all(promises);
    });
}
function optimizeIndexHtml(config, compilerCtx, hydrateTarget, windowLocationPath, diagnostics) {
    return __awaiter$z(this, void 0, void 0, function* () {
        try {
            hydrateTarget.html = yield compilerCtx.fs.readFile(hydrateTarget.indexHtml);
            try {
                const dom = config.sys.createDom();
                const win = dom.parse(hydrateTarget);
                const doc = win.document;
                yield optimizeHtml(config, compilerCtx, hydrateTarget, windowLocationPath, doc, diagnostics);
                // serialize this dom back into a string
                yield compilerCtx.fs.writeFile(hydrateTarget.indexHtml, dom.serialize());
            }
            catch (e) {
                catchError(diagnostics, e);
            }
        }
        catch (e) {
            // index.html file doesn't exist, which is fine
        }
    });
}

/**
 * Production h() function based on Preact by
 * Jason Miller (@developit)
 * Licensed under the MIT License
 * https://github.com/developit/preact/blob/master/LICENSE
 *
 * Modified for Stencil's compiler and vdom
 */
const stack = [];
function h(nodeName, vnodeData) {
    let children = null;
    let lastSimple = false;
    let simple = false;
    for (var i = arguments.length; i-- > 2;) {
        stack.push(arguments[i]);
    }
    while (stack.length > 0) {
        let child = stack.pop();
        if (child && child.pop !== undefined) {
            for (i = child.length; i--;) {
                stack.push(child[i]);
            }
        }
        else {
            if (typeof child === 'boolean') {
                child = null;
            }
            if ((simple = typeof nodeName !== 'function')) {
                if (child == null) {
                    child = '';
                }
                else if (typeof child === 'number') {
                    child = String(child);
                }
                else if (typeof child !== 'string') {
                    simple = false;
                }
            }
            if (simple && lastSimple) {
                children[children.length - 1].vtext += child;
            }
            else if (children === null) {
                children = [simple ? { vtext: child } : child];
            }
            else {
                children.push(simple ? { vtext: child } : child);
            }
            lastSimple = simple;
        }
    }
    let vkey;
    let vname;
    if (vnodeData != null) {
        // normalize class / classname attributes
        if (vnodeData['className']) {
            vnodeData['class'] = vnodeData['className'];
        }
        if (typeof vnodeData['class'] === 'object') {
            for (i in vnodeData['class']) {
                if (vnodeData['class'][i]) {
                    stack.push(i);
                }
            }
            vnodeData['class'] = stack.join(' ');
            stack.length = 0;
        }
        if (vnodeData.key != null) {
            vkey = vnodeData.key;
        }
        if (vnodeData.name != null) {
            vname = vnodeData.name;
        }
    }
    if (typeof nodeName === 'function') {
        // nodeName is a functional component
        return nodeName(Object.assign({}, vnodeData, { children: children }), utils);
    }
    return {
        vtag: nodeName,
        vchildren: children,
        vtext: undefined,
        vattrs: vnodeData,
        vkey: vkey,
        vname: vname,
        elm: undefined,
        ishost: false
    };
}
function childToVNode(child) {
    return {
        vtag: child['vtag'],
        vchildren: child['vchildren'],
        vtext: child['vtext'],
        vattrs: child['vattrs'],
        vkey: child['vkey'],
        vname: child['vname']
    };
}
function VNodeToChild(vnode) {
    return {
        'vtag': vnode.vtag,
        'vchildren': vnode.vchildren,
        'vtext': vnode.vtext,
        'vattrs': vnode.vattrs,
        'vkey': vnode.vkey,
        'vname': vnode.vname
    };
}
const utils = {
    'forEach': (children, cb) => {
        children.forEach((item) => cb(VNodeToChild(item)));
    },
    'map': (children, cb) => {
        return children.map((item) => childToVNode(cb(VNodeToChild(item))));
    }
};

function normalizeHydrateOptions(wwwTarget, opts) {
    const hydrateTarget = Object.assign({}, wwwTarget);
    hydrateTarget.prerenderLocations = wwwTarget.prerenderLocations.map(p => Object.assign({}, p));
    hydrateTarget.hydrateComponents = true;
    const req = opts.req;
    if (req && typeof req.get === 'function') {
        // assuming node express request object
        // https://expressjs.com/
        if (!opts.url)
            opts.url = req.protocol + '://' + req.get('host') + req.originalUrl;
        if (!opts.referrer)
            opts.referrer = req.get('referrer');
        if (!opts.userAgent)
            opts.userAgent = req.get('user-agent');
        if (!opts.cookie)
            opts.cookie = req.get('cookie');
    }
    Object.assign(hydrateTarget, opts);
    return hydrateTarget;
}
function generateHydrateResults(config, hydrateTarget) {
    if (!hydrateTarget.url) {
        hydrateTarget.url = `https://hydrate.stenciljs.com/`;
    }
    // https://nodejs.org/api/url.html
    const urlParse = config.sys.url.parse(hydrateTarget.url);
    const hydrateResults = {
        diagnostics: [],
        url: hydrateTarget.url,
        host: urlParse.host,
        hostname: urlParse.hostname,
        port: urlParse.port,
        path: urlParse.path,
        pathname: urlParse.pathname,
        search: urlParse.search,
        query: urlParse.query,
        hash: urlParse.hash,
        html: hydrateTarget.html,
        styles: null,
        anchors: [],
        components: [],
        styleUrls: [],
        scriptUrls: [],
        imgUrls: []
    };
    createConsole(config, hydrateTarget, hydrateResults);
    return hydrateResults;
}
function createConsole(config, opts, results) {
    const pathname = results.pathname;
    opts.console = opts.console || {};
    if (typeof opts.console.error !== 'function') {
        opts.console.error = function (...args) {
            results.diagnostics.push({
                level: `error`,
                type: `hydrate`,
                header: `runtime console.error: ${pathname}`,
                messageText: args.join(', ')
            });
        };
    }
    if (config.logLevel === 'debug') {
        ['debug', 'info', 'log', 'warn'].forEach(level => {
            if (typeof opts.console[level] !== 'function') {
                opts.console[level] = function (...args) {
                    results.diagnostics.push({
                        level: level,
                        type: 'hydrate',
                        header: `runtime console.${level}: ${pathname}`,
                        messageText: args.join(', ')
                    });
                };
            }
        });
    }
}
function normalizeDirection(doc, hydrateTarget) {
    let dir = doc.body.getAttribute('dir');
    if (dir) {
        dir = dir.trim().toLowerCase();
        if (dir.trim().length > 0) {
            console.warn(`dir="${dir}" should be placed on the <html> instead of <body>`);
        }
    }
    if (hydrateTarget.direction) {
        dir = hydrateTarget.direction;
    }
    else {
        dir = doc.documentElement.getAttribute('dir');
    }
    if (dir) {
        dir = dir.trim().toLowerCase();
        if (dir !== 'ltr' && dir !== 'rtl') {
            console.warn(`only "ltr" and "rtl" are valid "dir" values on the <html> element`);
        }
    }
    if (dir !== 'ltr' && dir !== 'rtl') {
        dir = 'ltr';
    }
    doc.documentElement.dir = dir;
}
function normalizeLanguage(doc, hydrateTarget) {
    let lang = doc.body.getAttribute('lang');
    if (lang) {
        lang = lang.trim().toLowerCase();
        if (lang.trim().length > 0) {
            console.warn(`lang="${lang}" should be placed on <html> instead of <body>`);
        }
    }
    if (hydrateTarget.language) {
        lang = hydrateTarget.language;
    }
    else {
        lang = doc.documentElement.getAttribute('lang');
    }
    if (lang) {
        lang = lang.trim().toLowerCase();
        if (lang.length > 0) {
            doc.documentElement.lang = lang;
        }
    }
}
function collectAnchors(config, doc, results) {
    const anchorElements = doc.querySelectorAll('a');
    for (var i = 0; i < anchorElements.length; i++) {
        const attrs = {};
        const anchorAttrs = anchorElements[i].attributes;
        for (var j = 0; j < anchorAttrs.length; j++) {
            attrs[anchorAttrs[j].nodeName.toLowerCase()] = anchorAttrs[j].nodeValue;
        }
        results.anchors.push(attrs);
    }
    config.logger.debug(`optimize ${results.pathname}, collected anchors: ${results.anchors.length}`);
}
function generateFailureDiagnostic(diagnostic) {
    return `
    <div style="padding: 20px;">
      <div style="font-weight: bold;">${diagnostic.header}</div>
      <div>${diagnostic.messageText}</div>
    </div>
  `;
}

function initHostSnapshot(domApi, cmpMeta, hostElm, hostSnapshot, attribName) {
    // the host element has connected to the dom
    // and we've waited a tick to make sure all frameworks
    // have finished adding attributes and child nodes to the host
    // before we go all out and hydrate this beast
    // let's first take a snapshot of its original layout before render
    if (!hostElm.mode) {
        // looks like mode wasn't set as a property directly yet
        // first check if there's an attribute
        // next check the app's global
        hostElm.mode = domApi.$getMode(hostElm);
    }
    {
        // if the slot polyfill is required we'll need to put some nodes
        // in here to act as original content anchors as we move nodes around
        // host element has been connected to the DOM
        if (!hostElm['s-cr'] && !domApi.$getAttribute(hostElm, SSR_VNODE_ID) && (!domApi.$supportsShadowDom || cmpMeta.encapsulationMeta !== 1 /* ShadowDom */)) {
            // only required when we're NOT using native shadow dom (slot)
            // or this browser doesn't support native shadow dom
            // and this host element was NOT created with SSR
            // let's pick out the inner content for slot projection
            // create a node to represent where the original
            // content was first placed, which is useful later on
            hostElm['s-cr'] = domApi.$createTextNode('');
            hostElm['s-cr']['s-cn'] = true;
            domApi.$insertBefore(hostElm, hostElm['s-cr'], domApi.$childNodes(hostElm)[0]);
        }
        if (!domApi.$supportsShadowDom && cmpMeta.encapsulationMeta === 1 /* ShadowDom */) {
            // this component should use shadow dom
            // but this browser doesn't support it
            // so let's polyfill a few things for the user
            {
                hostElm.shadowRoot = hostElm;
            }
        }
    }
    {
        if (cmpMeta.encapsulationMeta === 1 /* ShadowDom */ && domApi.$supportsShadowDom && !hostElm.shadowRoot) {
            // this component is using shadow dom
            // and this browser supports shadow dom
            // add the read-only property "shadowRoot" to the host element
            domApi.$attachShadow(hostElm, { mode: 'open' });
        }
    }
    // create a host snapshot object we'll
    // use to store all host data about to be read later
    hostSnapshot = {
        $id: hostElm['s-id'],
        $attributes: {}
    };
    // loop through and gather up all the original attributes on the host
    // this is useful later when we're creating the component instance
    cmpMeta.membersMeta && Object.keys(cmpMeta.membersMeta).forEach(memberName => {
        if (attribName = cmpMeta.membersMeta[memberName].attribName) {
            hostSnapshot.$attributes[attribName] = domApi.$getAttribute(hostElm, attribName);
        }
    });
    return hostSnapshot;
}

function initElementListeners(plt, elm) {
    // so the element was just connected, which means it's in the DOM
    // however, the component instance hasn't been created yet
    // but what if an event it should be listening to get emitted right now??
    // let's add our listeners right now to our element, and if it happens
    // to receive events between now and the instance being created let's
    // queue up all of the event data and fire it off on the instance when it's ready
    const cmpMeta = plt.getComponentMeta(elm);
    if (cmpMeta.listenersMeta) {
        // we've got listens
        cmpMeta.listenersMeta.forEach(listenMeta => {
            // go through each listener
            if (!listenMeta.eventDisabled) {
                // only add ones that are not already disabled
                plt.domApi.$addEventListener(elm, listenMeta.eventName, createListenerCallback(plt, elm, listenMeta.eventMethodName), listenMeta.eventCapture, listenMeta.eventPassive);
            }
        });
    }
}
function createListenerCallback(plt, elm, eventMethodName, val) {
    // create the function that gets called when the element receives
    // an event which it should be listening for
    return (ev) => {
        // get the instance if it exists
        val = plt.instanceMap.get(elm);
        if (val) {
            // instance is ready, let's call it's member method for this event
            val[eventMethodName](ev);
        }
        else {
            // instance is not ready!!
            // let's queue up this event data and replay it later
            // when the instance is ready
            val = (plt.queuedEvents.get(elm) || []);
            val.push(eventMethodName, ev);
            plt.queuedEvents.set(elm, val);
        }
    };
}
function enableEventListener(plt, instance, eventName, shouldEnable, attachTo, passive) {
    if (instance) {
        // cool, we've got an instance, it's get the element it's on
        const elm = plt.hostElementMap.get(instance);
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta && cmpMeta.listenersMeta) {
            // alrighty, so this cmp has listener meta
            if (shouldEnable) {
                // we want to enable this event
                // find which listen meta we're talking about
                const listenMeta = cmpMeta.listenersMeta.find(l => l.eventName === eventName);
                if (listenMeta) {
                    // found the listen meta, so let's add the listener
                    plt.domApi.$addEventListener(elm, eventName, (ev) => instance[listenMeta.eventMethodName](ev), listenMeta.eventCapture, (passive === undefined) ? listenMeta.eventPassive : !!passive, attachTo);
                }
            }
            else {
                // we're disabling the event listener
                // so let's just remove it entirely
                plt.domApi.$removeEventListener(elm, eventName);
            }
        }
    }
}

function connectedCallback(plt, cmpMeta, elm) {
    {
        // initialize our event listeners on the host element
        // we do this now so that we can listening to events that may
        // have fired even before the instance is ready
        if (!plt.hasListenersMap.has(elm)) {
            // it's possible we've already connected
            // then disconnected
            // and the same element is reconnected again
            plt.hasListenersMap.set(elm, true);
            initElementListeners(plt, elm);
        }
    }
    // this element just connected, which may be re-connecting
    // ensure we remove it from our map of disconnected
    plt.isDisconnectedMap.delete(elm);
    if (!plt.hasConnectedMap.has(elm)) {
        // first time we've connected
        plt.hasConnectedMap.set(elm, true);
        if (!elm['s-id']) {
            // assign a unique id to this host element
            // it's possible this was already given an element id
            elm['s-id'] = plt.nextId();
        }
        // register this component as an actively
        // loading child to its parent component
        registerWithParentComponent(plt, elm);
        // add to the queue to load the bundle
        // it's important to have an async tick in here so we can
        // ensure the "mode" attribute has been added to the element
        // place in high priority since it's not much work and we need
        // to know as fast as possible, but still an async tick in between
        plt.queue.tick(() => {
            // start loading this component mode's bundle
            // if it's already loaded then the callback will be synchronous
            plt.hostSnapshotMap.set(elm, initHostSnapshot(plt.domApi, cmpMeta, elm));
            plt.requestBundle(cmpMeta, elm);
        });
    }
}
function registerWithParentComponent(plt, elm, ancestorHostElement) {
    // find the first ancestor host element (if there is one) and register
    // this element as one of the actively loading child elements for its ancestor
    ancestorHostElement = elm;
    while (ancestorHostElement = plt.domApi.$parentElement(ancestorHostElement)) {
        // climb up the ancestors looking for the first registered component
        if (plt.isDefinedComponent(ancestorHostElement)) {
            // we found this elements the first ancestor host element
            // if the ancestor already loaded then do nothing, it's too late
            if (!plt.hasLoadedMap.has(elm)) {
                // keep a reference to this element's ancestor host element
                // elm._ancestorHostElement = ancestorHostElement;
                plt.ancestorHostElementMap.set(elm, ancestorHostElement);
                // ensure there is an array to contain a reference to each of the child elements
                // and set this element as one of the ancestor's child elements it should wait on
                if (ancestorHostElement['$activeLoading']) {
                    // $activeLoading deprecated 2018-04-02
                    ancestorHostElement['s-ld'] = ancestorHostElement['$activeLoading'];
                }
                (ancestorHostElement['s-ld'] = ancestorHostElement['s-ld'] || []).push(elm);
            }
            break;
        }
    }
}

function parsePropertyValue(propType, propValue) {
    // ensure this value is of the correct prop type
    // we're testing both formats of the "propType" value because
    // we could have either gotten the data from the attribute changed callback,
    // which wouldn't have Constructor data yet, and because this method is reused
    // within proxy where we don't have meta data, but only constructor data
    if (isDef(propValue) && typeof propValue !== 'object' && typeof propValue !== 'function') {
        if (propType === Boolean || propType === 3 /* Boolean */) {
            // per the HTML spec, any string value means it is a boolean true value
            // but we'll cheat here and say that the string "false" is the boolean false
            return (propValue === 'false' ? false : propValue === '' || !!propValue);
        }
        if (propType === Number || propType === 4 /* Number */) {
            // force it to be a number
            return parseFloat(propValue);
        }
        if (propType === String || propType === 2 /* String */) {
            // could have been passed as a number or boolean
            // but we still want it as a string
            return propValue.toString();
        }
    }
    // not sure exactly what type we want
    // so no need to change to a different type
    return propValue;
}

function attributeChangedCallback(membersMeta, elm, attribName, oldVal, newVal, propName, memberMeta) {
    // only react if the attribute values actually changed
    if (membersMeta && oldVal !== newVal) {
        // using the known component meta data
        // look up to see if we have a property wired up to this attribute name
        for (propName in membersMeta) {
            memberMeta = membersMeta[propName];
            // normalize the attribute name w/ lower case
            if (memberMeta.attribName && toLowerCase(memberMeta.attribName) === toLowerCase(attribName)) {
                // cool we've got a prop using this attribute name, the value will
                // be a string, so let's convert it to the correct type the app wants
                elm[propName] = parsePropertyValue(memberMeta.propType, newVal);
                break;
            }
        }
    }
}

function initEventEmitters(plt, cmpEvents, instance) {
    if (cmpEvents) {
        const elm = plt.hostElementMap.get(instance);
        cmpEvents.forEach(eventMeta => {
            instance[eventMeta.method] = {
                emit: (data) => {
                    plt.emitEvent(elm, eventMeta.name, {
                        bubbles: eventMeta.bubbles,
                        composed: eventMeta.composed,
                        cancelable: eventMeta.cancelable,
                        detail: data
                    });
                }
            };
        });
    }
}

function proxyComponentInstance(plt, cmpConstructor, elm, instance, hostSnapshot, properties, memberName) {
    // at this point we've got a specific node of a host element, and created a component class instance
    // and we've already created getters/setters on both the host element and component class prototypes
    // let's upgrade any data that might have been set on the host element already
    // and let's have the getters/setters kick in and do their jobs
    // let's automatically add a reference to the host element on the instance
    plt.hostElementMap.set(instance, elm);
    // create the values object if it doesn't already exist
    // this will hold all of the internal getter/setter values
    if (!plt.valuesMap.has(elm)) {
        plt.valuesMap.set(elm, {});
    }
    // get the properties from the constructor
    // and add default "mode" and "color" properties
    properties = Object.assign({
        color: { type: String }
    }, cmpConstructor.properties);
    // always set mode
    properties.mode = { type: String };
    // define each of the members and initialize what their role is
    for (memberName in properties) {
        defineMember(plt, properties[memberName], elm, instance, memberName, hostSnapshot);
    }
}

function initComponentInstance(plt, elm, hostSnapshot, instance, componentConstructor, queuedEvents, i) {
    try {
        // using the user's component class, let's create a new instance
        componentConstructor = plt.getComponentMeta(elm).componentConstructor;
        instance = new componentConstructor();
        // ok cool, we've got an host element now, and a actual instance
        // and there were no errors creating the instance
        // let's upgrade the data on the host element
        // and let the getters/setters do their jobs
        proxyComponentInstance(plt, componentConstructor, elm, instance, hostSnapshot);
        {
            // add each of the event emitters which wire up instance methods
            // to fire off dom events from the host element
            initEventEmitters(plt, componentConstructor.events, instance);
        }
        {
            try {
                // replay any event listeners on the instance that
                // were queued up between the time the element was
                // connected and before the instance was ready
                queuedEvents = plt.queuedEvents.get(elm);
                if (queuedEvents) {
                    // events may have already fired before the instance was even ready
                    // now that the instance is ready, let's replay all of the events that
                    // we queued up earlier that were originally meant for the instance
                    for (i = 0; i < queuedEvents.length; i += 2) {
                        // data was added in sets of two
                        // first item the eventMethodName
                        // second item is the event data
                        // take a look at initElementListener()
                        instance[queuedEvents[i]](queuedEvents[i + 1]);
                    }
                    plt.queuedEvents.delete(elm);
                }
            }
            catch (e) {
                plt.onError(e, 2 /* QueueEventsError */, elm);
            }
        }
    }
    catch (e) {
        // something done went wrong trying to create a component instance
        // create a dumby instance so other stuff can load
        // but chances are the app isn't fully working cuz this component has issues
        instance = {};
        plt.onError(e, 7 /* InitInstanceError */, elm, true);
    }
    plt.instanceMap.set(elm, instance);
    return instance;
}
function initComponentLoaded(plt, elm, hydratedCssClass, instance, onReadyCallbacks) {
    // all is good, this component has been told it's time to finish loading
    // it's possible that we've already decided to destroy this element
    // check if this element has any actively loading child elements
    if (!plt.hasLoadedMap.has(elm) &&
        (instance = plt.instanceMap.get(elm)) &&
        !plt.isDisconnectedMap.has(elm) &&
        (!elm['s-ld'] || !elm['s-ld'].length)) {
        // cool, so at this point this element isn't already being destroyed
        // and it does not have any child elements that are still loading
        // ensure we remove any child references cuz it doesn't matter at this point
        delete elm['s-ld'];
        // sweet, this particular element is good to go
        // all of this element's children have loaded (if any)
        // elm._hasLoaded = true;
        plt.hasLoadedMap.set(elm, true);
        try {
            // fire off the ref if it exists
            callNodeRefs(plt.vnodeMap.get(elm));
            // fire off the user's elm.componentOnReady() callbacks that were
            // put directly on the element (well before anything was ready)
            if (onReadyCallbacks = plt.onReadyCallbacksMap.get(elm)) {
                onReadyCallbacks.forEach(cb => cb(elm));
                plt.onReadyCallbacksMap.delete(elm);
            }
            {
                // fire off the user's componentDidLoad method (if one was provided)
                // componentDidLoad only runs ONCE, after the instance's element has been
                // assigned as the host element, and AFTER render() has been called
                // we'll also fire this method off on the element, just to
                instance.componentDidLoad && instance.componentDidLoad();
            }
        }
        catch (e) {
            plt.onError(e, 4 /* DidLoadError */, elm);
        }
        // add the css class that this element has officially hydrated
        plt.domApi.$addClass(elm, hydratedCssClass);
        // ( •_•)
        // ( •_•)>⌐■-■
        // (⌐■_■)
        // load events fire from bottom to top
        // the deepest elements load first then bubbles up
        propagateComponentLoaded(plt, elm);
    }
}
function propagateComponentLoaded(plt, elm, index, ancestorsActivelyLoadingChildren) {
    // load events fire from bottom to top
    // the deepest elements load first then bubbles up
    const ancestorHostElement = plt.ancestorHostElementMap.get(elm);
    if (ancestorHostElement) {
        // ok so this element already has a known ancestor host element
        // let's make sure we remove this element from its ancestor's
        // known list of child elements which are actively loading
        ancestorsActivelyLoadingChildren = ancestorHostElement['s-ld'] || ancestorHostElement['$activeLoading'];
        if (ancestorsActivelyLoadingChildren) {
            index = ancestorsActivelyLoadingChildren.indexOf(elm);
            if (index > -1) {
                // yup, this element is in the list of child elements to wait on
                // remove it so we can work to get the length down to 0
                ancestorsActivelyLoadingChildren.splice(index, 1);
            }
            // the ancestor's initLoad method will do the actual checks
            // to see if the ancestor is actually loaded or not
            // then let's call the ancestor's initLoad method if there's no length
            // (which actually ends up as this method again but for the ancestor)
            if (!ancestorsActivelyLoadingChildren.length) {
                ancestorHostElement['s-init'] && ancestorHostElement['s-init']();
                // $initLoad deprecated 2018-04-02
                ancestorHostElement['$initLoad'] && ancestorHostElement['$initLoad']();
            }
        }
        plt.ancestorHostElementMap.delete(elm);
    }
}

function getScopeId(cmpMeta, mode) {
    return ('sc-' + cmpMeta.tagNameMeta) + ((mode && mode !== DEFAULT_STYLE_MODE) ? '-' + mode : '');
}
function getElementScopeId(scopeId, isHostElement) {
    return scopeId + (isHostElement ? '-h' : '-s');
}

function render(plt, cmpMeta, hostElm, instance) {
    try {
        // if this component has a render function, let's fire
        // it off and generate the child vnodes for this host element
        // note that we do not create the host element cuz it already exists
        const hostMeta = cmpMeta.componentConstructor.host;
        const encapsulation = cmpMeta.componentConstructor.encapsulation;
        // test if this component should be shadow dom
        // and if so does the browser supports it
        const useNativeShadowDom = (encapsulation === 'shadow' && plt.domApi.$supportsShadowDom);
        let reflectHostAttr;
        let rootElm;
        {
            reflectHostAttr = reflectInstanceValuesToHostAttributes(cmpMeta.componentConstructor.properties, instance);
        }
        if (useNativeShadowDom) {
            // this component SHOULD use native slot/shadow dom
            // this browser DOES support native shadow dom
            // and this is the first render
            // let's create that shadow root
            {
                rootElm = hostElm.shadowRoot;
            }
        }
        else {
            // not using, or can't use shadow dom
            // set the root element, which will be the shadow root when enabled
            rootElm = hostElm;
        }
        if (!hostElm['s-rn']) {
            // attach the styles this component needs, if any
            // this fn figures out if the styles should go in a
            // shadow root or if they should be global
            plt.attachStyles(plt, plt.domApi, cmpMeta, hostElm);
            // if no render function
            const scopeId = hostElm['s-sc'];
            if (scopeId) {
                plt.domApi.$addClass(hostElm, getElementScopeId(scopeId, true));
                if (!instance.render) {
                    plt.domApi.$addClass(hostElm, getElementScopeId(scopeId));
                }
            }
        }
        if (instance.render || instance.hostData || hostMeta || reflectHostAttr) {
            // tell the platform we're actively rendering
            // if a value is changed within a render() then
            // this tells the platform not to queue the change
            plt.activeRender = true;
            const vnodeChildren = instance.render && instance.render();
            let vnodeHostData;
            {
                // user component provided a "hostData()" method
                // the returned data/attributes are used on the host element
                vnodeHostData = instance.hostData && instance.hostData();
                {
                    if (vnodeHostData && cmpMeta.membersMeta) {
                        const foundHostKeys = Object.keys(vnodeHostData).reduce((err, k) => {
                            if (cmpMeta.membersMeta[k]) {
                                return err.concat(k);
                            }
                            if (cmpMeta.membersMeta[dashToPascalCase(k)]) {
                                return err.concat(dashToPascalCase(k));
                            }
                            return err;
                        }, []);
                        if (foundHostKeys.length > 0) {
                            throw new Error(`The following keys were attempted to be set with hostData() from the ` +
                                `${cmpMeta.tagNameMeta} component: ${foundHostKeys.join(', ')}. ` +
                                `If you would like to modify these please set @Prop({ mutable: true, reflectToAttr: true}) ` +
                                `on the @Prop() decorator.`);
                        }
                    }
                }
            }
            if (reflectHostAttr) {
                vnodeHostData = vnodeHostData ? Object.assign(vnodeHostData, reflectHostAttr) : reflectHostAttr;
            }
            // tell the platform we're done rendering
            // now any changes will again queue
            plt.activeRender = false;
            if (hostMeta) {
                // component meta data has a "theme"
                // use this to automatically generate a good css class
                // from the mode and color to add to the host element
                vnodeHostData = applyComponentHostData(vnodeHostData, hostMeta, instance);
            }
            // looks like we've got child nodes to render into this host element
            // or we need to update the css class/attrs on the host element
            // if we haven't already created a vnode, then we give the renderer the actual element
            // if this is a re-render, then give the renderer the last vnode we already created
            const oldVNode = plt.vnodeMap.get(hostElm) || {};
            oldVNode.elm = rootElm;
            const hostVNode = h(null, vnodeHostData, vnodeChildren);
            {
                // only care if we're reflecting values to the host element
                hostVNode.ishost = true;
            }
            // each patch always gets a new vnode
            // the host element itself isn't patched because it already exists
            // kick off the actual render and any DOM updates
            plt.vnodeMap.set(hostElm, plt.render(hostElm, oldVNode, hostVNode, useNativeShadowDom, encapsulation));
        }
        // update styles!
        if (plt.customStyle) {
            plt.customStyle.updateHost(hostElm);
        }
        // it's official, this element has rendered
        hostElm['s-rn'] = true;
        if (hostElm['$onRender']) {
            // $onRender deprecated 2018-04-02
            hostElm['s-rc'] = hostElm['$onRender'];
        }
        if (hostElm['s-rc']) {
            // ok, so turns out there are some child host elements
            // waiting on this parent element to load
            // let's fire off all update callbacks waiting
            hostElm['s-rc'].forEach(cb => cb());
            hostElm['s-rc'] = null;
        }
    }
    catch (e) {
        plt.activeRender = false;
        plt.onError(e, 8 /* RenderError */, hostElm, true);
    }
}
function applyComponentHostData(vnodeHostData, hostMeta, instance) {
    vnodeHostData = vnodeHostData || {};
    // component meta data has a "theme"
    // use this to automatically generate a good css class
    // from the mode and color to add to the host element
    Object.keys(hostMeta).forEach(key => {
        if (key === 'theme') {
            // host: { theme: 'button' }
            // adds css classes w/ mode and color combinations
            // class="button button-md button-primary button-md-primary"
            convertCssNamesToObj(vnodeHostData['class'] = vnodeHostData['class'] || {}, hostMeta[key], instance.mode, instance.color);
        }
        else if (key === 'class') {
            // host: { class: 'multiple css-classes' }
            // class="multiple css-classes"
            convertCssNamesToObj(vnodeHostData[key] = vnodeHostData[key] || {}, hostMeta[key]);
        }
        else {
            // rando attribute/properties
            vnodeHostData[key] = hostMeta[key];
        }
    });
    return vnodeHostData;
}
function convertCssNamesToObj(cssClassObj, className, mode, color) {
    className.split(' ').forEach(cssClass => {
        cssClassObj[cssClass] = true;
        if (mode) {
            cssClassObj[`${cssClass}-${mode}`] = true;
            if (color) {
                cssClassObj[`${cssClass}-${mode}-${color}`] = cssClassObj[`${cssClass}-${color}`] = true;
            }
        }
    });
}
function reflectInstanceValuesToHostAttributes(properties, instance, reflectHostAttr) {
    if (properties) {
        Object.keys(properties).forEach(memberName => {
            if (properties[memberName].reflectToAttr) {
                reflectHostAttr = reflectHostAttr || {};
                reflectHostAttr[memberName] = instance[memberName];
            }
        });
    }
    return reflectHostAttr;
}

function queueUpdate(plt, elm) {
    // only run patch if it isn't queued already
    if (!plt.isQueuedForUpdate.has(elm)) {
        plt.isQueuedForUpdate.set(elm, true);
        // run the patch in the next tick
        // vdom diff and patch the host element for differences
        if (plt.isAppLoaded) {
            // app has already loaded
            // let's queue this work in the dom write phase
            plt.queue.write(() => update(plt, elm));
        }
        else {
            // app hasn't finished loading yet
            // so let's use next tick to do everything
            // as fast as possible
            plt.queue.tick(() => update(plt, elm));
        }
    }
}
function update(plt, elm, isInitialLoad, instance, ancestorHostElement, userPromise) {
    // no longer queued for update
    plt.isQueuedForUpdate.delete(elm);
    // everything is async, so somehow we could have already disconnected
    // this node, so be sure to do nothing if we've already disconnected
    if (!plt.isDisconnectedMap.has(elm)) {
        instance = plt.instanceMap.get(elm);
        isInitialLoad = !instance;
        if (isInitialLoad) {
            ancestorHostElement = plt.ancestorHostElementMap.get(elm);
            if (ancestorHostElement && ancestorHostElement['$rendered']) {
                // $rendered deprecated 2018-04-02
                ancestorHostElement['s-rn'] = true;
            }
            if (ancestorHostElement && !ancestorHostElement['s-rn']) {
                // this is the intial load
                // this element has an ancestor host element
                // but the ancestor host element has NOT rendered yet
                // so let's just cool our jets and wait for the ancestor to render
                (ancestorHostElement['s-rc'] = ancestorHostElement['s-rc'] || []).push(() => {
                    // this will get fired off when the ancestor host element
                    // finally gets around to rendering its lazy self
                    update(plt, elm);
                });
                // $onRender deprecated 2018-04-02
                ancestorHostElement['$onRender'] = ancestorHostElement['s-rc'];
                return;
            }
            // haven't created a component instance for this host element yet!
            // create the instance from the user's component class
            // https://www.youtube.com/watch?v=olLxrojmvMg
            instance = initComponentInstance(plt, elm, plt.hostSnapshotMap.get(elm));
            {
                // fire off the user's componentWillLoad method (if one was provided)
                // componentWillLoad only runs ONCE, after instance's element has been
                // assigned as the host element, but BEFORE render() has been called
                try {
                    if (instance.componentWillLoad) {
                        userPromise = instance.componentWillLoad();
                    }
                }
                catch (e) {
                    plt.onError(e, 3 /* WillLoadError */, elm);
                }
            }
        }
        else {
            // already created an instance and this is an update
            // fire off the user's componentWillUpdate method (if one was provided)
            // componentWillUpdate runs BEFORE render() has been called
            // but only BEFORE an UPDATE and not before the intial render
            // get the returned promise (if one was provided)
            try {
                if (instance.componentWillUpdate) {
                    userPromise = instance.componentWillUpdate();
                }
            }
            catch (e) {
                plt.onError(e, 5 /* WillUpdateError */, elm);
            }
        }
        if (userPromise && userPromise.then) {
            // looks like the user return a promise!
            // let's not actually kick off the render
            // until the user has resolved their promise
            userPromise.then(() => renderUpdate(plt, elm, instance, isInitialLoad));
        }
        else {
            // user never returned a promise so there's
            // no need to wait on anything, let's do the render now my friend
            renderUpdate(plt, elm, instance, isInitialLoad);
        }
    }
}
function renderUpdate(plt, elm, instance, isInitialLoad) {
    // if this component has a render function, let's fire
    // it off and generate a vnode for this
    render(plt, plt.getComponentMeta(elm), elm, instance);
    try {
        if (isInitialLoad) {
            // so this was the initial load i guess
            elm['s-init']();
            // componentDidLoad just fired off
        }
        else {
            {
                // fire off the user's componentDidUpdate method (if one was provided)
                // componentDidUpdate runs AFTER render() has been called
                // but only AFTER an UPDATE and not after the intial render
                instance.componentDidUpdate && instance.componentDidUpdate();
            }
            callNodeRefs(plt.vnodeMap.get(elm));
        }
        {
            elm['s-hmr-load'] && elm['s-hmr-load']();
        }
    }
    catch (e) {
        // derp
        plt.onError(e, 6 /* DidUpdateError */, elm, true);
    }
}

function defineMember(plt, property, elm, instance, memberName, hostSnapshot, hostAttributes, hostAttrValue) {
    function getComponentProp(values) {
        // component instance prop/state getter
        // get the property value directly from our internal values
        values = plt.valuesMap.get(plt.hostElementMap.get(this));
        return values && values[memberName];
    }
    function setComponentProp(newValue, elm) {
        // component instance prop/state setter (cannot be arrow fn)
        elm = plt.hostElementMap.get(this);
        if (elm) {
            if (property.state || property.mutable) {
                setValue(plt, elm, memberName, newValue);
            }
            else {
                console.warn(`@Prop() "${memberName}" on "${elm.tagName}" cannot be modified.`);
            }
        }
    }
    if (property.type || property.state) {
        const values = plt.valuesMap.get(elm);
        if (!property.state) {
            if (property.attr && (values[memberName] === undefined || values[memberName] === '')) {
                // check the prop value from the host element attribute
                if ((hostAttributes = hostSnapshot && hostSnapshot.$attributes) && isDef(hostAttrValue = hostAttributes[property.attr])) {
                    // looks like we've got an attribute value
                    // let's set it to our internal values
                    values[memberName] = parsePropertyValue(property.type, hostAttrValue);
                }
            }
            {
                // server-side
                // server-side elm has the getter/setter
                // on the actual element instance, not its prototype
                // on the server we cannot accurately use "hasOwnProperty"
                // instead we'll do a direct lookup to see if the
                // constructor has this property
                if (elementHasProperty(plt, elm, memberName)) {
                    // @Prop or @Prop({mutable:true})
                    // property values on the host element should override
                    // any default values on the component instance
                    if (values[memberName] === undefined) {
                        values[memberName] = elm[memberName];
                    }
                }
            }
        }
        if (instance.hasOwnProperty(memberName) && values[memberName] === undefined) {
            // @Prop() or @Prop({mutable:true}) or @State()
            // we haven't yet got a value from the above checks so let's
            // read any "own" property instance values already set
            // to our internal value as the source of getter data
            // we're about to define a property and it'll overwrite this "own" property
            values[memberName] = instance[memberName];
        }
        if (property.watchCallbacks) {
            values[WATCH_CB_PREFIX + memberName] = property.watchCallbacks.slice();
        }
        // add getter/setter to the component instance
        // these will be pointed to the internal data set from the above checks
        definePropertyGetterSetter(instance, memberName, getComponentProp, setComponentProp);
    }
    else if (property.elementRef) {
        // @Element()
        // add a getter to the element reference using
        // the member name the component meta provided
        definePropertyValue(instance, memberName, elm);
    }
    else if (property.method) {
        // @Method()
        // add a property "value" on the host element
        // which we'll bind to the instance's method
        definePropertyValue(elm, memberName, instance[memberName].bind(instance));
    }
    else if (property.context) {
        // @Prop({ context: 'config' })
        const contextObj = plt.getContextItem(property.context);
        if (contextObj !== undefined) {
            definePropertyValue(instance, memberName, (contextObj.getContext && contextObj.getContext(elm)) || contextObj);
        }
    }
    else if (property.connect) {
        // @Prop({ connect: 'ion-loading-ctrl' })
        definePropertyValue(instance, memberName, plt.propConnect(property.connect));
    }
}
function setValue(plt, elm, memberName, newVal, values, instance, watchMethods) {
    // get the internal values object, which should always come from the host element instance
    // create the _values object if it doesn't already exist
    values = plt.valuesMap.get(elm);
    if (!values) {
        plt.valuesMap.set(elm, values = {});
    }
    const oldVal = values[memberName];
    // check our new property value against our internal value
    if (newVal !== oldVal) {
        // gadzooks! the property's value has changed!!
        // set our new value!
        // https://youtu.be/dFtLONl4cNc?t=22
        values[memberName] = newVal;
        instance = plt.instanceMap.get(elm);
        if (instance) {
            // get an array of method names of watch functions to call
            watchMethods = values[WATCH_CB_PREFIX + memberName];
            if (watchMethods) {
                // this instance is watching for when this property changed
                for (let i = 0; i < watchMethods.length; i++) {
                    try {
                        // fire off each of the watch methods that are watching this property
                        instance[watchMethods[i]].call(instance, newVal, oldVal, memberName);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
            if (!plt.activeRender && elm['s-rn']) {
                // looks like this value actually changed, so we've got work to do!
                // but only if we've already rendered, otherwise just chill out
                // queue that we need to do an update, but don't worry about queuing
                // up millions cuz this function ensures it only runs once
                queueUpdate(plt, elm);
            }
        }
    }
}
function definePropertyValue(obj, propertyKey, value) {
    // minification shortcut
    Object.defineProperty(obj, propertyKey, {
        'configurable': true,
        'value': value
    });
}
function definePropertyGetterSetter(obj, propertyKey, get, set) {
    // minification shortcut
    Object.defineProperty(obj, propertyKey, {
        'configurable': true,
        'get': get,
        'set': set
    });
}
const WATCH_CB_PREFIX = `wc-`;
function elementHasProperty(plt, elm, memberName) {
    // within the browser, the element's prototype
    // already has its getter/setter set, but on the
    // server the prototype is shared causing issues
    // so instead the server's elm has the getter/setter
    // directly on the actual element instance, not its prototype
    // so at the time of this function being called, the server
    // side element is unaware if the element has this property
    // name. So for server-side only, do this trick below
    // don't worry, this runtime code doesn't show on the client
    let hasOwnProperty = elm.hasOwnProperty(memberName);
    if (!hasOwnProperty) {
        // element doesn't
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta) {
            if (cmpMeta.componentConstructor && cmpMeta.componentConstructor.properties) {
                // if we have the constructor property data, let's check that
                const member = cmpMeta.componentConstructor.properties[memberName];
                hasOwnProperty = !!(member && member.type);
            }
            if (!hasOwnProperty && cmpMeta.membersMeta) {
                // if we have the component's metadata, let's check that
                const member = cmpMeta.membersMeta[memberName];
                hasOwnProperty = !!(member && member.propType);
            }
        }
    }
    return hasOwnProperty;
}

function updateAttribute(elm, memberName, newValue, isBooleanAttr = typeof newValue === 'boolean') {
    const isXlinkNs = (memberName !== (memberName = memberName.replace(/^xlink\:?/, '')));
    if (newValue == null || (isBooleanAttr && (!newValue || newValue === 'false'))) {
        if (isXlinkNs) {
            elm.removeAttributeNS(XLINK_NS$1, toLowerCase(memberName));
        }
        else {
            elm.removeAttribute(memberName);
        }
    }
    else if (typeof newValue !== 'function') {
        if (isBooleanAttr) {
            newValue = '';
        }
        else {
            newValue = newValue.toString();
        }
        if (isXlinkNs) {
            elm.setAttributeNS(XLINK_NS$1, toLowerCase(memberName), newValue);
        }
        else {
            elm.setAttribute(memberName, newValue);
        }
    }
}
const XLINK_NS$1 = 'http://www.w3.org/1999/xlink';

function setAccessor(plt, elm, memberName, oldValue, newValue, isSvg, isHostElement) {
    if (memberName === 'class' && !isSvg) {
        // Class
        if (oldValue !== newValue) {
            const oldList = parseClassList(oldValue);
            const newList = parseClassList(newValue);
            // remove classes in oldList, not included in newList
            const toRemove = oldList.filter(item => !newList.includes(item));
            const classList = parseClassList(elm.className)
                .filter(item => !toRemove.includes(item));
            // add classes from newValue that are not in oldList or classList
            const toAdd = newList.filter(item => !oldList.includes(item) && !classList.includes(item));
            classList.push(...toAdd);
            elm.className = classList.join(' ');
        }
    }
    else if (memberName === 'style') {
        // update style attribute, css properties and values
        for (const prop in oldValue) {
            if (!newValue || newValue[prop] == null) {
                if (/-/.test(prop)) {
                    elm.style.removeProperty(prop);
                }
                else {
                    elm.style[prop] = '';
                }
            }
        }
        for (const prop in newValue) {
            if (!oldValue || newValue[prop] !== oldValue[prop]) {
                if (/-/.test(prop)) {
                    elm.style.setProperty(prop, newValue[prop]);
                }
                else {
                    elm.style[prop] = newValue[prop];
                }
            }
        }
    }
    else if ((memberName[0] === 'o' && memberName[1] === 'n' && /[A-Z]/.test(memberName[2])) && (!(memberName in elm))) {
        // Event Handlers
        // so if the member name starts with "on" and the 3rd characters is
        // a capital letter, and it's not already a member on the element,
        // then we're assuming it's an event listener
        if (toLowerCase(memberName) in elm) {
            // standard event
            // the JSX attribute could have been "onMouseOver" and the
            // member name "onmouseover" is on the element's prototype
            // so let's add the listener "mouseover", which is all lowercased
            memberName = toLowerCase(memberName.substring(2));
        }
        else {
            // custom event
            // the JSX attribute could have been "onMyCustomEvent"
            // so let's trim off the "on" prefix and lowercase the first character
            // and add the listener "myCustomEvent"
            // except for the first character, we keep the event name case
            memberName = toLowerCase(memberName[2]) + memberName.substring(3);
        }
        if (newValue) {
            if (newValue !== oldValue) {
                // add listener
                plt.domApi.$addEventListener(elm, memberName, newValue);
            }
        }
        else {
            // remove listener
            plt.domApi.$removeEventListener(elm, memberName);
        }
    }
    else if (memberName !== 'list' && memberName !== 'type' && !isSvg &&
        (memberName in elm || (['object', 'function'].indexOf(typeof newValue) !== -1) && newValue !== null)
        || (elementHasProperty(plt, elm, memberName))) {
        // Properties
        // - list and type are attributes that get applied as values on the element
        // - all svgs get values as attributes not props
        // - check if elm contains name or if the value is array, object, or function
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta && cmpMeta.membersMeta && cmpMeta.membersMeta[memberName]) {
            // we know for a fact that this element is a known component
            // and this component has this member name as a property,
            // let's set the known @Prop on this element
            // set it directly as property on the element
            setProperty(elm, memberName, newValue);
            if (isHostElement && cmpMeta.membersMeta[memberName].reflectToAttrib) {
                // we also want to set this data to the attribute
                updateAttribute(elm, cmpMeta.membersMeta[memberName].attribName, newValue, cmpMeta.membersMeta[memberName].propType === 3 /* Boolean */);
            }
        }
        else if (memberName !== 'ref') {
            // this member name is a property on this element, but it's not a component
            // this is a native property like "value" or something
            // also we can ignore the "ref" member name at this point
            setProperty(elm, memberName, newValue == null ? '' : newValue);
            if (newValue == null || newValue === false) {
                plt.domApi.$removeAttribute(elm, memberName);
            }
        }
    }
    else if (newValue != null && memberName !== 'key') {
        // Element Attributes
        updateAttribute(elm, memberName, newValue);
    }
    else if (isSvg || plt.domApi.$hasAttribute(elm, memberName) && (newValue == null || newValue === false)) {
        // remove svg attribute
        plt.domApi.$removeAttribute(elm, memberName);
    }
}
function parseClassList(value) {
    return (value == null || value === '') ? [] : value.trim().split(/\s+/);
}
/**
 * Attempt to set a DOM property to the given value.
 * IE & FF throw for certain property-value combinations.
 */
function setProperty(elm, name, value) {
    try {
        elm[name] = value;
    }
    catch (e) { }
}

function updateElement(plt, oldVnode, newVnode, isSvgMode, memberName) {
    // if the element passed in is a shadow root, which is a document fragment
    // then we want to be adding attrs/props to the shadow root's "host" element
    // if it's not a shadow root, then we add attrs/props to the same element
    const elm = (newVnode.elm.nodeType === 11 /* DocumentFragment */ && newVnode.elm.host) ? newVnode.elm.host : newVnode.elm;
    const oldVnodeAttrs = (oldVnode && oldVnode.vattrs) || EMPTY_OBJ;
    const newVnodeAttrs = newVnode.vattrs || EMPTY_OBJ;
    // remove attributes no longer present on the vnode by setting them to undefined
    for (memberName in oldVnodeAttrs) {
        if (!(newVnodeAttrs && newVnodeAttrs[memberName] != null) && oldVnodeAttrs[memberName] != null) {
            setAccessor(plt, elm, memberName, oldVnodeAttrs[memberName], undefined, isSvgMode, newVnode.ishost);
        }
    }
    // add new & update changed attributes
    for (memberName in newVnodeAttrs) {
        if (!(memberName in oldVnodeAttrs) || newVnodeAttrs[memberName] !== (memberName === 'value' || memberName === 'checked' ? elm[memberName] : oldVnodeAttrs[memberName])) {
            setAccessor(plt, elm, memberName, oldVnodeAttrs[memberName], newVnodeAttrs[memberName], isSvgMode, newVnode.ishost);
        }
    }
}

let isSvgMode = false;
function createRendererPatch(plt, domApi) {
    // createRenderer() is only created once per app
    // the patch() function which createRenderer() returned is the function
    // which gets called numerous times by each component
    function createElm(oldParentVNode, newParentVNode, childIndex, parentElm, i, elm, childNode, newVNode, oldVNode) {
        newVNode = newParentVNode.vchildren[childIndex];
        if (!useNativeShadowDom) {
            // remember for later we need to check to relocate nodes
            checkSlotRelocate = true;
            if (newVNode.vtag === 'slot') {
                if (scopeId) {
                    // scoped css needs to add its scoped id to the parent element
                    domApi.$addClass(parentElm, scopeId + '-s');
                }
                if (!newVNode.vchildren) {
                    // slot element does not have fallback content
                    // create an html comment we'll use to always reference
                    // where actual slot content should sit next to
                    newVNode.isSlotReference = true;
                }
                else {
                    // slot element has fallback content
                    // still create an element that "mocks" the slot element
                    newVNode.isSlotFallback = true;
                }
            }
        }
        if (isDef(newVNode.vtext)) {
            // create text node
            newVNode.elm = domApi.$createTextNode(newVNode.vtext);
        }
        else if (newVNode.isSlotReference) {
            // create a slot reference html text node
            newVNode.elm = domApi.$createTextNode('');
        }
        else {
            // create element
            elm = newVNode.elm = ((isSvgMode || newVNode.vtag === 'svg') ?
                domApi.$createElementNS('http://www.w3.org/2000/svg', newVNode.vtag) :
                domApi.$createElement((newVNode.isSlotFallback) ? 'slot-fb' : newVNode.vtag));
            {
                isSvgMode = newVNode.vtag === 'svg' ? true : (newVNode.vtag === 'foreignObject' ? false : isSvgMode);
            }
            // add css classes, attrs, props, listeners, etc.
            updateElement(plt, null, newVNode, isSvgMode);
            if (isDef(scopeId) && elm['s-si'] !== scopeId) {
                // if there is a scopeId and this is the initial render
                // then let's add the scopeId as an attribute
                domApi.$addClass(elm, (elm['s-si'] = scopeId));
            }
            if (isDef(ssrId)) {
                // SSR ONLY: this is an SSR render and this
                // logic does not run on the client
                // give this element the SSR child id that can be read by the client
                domApi.$setAttribute(elm, SSR_CHILD_ID, ssrId + '.' + childIndex + (hasChildNodes(newVNode.vchildren) ? '' : '.'));
            }
            if (newVNode.vchildren) {
                for (i = 0; i < newVNode.vchildren.length; ++i) {
                    // create the node
                    childNode = createElm(oldParentVNode, newVNode, i, elm);
                    // return node could have been null
                    if (childNode) {
                        if (isDef(ssrId) && childNode.nodeType === 3 /* TextNode */ && !childNode['s-cr']) {
                            // SSR ONLY: add the text node's start comment
                            domApi.$appendChild(elm, domApi.$createComment('s.' + ssrId + '.' + i));
                        }
                        // append our new node
                        domApi.$appendChild(elm, childNode);
                        if (isDef(ssrId) && childNode.nodeType === 3 /* TextNode */ && !childNode['s-cr']) {
                            // SSR ONLY: add the text node's end comment
                            domApi.$appendChild(elm, domApi.$createComment('/'));
                            domApi.$appendChild(elm, domApi.$createTextNode(' '));
                        }
                    }
                }
            }
            if (newVNode.vtag === 'svg') {
                // Only reset the SVG context when we're exiting SVG element
                isSvgMode = false;
            }
        }
        {
            newVNode.elm['s-hn'] = hostTagName;
            if (newVNode.isSlotFallback || newVNode.isSlotReference) {
                // remember the content reference comment
                newVNode.elm['s-sr'] = true;
                // remember the content reference comment
                newVNode.elm['s-cr'] = contentRef;
                // remember the slot name, or empty string for default slot
                newVNode.elm['s-sn'] = newVNode.vname || '';
                // check if we've got an old vnode for this slot
                oldVNode = oldParentVNode && oldParentVNode.vchildren && oldParentVNode.vchildren[childIndex];
                if (oldVNode && oldVNode.vtag === newVNode.vtag && oldParentVNode.elm) {
                    // we've got an old slot vnode and the wrapper is being replaced
                    // so let's move the old slot content back to it's original location
                    putBackInOriginalLocation(oldParentVNode.elm);
                }
            }
        }
        return newVNode.elm;
    }
    function putBackInOriginalLocation(parentElm, recursive, i, childNode) {
        plt.tmpDisconnected = true;
        const oldSlotChildNodes = domApi.$childNodes(parentElm);
        for (i = oldSlotChildNodes.length - 1; i >= 0; i--) {
            childNode = oldSlotChildNodes[i];
            if (childNode['s-hn'] !== hostTagName && childNode['s-ol']) {
                // this child node in the old element is from another component
                // remove this node from the old slot's parent
                domApi.$remove(childNode);
                // and relocate it back to it's original location
                domApi.$insertBefore(parentReferenceNode(childNode), childNode, referenceNode(childNode));
                // remove the old original location comment entirely
                // later on the patch function will know what to do
                // and move this to the correct spot in need be
                domApi.$remove(childNode['s-ol']);
                childNode['s-ol'] = null;
                checkSlotRelocate = true;
            }
            if (recursive) {
                putBackInOriginalLocation(childNode, recursive);
            }
        }
        plt.tmpDisconnected = false;
    }
    function addVnodes(parentElm, before, parentVNode, vnodes, startIdx, endIdx, containerElm, childNode) {
        // $defaultHolder deprecated 2018-04-02
        const contentRef = parentElm['s-cr'] || parentElm['$defaultHolder'];
        containerElm = ((contentRef && domApi.$parentNode(contentRef)) || parentElm);
        if (containerElm.shadowRoot && domApi.$tagName(containerElm) === hostTagName) {
            containerElm = containerElm.shadowRoot;
        }
        for (; startIdx <= endIdx; ++startIdx) {
            if (vnodes[startIdx]) {
                childNode = isDef(vnodes[startIdx].vtext) ?
                    domApi.$createTextNode(vnodes[startIdx].vtext) :
                    createElm(null, parentVNode, startIdx, parentElm);
                if (childNode) {
                    vnodes[startIdx].elm = childNode;
                    domApi.$insertBefore(containerElm, childNode, referenceNode(before));
                }
            }
        }
    }
    function removeVnodes(vnodes, startIdx, endIdx, node) {
        for (; startIdx <= endIdx; ++startIdx) {
            if (isDef(vnodes[startIdx])) {
                node = vnodes[startIdx].elm;
                {
                    // we're removing this element
                    // so it's possible we need to show slot fallback content now
                    checkSlotFallbackVisibility = true;
                    if (node['s-ol']) {
                        // remove the original location comment
                        domApi.$remove(node['s-ol']);
                    }
                    else {
                        // it's possible that child nodes of the node
                        // that's being removed are slot nodes
                        putBackInOriginalLocation(node, true);
                    }
                }
                // remove the vnode's element from the dom
                domApi.$remove(node);
            }
        }
    }
    function updateChildren(parentElm, oldCh, newVNode, newCh, idxInOld, i, node, elmToMove) {
        let oldStartIdx = 0, newStartIdx = 0;
        let oldEndIdx = oldCh.length - 1;
        let oldStartVnode = oldCh[0];
        let oldEndVnode = oldCh[oldEndIdx];
        let newEndIdx = newCh.length - 1;
        let newStartVnode = newCh[0];
        let newEndVnode = newCh[newEndIdx];
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (oldStartVnode == null) {
                // Vnode might have been moved left
                oldStartVnode = oldCh[++oldStartIdx];
            }
            else if (oldEndVnode == null) {
                oldEndVnode = oldCh[--oldEndIdx];
            }
            else if (newStartVnode == null) {
                newStartVnode = newCh[++newStartIdx];
            }
            else if (newEndVnode == null) {
                newEndVnode = newCh[--newEndIdx];
            }
            else if (isSameVnode(oldStartVnode, newStartVnode)) {
                patchVNode(oldStartVnode, newStartVnode);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else if (isSameVnode(oldEndVnode, newEndVnode)) {
                patchVNode(oldEndVnode, newEndVnode);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (isSameVnode(oldStartVnode, newEndVnode)) {
                // Vnode moved right
                if (oldStartVnode.vtag === 'slot' || newEndVnode.vtag === 'slot') {
                    putBackInOriginalLocation(domApi.$parentNode(oldStartVnode.elm));
                }
                patchVNode(oldStartVnode, newEndVnode);
                domApi.$insertBefore(parentElm, oldStartVnode.elm, domApi.$nextSibling(oldEndVnode.elm));
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (isSameVnode(oldEndVnode, newStartVnode)) {
                // Vnode moved left
                if (oldStartVnode.vtag === 'slot' || newEndVnode.vtag === 'slot') {
                    putBackInOriginalLocation(domApi.$parentNode(oldEndVnode.elm));
                }
                patchVNode(oldEndVnode, newStartVnode);
                domApi.$insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else {
                // createKeyToOldIdx
                idxInOld = null;
                for (i = oldStartIdx; i <= oldEndIdx; ++i) {
                    if (oldCh[i] && isDef(oldCh[i].vkey) && oldCh[i].vkey === newStartVnode.vkey) {
                        idxInOld = i;
                        break;
                    }
                }
                if (isDef(idxInOld)) {
                    elmToMove = oldCh[idxInOld];
                    if (elmToMove.vtag !== newStartVnode.vtag) {
                        node = createElm(oldCh && oldCh[newStartIdx], newVNode, idxInOld, parentElm);
                    }
                    else {
                        patchVNode(elmToMove, newStartVnode);
                        oldCh[idxInOld] = undefined;
                        node = elmToMove.elm;
                    }
                    newStartVnode = newCh[++newStartIdx];
                }
                else {
                    // new element
                    node = createElm(oldCh && oldCh[newStartIdx], newVNode, newStartIdx, parentElm);
                    newStartVnode = newCh[++newStartIdx];
                }
                if (node) {
                    domApi.$insertBefore(parentReferenceNode(oldStartVnode.elm), node, referenceNode(oldStartVnode.elm));
                }
            }
        }
        if (oldStartIdx > oldEndIdx) {
            addVnodes(parentElm, (newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm), newVNode, newCh, newStartIdx, newEndIdx);
        }
        else if (newStartIdx > newEndIdx) {
            removeVnodes(oldCh, oldStartIdx, oldEndIdx);
        }
    }
    function isSameVnode(vnode1, vnode2) {
        // compare if two vnode to see if they're "technically" the same
        // need to have the same element tag, and same key to be the same
        if (vnode1.vtag === vnode2.vtag && vnode1.vkey === vnode2.vkey) {
            {
                if (vnode1.vtag === 'slot') {
                    return vnode1.vname === vnode2.vname;
                }
            }
            return true;
        }
        return false;
    }
    function referenceNode(node) {
        {
            if (node && node['s-ol']) {
                // this node was relocated to a new location in the dom
                // because of some other component's slot
                // but we still have an html comment in place of where
                // it's original location was according to it's original vdom
                return node['s-ol'];
            }
        }
        return node;
    }
    function parentReferenceNode(node) {
        return domApi.$parentNode(node['s-ol'] ? node['s-ol'] : node);
    }
    function patchVNode(oldVNode, newVNode, defaultHolder) {
        const elm = newVNode.elm = oldVNode.elm;
        const oldChildren = oldVNode.vchildren;
        const newChildren = newVNode.vchildren;
        {
            // test if we're rendering an svg element, or still rendering nodes inside of one
            // only add this to the when the compiler sees we're using an svg somewhere
            isSvgMode = newVNode.elm &&
                isDef(domApi.$parentElement(newVNode.elm)) &&
                newVNode.elm.ownerSVGElement !== undefined;
            isSvgMode = newVNode.vtag === 'svg' ? true : (newVNode.vtag === 'foreignObject' ? false : isSvgMode);
        }
        if (!isDef(newVNode.vtext)) {
            // element node
            if (newVNode.vtag !== 'slot') {
                // either this is the first render of an element OR it's an update
                // AND we already know it's possible it could have changed
                // this updates the element's css classes, attrs, props, listeners, etc.
                updateElement(plt, oldVNode, newVNode, isSvgMode);
            }
            if (isDef(oldChildren) && isDef(newChildren)) {
                // looks like there's child vnodes for both the old and new vnodes
                updateChildren(elm, oldChildren, newVNode, newChildren);
            }
            else if (isDef(newChildren)) {
                // no old child vnodes, but there are new child vnodes to add
                if (isDef(oldVNode.vtext)) {
                    // the old vnode was text, so be sure to clear it out
                    domApi.$setTextContent(elm, '');
                }
                // add the new vnode children
                addVnodes(elm, null, newVNode, newChildren, 0, newChildren.length - 1);
            }
            else if (isDef(oldChildren)) {
                // no new child vnodes, but there are old child vnodes to remove
                removeVnodes(oldChildren, 0, oldChildren.length - 1);
            }
        }
        else if (defaultHolder = (elm['s-cr'] || elm['$defaultHolder'] /* $defaultHolder deprecated 2018-04-02 */)) {
            // this element has slotted content
            domApi.$setTextContent(domApi.$parentNode(defaultHolder), newVNode.vtext);
        }
        else if (oldVNode.vtext !== newVNode.vtext) {
            // update the text content for the text only vnode
            // and also only if the text is different than before
            domApi.$setTextContent(elm, newVNode.vtext);
        }
        {
            // reset svgMode when svg node is fully patched
            if (isSvgMode && 'svg' === newVNode.vtag) {
                isSvgMode = false;
            }
        }
    }
    function updateFallbackSlotVisibility(elm, childNode, childNodes, i, ilen, j, slotNameAttr, nodeType) {
        childNodes = domApi.$childNodes(elm);
        for (i = 0, ilen = childNodes.length; i < ilen; i++) {
            childNode = childNodes[i];
            if (domApi.$nodeType(childNode) === 1 /* ElementNode */) {
                if (childNode['s-sr']) {
                    // this is a slot fallback node
                    // get the slot name for this slot reference node
                    slotNameAttr = childNode['s-sn'];
                    // by default always show a fallback slot node
                    // then hide it if there are other slots in the light dom
                    childNode.hidden = false;
                    for (j = 0; j < ilen; j++) {
                        if (childNodes[j]['s-hn'] !== childNode['s-hn']) {
                            // this sibling node is from a different component
                            nodeType = domApi.$nodeType(childNodes[j]);
                            if (slotNameAttr !== '') {
                                // this is a named fallback slot node
                                if (nodeType === 1 /* ElementNode */ && slotNameAttr === domApi.$getAttribute(childNodes[j], 'slot')) {
                                    childNode.hidden = true;
                                    break;
                                }
                            }
                            else {
                                // this is a default fallback slot node
                                // any element or text node (with content)
                                // should hide the default fallback slot node
                                if (nodeType === 1 /* ElementNode */ || (nodeType === 3 /* TextNode */ && domApi.$getTextContent(childNodes[j]).trim() !== '')) {
                                    childNode.hidden = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                // keep drilling down
                updateFallbackSlotVisibility(childNode);
            }
        }
    }
    const relocateNodes = [];
    function relocateSlotContent(elm, childNodes, childNode, node, i, ilen, j, hostContentNodes, slotNameAttr, nodeType) {
        childNodes = domApi.$childNodes(elm);
        for (i = 0, ilen = childNodes.length; i < ilen; i++) {
            childNode = childNodes[i];
            if (childNode['s-sr'] && (node = childNode['s-cr'])) {
                // first got the content reference comment node
                // then we got it's parent, which is where all the host content is in now
                hostContentNodes = domApi.$childNodes(domApi.$parentNode(node));
                slotNameAttr = childNode['s-sn'];
                for (j = hostContentNodes.length - 1; j >= 0; j--) {
                    node = hostContentNodes[j];
                    if (!node['s-cn'] && !node['s-nr'] && node['s-hn'] !== childNode['s-hn']) {
                        // let's do some relocating to its new home
                        // but never relocate a content reference node
                        // that is suppose to always represent the original content location
                        nodeType = domApi.$nodeType(node);
                        if (((nodeType === 3 /* TextNode */ || nodeType === 8 /* CommentNode */) && slotNameAttr === '') ||
                            (nodeType === 1 /* ElementNode */ && domApi.$getAttribute(node, 'slot') === null && slotNameAttr === '') ||
                            (nodeType === 1 /* ElementNode */ && domApi.$getAttribute(node, 'slot') === slotNameAttr)) {
                            // it's possible we've already decided to relocate this node
                            if (!relocateNodes.some(r => r.nodeToRelocate === node)) {
                                // made some changes to slots
                                // let's make sure we also double check
                                // fallbacks are correctly hidden or shown
                                checkSlotFallbackVisibility = true;
                                node['s-sn'] = slotNameAttr;
                                // add to our list of nodes to relocate
                                relocateNodes.push({
                                    slotRefNode: childNode,
                                    nodeToRelocate: node
                                });
                            }
                        }
                    }
                }
            }
            if (domApi.$nodeType(childNode) === 1 /* ElementNode */) {
                relocateSlotContent(childNode);
            }
        }
    }
    // internal variables to be reused per patch() call
    let useNativeShadowDom, ssrId, scopeId, checkSlotFallbackVisibility, checkSlotRelocate, hostTagName, contentRef;
    return function patch(hostElm, oldVNode, newVNode, useNativeShadowDomVal, encapsulation, ssrPatchId, i, relocateNode, orgLocationNode, refNode, parentNodeRef, insertBeforeNode) {
        // patchVNode() is synchronous
        // so it is safe to set these variables and internally
        // the same patch() call will reference the same data
        hostTagName = domApi.$tagName(hostElm);
        contentRef = hostElm['s-cr'];
        useNativeShadowDom = useNativeShadowDomVal;
        {
            if (encapsulation !== 'shadow') {
                ssrId = ssrPatchId;
            }
            else {
                ssrId = null;
            }
        }
        {
            // get the scopeId
            scopeId = hostElm['s-sc'];
            // always reset
            checkSlotRelocate = checkSlotFallbackVisibility = false;
        }
        // synchronous patch
        patchVNode(oldVNode, newVNode);
        if (isDef(ssrId)) {
            // SSR ONLY: we've been given an SSR id, so the host element
            // should be given the ssr id attribute
            domApi.$setAttribute(oldVNode.elm, SSR_VNODE_ID, ssrId);
        }
        {
            if (checkSlotRelocate) {
                relocateSlotContent(newVNode.elm);
                for (i = 0; i < relocateNodes.length; i++) {
                    relocateNode = relocateNodes[i];
                    if (!relocateNode.nodeToRelocate['s-ol']) {
                        // add a reference node marking this node's original location
                        // keep a reference to this node for later lookups
                        orgLocationNode = domApi.$createTextNode('');
                        orgLocationNode['s-nr'] = relocateNode.nodeToRelocate;
                        domApi.$insertBefore(domApi.$parentNode(relocateNode.nodeToRelocate), (relocateNode.nodeToRelocate['s-ol'] = orgLocationNode), relocateNode.nodeToRelocate);
                    }
                }
                // while we're moving nodes around existing nodes, temporarily disable
                // the disconnectCallback from working
                plt.tmpDisconnected = true;
                for (i = 0; i < relocateNodes.length; i++) {
                    relocateNode = relocateNodes[i];
                    // by default we're just going to insert it directly
                    // after the slot reference node
                    parentNodeRef = domApi.$parentNode(relocateNode.slotRefNode);
                    insertBeforeNode = domApi.$nextSibling(relocateNode.slotRefNode);
                    orgLocationNode = relocateNode.nodeToRelocate['s-ol'];
                    while (orgLocationNode = domApi.$previousSibling(orgLocationNode)) {
                        if ((refNode = orgLocationNode['s-nr']) && refNode) {
                            if (refNode['s-sn'] === relocateNode.nodeToRelocate['s-sn']) {
                                if (parentNodeRef === domApi.$parentNode(refNode)) {
                                    if ((refNode = domApi.$nextSibling(refNode)) && refNode && !refNode['s-nr']) {
                                        insertBeforeNode = refNode;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if ((!insertBeforeNode && parentNodeRef !== domApi.$parentNode(relocateNode.nodeToRelocate)) ||
                        (domApi.$nextSibling(relocateNode.nodeToRelocate) !== insertBeforeNode)) {
                        // we've checked that it's worth while to relocate
                        // since that the node to relocate
                        // has a different next sibling or parent relocated
                        if (relocateNode.nodeToRelocate !== insertBeforeNode) {
                            // remove the node from the dom
                            domApi.$remove(relocateNode.nodeToRelocate);
                            // add it back to the dom but in its new home
                            domApi.$insertBefore(parentNodeRef, relocateNode.nodeToRelocate, insertBeforeNode);
                        }
                    }
                }
                // done moving nodes around
                // allow the disconnect callback to work again
                plt.tmpDisconnected = false;
            }
            if (checkSlotFallbackVisibility) {
                updateFallbackSlotVisibility(newVNode.elm);
            }
            // always reset
            relocateNodes.length = 0;
        }
        // return our new vnode
        return newVNode;
    };
}
function callNodeRefs(vNode, isDestroy) {
    if (vNode) {
        vNode.vattrs && vNode.vattrs.ref && vNode.vattrs.ref(isDestroy ? null : vNode.elm);
        vNode.vchildren && vNode.vchildren.forEach(vChild => {
            callNodeRefs(vChild, isDestroy);
        });
    }
}
function hasChildNodes(children) {
    // SSR ONLY: check if there are any more nested child elements
    // if there aren't, this info is useful so the client runtime
    // doesn't have to climb down and check so many elements
    if (children) {
        for (var i = 0; i < children.length; i++) {
            if (children[i].vtag !== 'slot' || hasChildNodes(children[i].vchildren)) {
                return true;
            }
        }
    }
    return false;
}

function disconnectedCallback(plt, elm) {
    // only disconnect if we're not temporarily disconnected
    // tmpDisconnected will happen when slot nodes are being relocated
    if (!plt.tmpDisconnected && isDisconnected(plt.domApi, elm)) {
        // ok, let's officially destroy this thing
        // set this to true so that any of our pending async stuff
        // doesn't continue since we already decided to destroy this node
        // elm._hasDestroyed = true;
        plt.isDisconnectedMap.set(elm, true);
        // double check that we've informed the ancestor host elements
        // that they're good to go and loaded (cuz this one is on its way out)
        propagateComponentLoaded(plt, elm);
        // since we're disconnecting, call all of the JSX ref's with null
        callNodeRefs(plt.vnodeMap.get(elm), true);
        // detatch any event listeners that may have been added
        // because we're not passing an exact event name it'll
        // remove all of this element's event, which is good
        plt.domApi.$removeEventListener(elm);
        plt.hasListenersMap.delete(elm);
        {
            // call instance componentDidUnload
            // if we've created an instance for this
            const instance = plt.instanceMap.get(elm);
            if (instance) {
                // call the user's componentDidUnload if there is one
                instance.componentDidUnload && instance.componentDidUnload();
            }
        }
        // clear CSS var-shim tracking
        if (plt.customStyle) {
            plt.customStyle.removeHost(elm);
        }
        // clear any references to other elements
        // more than likely we've already deleted these references
        // but let's double check there pal
        [
            plt.ancestorHostElementMap,
            plt.onReadyCallbacksMap,
            plt.hostSnapshotMap
        ].forEach(wm => wm.delete(elm));
    }
}
function isDisconnected(domApi, elm) {
    while (elm) {
        if (!domApi.$parentNode(elm)) {
            return domApi.$nodeType(elm) !== 9 /* DocumentNode */;
        }
        elm = domApi.$parentNode(elm);
    }
}

function hmrStart(plt, cmpMeta, elm, hmrVersionId) {
    // ¯\_(ツ)_/¯
    // keep the existing state
    // forget the constructor
    cmpMeta.componentConstructor = null;
    // no sir, this component has never loaded, not once, ever
    plt.hasLoadedMap.delete(elm);
    // forget the instance
    const instance = plt.instanceMap.get(elm);
    if (instance) {
        plt.hostElementMap.delete(instance);
        plt.instanceMap.delete(elm);
    }
    // detatch any event listeners that may have been added
    // because we're not passing an exact event name it'll
    // remove all of this element's event, which is good
    plt.domApi.$removeEventListener(elm);
    plt.hasListenersMap.delete(elm);
    cmpMeta.listenersMeta = null;
    // create a callback for when this component finishes hmr
    elm['s-hmr-load'] = () => {
        // finished hmr for this element
        delete elm['s-hmr-load'];
        hmrFinish(plt, cmpMeta, elm);
    };
    // create the new host snapshot from the element
    plt.hostSnapshotMap.set(elm, initHostSnapshot(plt.domApi, cmpMeta, elm));
    // request the bundle again
    plt.requestBundle(cmpMeta, elm, hmrVersionId);
}
function hmrFinish(plt, cmpMeta, elm) {
    if (!plt.hasListenersMap.has(elm)) {
        plt.hasListenersMap.set(elm, true);
        // initElementListeners works off of cmp metadata
        // but we just got new data from the constructor
        // so let's update the cmp metadata w/ constructor listener data
        if (cmpMeta.componentConstructor && cmpMeta.componentConstructor.listeners) {
            cmpMeta.listenersMeta = cmpMeta.componentConstructor.listeners.map(lstn => {
                const listenerMeta = {
                    eventMethodName: lstn.method,
                    eventName: lstn.name,
                    eventCapture: !!lstn.capture,
                    eventPassive: !!lstn.passive,
                    eventDisabled: !!lstn.disabled,
                };
                return listenerMeta;
            });
            initElementListeners(plt, elm);
        }
    }
}

function proxyHostElementPrototype(plt, membersMeta, hostPrototype) {
    // create getters/setters on the host element prototype to represent the public API
    // the setters allows us to know when data has changed so we can re-render
    {
        // in just a server-side build
        // let's set the properties to the values immediately
        let values = plt.valuesMap.get(hostPrototype);
        if (!values) {
            values = {};
            plt.valuesMap.set(hostPrototype, values);
        }
        membersMeta && Object.keys(membersMeta).forEach(memberName => {
            const memberType = membersMeta[memberName].memberType;
            if (memberType === 1 /* Prop */ || memberType === 2 /* PropMutable */) {
                values[memberName] = hostPrototype[memberName];
            }
        });
    }
    membersMeta && Object.keys(membersMeta).forEach(memberName => {
        // add getters/setters
        const member = membersMeta[memberName];
        const memberType = member.memberType;
        if (memberType === 1 /* Prop */ || memberType === 2 /* PropMutable */) {
            // @Prop() or @Prop({ mutable: true })
            definePropertyGetterSetter(hostPrototype, memberName, function getHostElementProp() {
                // host element getter (cannot be arrow fn)
                // yup, ugly, srynotsry
                return (plt.valuesMap.get(this) || {})[memberName];
            }, function setHostElementProp(newValue) {
                // host element setter (cannot be arrow fn)
                setValue(plt, this, memberName, parsePropertyValue(member.propType, newValue));
            });
        }
        else if (memberType === 6 /* Method */) {
            // @Method()
            // add a placeholder noop value on the host element's prototype
            // incase this method gets called before setup
            definePropertyValue(hostPrototype, memberName, noop);
        }
    });
}

function initHostElement(plt, cmpMeta, HostElementConstructor, hydratedCssClass) {
    // let's wire up our functions to the host element's prototype
    // we can also inject our platform into each one that needs that api
    // note: these cannot be arrow functions cuz "this" is important here hombre
    HostElementConstructor.connectedCallback = function () {
        // coolsville, our host element has just hit the DOM
        connectedCallback(plt, cmpMeta, this);
    };
    {
        HostElementConstructor.attributeChangedCallback = function (attribName, oldVal, newVal) {
            // the browser has just informed us that an attribute
            // on the host element has changed
            attributeChangedCallback(cmpMeta.membersMeta, this, attribName, oldVal, newVal);
        };
    }
    HostElementConstructor.disconnectedCallback = function () {
        // the element has left the builing
        disconnectedCallback(plt, this);
    };
    HostElementConstructor['s-init'] = function () {
        initComponentLoaded(plt, this, hydratedCssClass);
    };
    {
        HostElementConstructor['s-hmr'] = function (hmrVersionId) {
            hmrStart(plt, cmpMeta, this, hmrVersionId);
        };
    }
    HostElementConstructor.forceUpdate = function () {
        queueUpdate(plt, this);
    };
    // add getters/setters to the host element members
    // these would come from the @Prop and @Method decorators that
    // should create the public API to this component
    proxyHostElementPrototype(plt, cmpMeta.membersMeta, HostElementConstructor);
}

function connectChildElements(config, plt, App, hydrateResults, parentElm) {
    if (parentElm && parentElm.children) {
        for (let i = 0; i < parentElm.children.length; i++) {
            connectElement(config, plt, App, hydrateResults, parentElm.children[i]);
            connectChildElements(config, plt, App, hydrateResults, parentElm.children[i]);
        }
    }
}
function connectElement(config, plt, App, hydrateResults, elm) {
    if (!plt.hasConnectedMap.has(elm)) {
        const tagName = elm.tagName.toLowerCase();
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta) {
            connectHostElement(config, plt, App, hydrateResults, elm, cmpMeta);
        }
        else if (tagName === 'script') {
            connectScriptElement(hydrateResults, elm);
        }
        else if (tagName === 'link') {
            connectLinkElement(hydrateResults, elm);
        }
        else if (tagName === 'img') {
            connectImgElement(hydrateResults, elm);
        }
        plt.hasConnectedMap.set(elm, true);
    }
}
function connectHostElement(config, plt, App, hydrateResults, elm, cmpMeta) {
    const hostSnapshot = initHostSnapshot(plt.domApi, cmpMeta, elm);
    plt.hostSnapshotMap.set(elm, hostSnapshot);
    if (!cmpMeta.componentConstructor) {
        plt.requestBundle(cmpMeta, elm);
    }
    if (cmpMeta.encapsulationMeta !== 1 /* ShadowDom */) {
        initHostElement(plt, cmpMeta, elm, config.hydratedCssClass);
        connectedCallback(plt, cmpMeta, elm);
    }
    connectComponentOnReady(App, elm);
    const depth = getNodeDepth(elm);
    const cmp = hydrateResults.components.find(c => c.tag === cmpMeta.tagNameMeta);
    if (cmp) {
        cmp.count++;
        if (depth > cmp.depth) {
            cmp.depth = depth;
        }
    }
    else {
        hydrateResults.components.push({
            tag: cmpMeta.tagNameMeta,
            count: 1,
            depth: depth
        });
    }
}
function connectComponentOnReady(App, elm) {
    elm.componentOnReady = function componentOnReady() {
        return new Promise(resolve => {
            App.componentOnReady(elm, resolve);
        });
    };
}
function connectScriptElement(hydrateResults, elm) {
    const src = elm.src;
    if (src && hydrateResults.scriptUrls.indexOf(src) === -1) {
        hydrateResults.scriptUrls.push(src);
    }
}
function connectLinkElement(hydrateResults, elm) {
    const href = elm.href;
    const rel = (elm.rel || '').toLowerCase();
    if (rel === 'stylesheet' && href && hydrateResults.styleUrls.indexOf(href) === -1) {
        hydrateResults.styleUrls.push(href);
    }
}
function connectImgElement(hydrateResults, elm) {
    const src = elm.src;
    if (src && hydrateResults.imgUrls.indexOf(src) === -1) {
        hydrateResults.imgUrls.push(src);
    }
}
function getNodeDepth(elm) {
    let depth = 0;
    while (elm.parentNode) {
        depth++;
        elm = elm.parentNode;
    }
    return depth;
}

function createDomApi(App, win, doc) {
    // using the $ prefix so that closure is
    // cool with property renaming each of these
    if (!App.ael) {
        App.ael = (elm, eventName, cb, opts) => elm.addEventListener(eventName, cb, opts);
        App.rel = (elm, eventName, cb, opts) => elm.removeEventListener(eventName, cb, opts);
    }
    const unregisterListenerFns = new WeakMap();
    const domApi = {
        $doc: doc,
        $supportsEventOptions: false,
        $nodeType: (node) => node.nodeType,
        $createElement: (tagName) => doc.createElement(tagName),
        $createElementNS: (namespace, tagName) => doc.createElementNS(namespace, tagName),
        $createTextNode: (text) => doc.createTextNode(text),
        $createComment: (data) => doc.createComment(data),
        $insertBefore: (parentNode, childNode, referenceNode) => parentNode.insertBefore(childNode, referenceNode),
        // https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove
        // and it's polyfilled in es5 builds
        $remove: (node) => node.remove(),
        $appendChild: (parentNode, childNode) => parentNode.appendChild(childNode),
        $addClass: (elm, cssClass) => elm.classList.add(cssClass),
        $childNodes: (node) => node.childNodes,
        $parentNode: (node) => node.parentNode,
        $nextSibling: (node) => node.nextSibling,
        $previousSibling: (node) => node.previousSibling,
        $tagName: (elm) => toLowerCase(elm.nodeName),
        $getTextContent: (node) => node.textContent,
        $setTextContent: (node, text) => node.textContent = text,
        $getAttribute: (elm, key) => elm.getAttribute(key),
        $setAttribute: (elm, key, val) => elm.setAttribute(key, val),
        $setAttributeNS: (elm, namespaceURI, qualifiedName, val) => elm.setAttributeNS(namespaceURI, qualifiedName, val),
        $removeAttribute: (elm, key) => elm.removeAttribute(key),
        $hasAttribute: (elm, key) => elm.hasAttribute(key),
        $getMode: (elm) => elm.getAttribute('mode') || (App.Context || {}).mode,
        $elementRef: (elm, referenceName) => {
            if (referenceName === 'child') {
                return elm.firstElementChild;
            }
            if (referenceName === 'parent') {
                return domApi.$parentElement(elm);
            }
            if (referenceName === 'body') {
                return doc.body;
            }
            if (referenceName === 'document') {
                return doc;
            }
            if (referenceName === 'window') {
                return win;
            }
            return elm;
        },
        $addEventListener: (assignerElm, eventName, listenerCallback, useCapture, usePassive, attachTo, eventListenerOpts, splt) => {
            // remember the original name before we possibly change it
            const assignersEventName = eventName;
            let attachToElm = assignerElm;
            // get the existing unregister listeners for
            // this element from the unregister listeners weakmap
            let assignersUnregListeners = unregisterListenerFns.get(assignerElm);
            if (assignersUnregListeners && assignersUnregListeners[assignersEventName]) {
                // removed any existing listeners for this event for the assigner element
                // this element already has this listener, so let's unregister it now
                assignersUnregListeners[assignersEventName]();
            }
            if (typeof attachTo === 'string') {
                // attachTo is a string, and is probably something like
                // "parent", "window", or "document"
                // and the eventName would be like "mouseover" or "mousemove"
                attachToElm = domApi.$elementRef(assignerElm, attachTo);
            }
            else if (typeof attachTo === 'object') {
                // we were passed in an actual element to attach to
                attachToElm = attachTo;
            }
            else {
                // depending on the event name, we could actually be attaching
                // this element to something like the document or window
                splt = eventName.split(':');
                if (splt.length > 1) {
                    // document:mousemove
                    // parent:touchend
                    // body:keyup.enter
                    attachToElm = domApi.$elementRef(assignerElm, splt[0]);
                    eventName = splt[1];
                }
            }
            if (!attachToElm) {
                // somehow we're referencing an element that doesn't exist
                // let's not continue
                return;
            }
            let eventListener = listenerCallback;
            // test to see if we're looking for an exact keycode
            splt = eventName.split('.');
            if (splt.length > 1) {
                // looks like this listener is also looking for a keycode
                // keyup.enter
                eventName = splt[0];
                eventListener = (ev) => {
                    // wrap the user's event listener with our own check to test
                    // if this keyboard event has the keycode they're looking for
                    if (ev.keyCode === KEY_CODE_MAP[splt[1]]) {
                        listenerCallback(ev);
                    }
                };
            }
            // create the actual event listener options to use
            // this browser may not support event options
            eventListenerOpts = domApi.$supportsEventOptions ? {
                capture: !!useCapture,
                passive: !!usePassive
            } : !!useCapture;
            // ok, good to go, let's add the actual listener to the dom element
            App.ael(attachToElm, eventName, eventListener, eventListenerOpts);
            if (!assignersUnregListeners) {
                // we don't already have a collection, let's create it
                unregisterListenerFns.set(assignerElm, assignersUnregListeners = {});
            }
            // add the unregister listener to this element's collection
            assignersUnregListeners[assignersEventName] = () => {
                // looks like it's time to say goodbye
                attachToElm && App.rel(attachToElm, eventName, eventListener, eventListenerOpts);
                assignersUnregListeners[assignersEventName] = null;
            };
        },
        $removeEventListener: (elm, eventName) => {
            // get the unregister listener functions for this element
            const assignersUnregListeners = unregisterListenerFns.get(elm);
            if (assignersUnregListeners) {
                // this element has unregister listeners
                if (eventName) {
                    // passed in one specific event name to remove
                    assignersUnregListeners[eventName] && assignersUnregListeners[eventName]();
                }
                else {
                    // remove all event listeners
                    Object.keys(assignersUnregListeners).forEach(assignersEventName => {
                        assignersUnregListeners[assignersEventName] && assignersUnregListeners[assignersEventName]();
                    });
                }
            }
        }
    };
    {
        domApi.$attachShadow = (elm, shadowRootInit) => elm.attachShadow(shadowRootInit);
        domApi.$supportsShadowDom = !!domApi.$doc.documentElement.attachShadow;
        {
            if (win.location.search.indexOf('shadow=false') > 0) {
                // by adding ?shadow=false it'll force the slot polyfill
                // only add this check when in dev mode
                domApi.$supportsShadowDom = false;
            }
        }
    }
    domApi.$dispatchEvent = (elm, eventName, data) => elm && elm.dispatchEvent(new win.CustomEvent(eventName, data));
    {
        // test if this browser supports event options or not
        try {
            win.addEventListener('e', null, Object.defineProperty({}, 'passive', {
                get: () => domApi.$supportsEventOptions = true
            }));
        }
        catch (e) { }
    }
    domApi.$parentElement = (elm, parentNode) => 
    // if the parent node is a document fragment (shadow root)
    // then use the "host" property on it
    // otherwise use the parent node
    ((parentNode = domApi.$parentNode(elm)) && domApi.$nodeType(parentNode) === 11 /* DocumentFragment */) ? parentNode.host : parentNode;
    return domApi;
}

function createQueueServer() {
    const highPriority = [];
    const domReads = [];
    const domWrites = [];
    let queued = false;
    function flush(cb) {
        while (highPriority.length > 0) {
            highPriority.shift()(0);
        }
        while (domReads.length > 0) {
            domReads.shift()(0);
        }
        while (domWrites.length > 0) {
            domWrites.shift()(0);
        }
        queued = (highPriority.length > 0) || (domReads.length > 0) || (domWrites.length > 0);
        if (queued) {
            process.nextTick(flush);
        }
        cb && cb();
    }
    function clear() {
        highPriority.length = 0;
        domReads.length = 0;
        domWrites.length = 0;
    }
    return {
        tick: (cb) => {
            // queue high priority work to happen in next tick
            // uses Promise.resolve() for next tick
            highPriority.push(cb);
            if (!queued) {
                queued = true;
                process.nextTick(flush);
            }
        },
        read: (cb) => {
            // queue dom reads
            domReads.push(cb);
            if (!queued) {
                queued = true;
                process.nextTick(flush);
            }
        },
        write: (cb) => {
            // queue dom writes
            domWrites.push(cb);
            if (!queued) {
                queued = true;
                process.nextTick(flush);
            }
        },
        flush: flush,
        clear: clear
    };
}

function fillCmpMetaFromConstructor(cmp, cmpMeta) {
    if (!cmpMeta.tagNameMeta) {
        cmpMeta.tagNameMeta = cmp.is;
    }
    if (!cmpMeta.bundleIds) {
        cmpMeta.bundleIds = cmp.is;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    if (!cmpMeta.membersMeta.color) {
        cmpMeta.membersMeta.color = {
            propType: 2 /* String */,
            attribName: 'color',
            memberType: 1 /* Prop */
        };
    }
    if (cmp.properties) {
        Object.keys(cmp.properties).forEach(memberName => {
            const property = cmp.properties[memberName];
            const memberMeta = cmpMeta.membersMeta[memberName] = {};
            if (property.state) {
                memberMeta.memberType = 5 /* State */;
            }
            else if (property.elementRef) {
                memberMeta.memberType = 7 /* Element */;
            }
            else if (property.method) {
                memberMeta.memberType = 6 /* Method */;
            }
            else if (property.connect) {
                memberMeta.memberType = 4 /* PropConnect */;
                memberMeta.ctrlId = property.connect;
            }
            else if (property.context) {
                memberMeta.memberType = 3 /* PropContext */;
                memberMeta.ctrlId = property.context;
            }
            else {
                if (property.type === String) {
                    memberMeta.propType = 2 /* String */;
                }
                else if (property.type === Boolean) {
                    memberMeta.propType = 3 /* Boolean */;
                }
                else if (property.type === Number) {
                    memberMeta.propType = 4 /* Number */;
                }
                else {
                    memberMeta.propType = 1 /* Any */;
                }
                if (property.attr) {
                    memberMeta.attribName = property.attr;
                }
                else {
                    memberMeta.attribName = memberName;
                }
                memberMeta.reflectToAttrib = !!property.reflectToAttr;
                if (property.mutable) {
                    memberMeta.memberType = 2 /* PropMutable */;
                }
                else {
                    memberMeta.memberType = 1 /* Prop */;
                }
            }
        });
    }
    if (cmp.listeners) {
        cmpMeta.listenersMeta = cmp.listeners.map(listener => {
            return {
                eventName: listener.name,
                eventMethodName: listener.method,
                eventCapture: listener.capture,
                eventDisabled: listener.disabled,
                eventPassive: listener.passive
            };
        });
    }
    return cmpMeta;
}

function initCoreComponentOnReady(plt, App, win, apps, queuedComponentOnReadys, i) {
    // add componentOnReady() to the App object
    // this also is used to know that the App's core is ready
    App.componentOnReady = (elm, resolve) => {
        if (!elm.nodeName.includes('-')) {
            resolve(null);
            return false;
        }
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta) {
            if (plt.hasLoadedMap.has(elm)) {
                // element has already loaded, pass the resolve the element component
                // so we know that the resolve knows it this element is an app component
                resolve(elm);
            }
            else {
                // element hasn't loaded yet
                // add this resolve specifically to this elements on ready queue
                const onReadyCallbacks = plt.onReadyCallbacksMap.get(elm) || [];
                onReadyCallbacks.push(resolve);
                plt.onReadyCallbacksMap.set(elm, onReadyCallbacks);
            }
        }
        // return a boolean if this app recognized this element or not
        return !!cmpMeta;
    };
    if (queuedComponentOnReadys) {
        // we've got some componentOnReadys in the queue before the app was ready
        for (i = queuedComponentOnReadys.length - 1; i >= 0; i--) {
            // go through each element and see if this app recongizes it
            if (App.componentOnReady(queuedComponentOnReadys[i][0], queuedComponentOnReadys[i][1])) {
                // turns out this element belongs to this app
                // remove the resolve from the queue so in the end
                // all that's left in the queue are elements not apart of any apps
                queuedComponentOnReadys.splice(i, 1);
            }
        }
        for (i = 0; i < apps.length; i++) {
            if (!win[apps[i]].componentOnReady) {
                // there is at least 1 apps that isn't ready yet
                // so let's stop here cuz there's still app cores loading
                return;
            }
        }
        // if we got to this point then that means all of the apps are ready
        // and they would have removed any of their elements from queuedComponentOnReadys
        // so let's do the cleanup of the  remaining queuedComponentOnReadys
        for (i = 0; i < queuedComponentOnReadys.length; i++) {
            // resolve any queued componentsOnReadys that are left over
            // since these elements were not apart of any apps
            // call the resolve fn, but pass null so it's know this wasn't a known app component
            queuedComponentOnReadys[i][1](null);
        }
        queuedComponentOnReadys.length = 0;
    }
}

function patchDomApi(config, plt, domApi) {
    const orgCreateElement = domApi.$createElement;
    domApi.$createElement = (tagName) => {
        const elm = orgCreateElement(tagName);
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta && !cmpMeta.componentConstructor) {
            initHostElement(plt, cmpMeta, elm, config.namespace);
            const hostSnapshot = initHostSnapshot(domApi, cmpMeta, elm);
            plt.hostSnapshotMap.set(elm, hostSnapshot);
            plt.requestBundle(cmpMeta, elm);
        }
        return elm;
    };
}

function proxyController(domApi, controllerComponents, ctrlTag) {
    return {
        'create': proxyProp(domApi, controllerComponents, ctrlTag, 'create'),
        'componentOnReady': proxyProp(domApi, controllerComponents, ctrlTag, 'componentOnReady')
    };
}
function proxyProp(domApi, controllerComponents, ctrlTag, proxyMethodName) {
    return function () {
        const args = arguments;
        return loadComponent(domApi, controllerComponents, ctrlTag)
            .then(ctrlElm => ctrlElm[proxyMethodName].apply(ctrlElm, args));
    };
}
function loadComponent(domApi, controllerComponents, ctrlTag) {
    let ctrlElm = controllerComponents[ctrlTag];
    const body = domApi.$doc.body;
    if (body) {
        if (!ctrlElm) {
            ctrlElm = body.querySelector(ctrlTag);
        }
        if (!ctrlElm) {
            ctrlElm = controllerComponents[ctrlTag] = domApi.$createElement(ctrlTag);
            domApi.$appendChild(body, ctrlElm);
        }
        return ctrlElm.componentOnReady();
    }
    return Promise.resolve();
}

function serverInitStyle(domApi, appliedStyleIds, cmpCtr) {
    if (!cmpCtr || !cmpCtr.style) {
        // no styles
        return;
    }
    const styleId = cmpCtr.is + (cmpCtr.styleMode || DEFAULT_STYLE_MODE);
    if (appliedStyleIds.has(styleId)) {
        // already initialized
        return;
    }
    appliedStyleIds.add(styleId);
    const styleElm = domApi.$createElement('style');
    styleElm.setAttribute('data-styles', '');
    styleElm.innerHTML = cmpCtr.style;
    domApi.$appendChild(domApi.$doc.head, styleElm);
}
function serverAttachStyles(plt, appliedStyleIds, cmpMeta, hostElm) {
    const shouldScopeCss = (cmpMeta.encapsulationMeta === 2 /* ScopedCss */ || (cmpMeta.encapsulationMeta === 1 /* ShadowDom */ && !plt.domApi.$supportsShadowDom));
    // create the style id w/ the host element's mode
    const styleModeId = cmpMeta.tagNameMeta + hostElm.mode;
    if (shouldScopeCss) {
        hostElm['s-sc'] = getScopeId(cmpMeta, hostElm.mode);
    }
    if (!appliedStyleIds.has(styleModeId)) {
        // doesn't look like there's a style template with the mode
        // create the style id using the default style mode and try again
        if (shouldScopeCss) {
            hostElm['s-sc'] = getScopeId(cmpMeta);
        }
    }
}

function createPlatformServer(config, outputTarget, win, doc, App, cmpRegistry, diagnostics, isPrerender, compilerCtx) {
    const loadedBundles = {};
    const appliedStyleIds = new Set();
    const controllerComponents = {};
    const domApi = createDomApi(App, win, doc);
    // init build context
    compilerCtx = compilerCtx || {};
    // the root <html> element is always the top level registered component
    cmpRegistry = Object.assign({ 'html': {} }, cmpRegistry);
    // initialize Core global object
    const Context = {};
    Context.enableListener = (instance, eventName, enabled, attachTo, passive) => enableEventListener(plt, instance, eventName, enabled, attachTo, passive);
    Context.emit = (elm, eventName, data) => domApi.$dispatchEvent(elm, Context.eventNameFn ? Context.eventNameFn(eventName) : eventName, data);
    Context.isClient = false;
    Context.isServer = true;
    Context.isPrerender = isPrerender;
    Context.window = win;
    Context.location = win.location;
    Context.document = doc;
    // add the Core global to the window context
    // Note: "Core" is not on the window context on the client-side
    win.Context = Context;
    // add the h() fn to the app's global namespace
    App.h = h;
    App.Context = Context;
    // add the app's global to the window context
    win[config.namespace] = App;
    const appBuildDir = getAppBuildDir(config, outputTarget);
    Context.resourcesUrl = Context.publicPath = appBuildDir;
    // create the sandboxed context with a new instance of a V8 Context
    // V8 Context provides an isolated global environment
    config.sys.vm.createContext(compilerCtx, outputTarget, win);
    // execute the global scripts (if there are any)
    runGlobalScripts();
    // internal id increment for unique ids
    let ids = 0;
    // create the platform api which is used throughout common core code
    const plt = {
        attachStyles: noop,
        defineComponent,
        domApi,
        emitEvent: Context.emit,
        getComponentMeta,
        getContextItem,
        isDefinedComponent,
        onError,
        nextId: () => config.namespace + (ids++),
        propConnect,
        queue: (Context.queue = createQueueServer()),
        requestBundle: requestBundle,
        tmpDisconnected: false,
        ancestorHostElementMap: new WeakMap(),
        componentAppliedStyles: new WeakMap(),
        hasConnectedMap: new WeakMap(),
        hasListenersMap: new WeakMap(),
        hasLoadedMap: new WeakMap(),
        hostElementMap: new WeakMap(),
        hostSnapshotMap: new WeakMap(),
        instanceMap: new WeakMap(),
        isDisconnectedMap: new WeakMap(),
        isQueuedForUpdate: new WeakMap(),
        onReadyCallbacksMap: new WeakMap(),
        queuedEvents: new WeakMap(),
        vnodeMap: new WeakMap(),
        valuesMap: new WeakMap()
    };
    // patch dom api like createElement()
    patchDomApi(config, plt, domApi);
    // create the renderer which will be used to patch the vdom
    plt.render = createRendererPatch(plt, domApi);
    // patch the componentOnReady fn
    initCoreComponentOnReady(plt, App);
    // setup the root node of all things
    // which is the mighty <html> tag
    const rootElm = domApi.$doc.documentElement;
    rootElm['s-ld'] = [];
    rootElm['s-rn'] = true;
    rootElm['s-init'] = function appLoadedCallback() {
        plt.hasLoadedMap.set(rootElm, true);
        appLoaded();
    };
    function appLoaded(failureDiagnostic) {
        if (plt.hasLoadedMap.has(rootElm) || failureDiagnostic) {
            // the root node has loaded
            plt.onAppLoad && plt.onAppLoad(rootElm, failureDiagnostic);
        }
    }
    function getComponentMeta(elm) {
        // registry tags are always lower-case
        return cmpRegistry[elm.nodeName.toLowerCase()];
    }
    function defineComponent(cmpMeta) {
        // default mode and color props
        cmpRegistry[cmpMeta.tagNameMeta] = cmpMeta;
    }
    function setLoadedBundle(bundleId, value) {
        loadedBundles[bundleId] = value;
    }
    function getLoadedBundle(bundleId) {
        if (bundleId == null) {
            return null;
        }
        return loadedBundles[bundleId.replace(/^\.\//, '')];
    }
    /**
     * Execute a bundle queue item
     * @param name
     * @param deps
     * @param callback
     */
    function execBundleCallback(name, deps, callback) {
        const bundleExports = {};
        try {
            callback(bundleExports, ...deps.map(d => getLoadedBundle(d)));
        }
        catch (e) {
            onError(e, 1 /* LoadBundleError */, null, true);
        }
        // If name is undefined then this callback was fired by component callback
        if (name === undefined) {
            return;
        }
        setLoadedBundle(name, bundleExports);
        // If name contains chunk then this callback was associated with a dependent bundle loading
        // let's add a reference to the constructors on each components metadata
        // each key in moduleImports is a PascalCased tag name
        if (!name.startsWith('chunk')) {
            Object.keys(bundleExports).forEach(pascalCasedTagName => {
                const normalizedTagName = pascalCasedTagName.replace(/-/g, '').toLowerCase();
                const registryTags = Object.keys(cmpRegistry);
                for (let i = 0; i < registryTags.length; i++) {
                    const normalizedRegistryTag = registryTags[i].replace(/-/g, '').toLowerCase();
                    if (normalizedRegistryTag === normalizedTagName) {
                        const cmpMeta = cmpRegistry[toDashCase(pascalCasedTagName)];
                        if (cmpMeta) {
                            // connect the component's constructor to its metadata
                            const componentConstructor = bundleExports[pascalCasedTagName];
                            if (!cmpMeta.componentConstructor) {
                                fillCmpMetaFromConstructor(componentConstructor, cmpMeta);
                                if (!cmpMeta.componentConstructor) {
                                    cmpMeta.componentConstructor = componentConstructor;
                                }
                            }
                            serverInitStyle(domApi, appliedStyleIds, componentConstructor);
                        }
                        break;
                    }
                }
            });
        }
    }
    /**
     * This function is called anytime a JS file is loaded
     */
    App.loadBundle = function loadBundle(bundleId, [, ...dependentsList], importer) {
        const missingDependents = dependentsList.filter(d => !getLoadedBundle(d));
        missingDependents.forEach(d => {
            const fileName = d.replace('.js', '.es5.js');
            loadFile(fileName);
        });
        execBundleCallback(bundleId, dependentsList, importer);
    };
    function isDefinedComponent(elm) {
        return !!(cmpRegistry[elm.tagName.toLowerCase()]);
    }
    plt.attachStyles = (plt, _domApi, cmpMeta, hostElm) => {
        serverAttachStyles(plt, appliedStyleIds, cmpMeta, hostElm);
    };
    // This is executed by the component's connected callback.
    function requestBundle(cmpMeta, elm) {
        // set the "mode" property
        if (!elm.mode) {
            // looks like mode wasn't set as a property directly yet
            // first check if there's an attribute
            // next check the app's global
            elm.mode = domApi.$getAttribute(elm, 'mode') || Context.mode;
        }
        // It is possible the data was loaded from an outside source like tests
        if (cmpRegistry[cmpMeta.tagNameMeta].componentConstructor) {
            serverInitStyle(domApi, appliedStyleIds, cmpRegistry[cmpMeta.tagNameMeta].componentConstructor);
            queueUpdate(plt, elm);
        }
        else {
            const bundleId = (typeof cmpMeta.bundleIds === 'string') ?
                cmpMeta.bundleIds :
                cmpMeta.bundleIds[elm.mode];
            if (getLoadedBundle(bundleId)) {
                // sweet, we've already loaded this bundle
                queueUpdate(plt, elm);
            }
            else {
                const fileName = getComponentBundleFilename(cmpMeta, elm.mode);
                loadFile(fileName);
            }
        }
    }
    function loadFile(fileName) {
        const jsFilePath = config.sys.path.join(appBuildDir, fileName);
        const jsCode = compilerCtx.fs.readFileSync(jsFilePath);
        config.sys.vm.runInContext(jsCode, win);
    }
    function runGlobalScripts() {
        if (!compilerCtx || !compilerCtx.appFiles || !compilerCtx.appFiles.global) {
            return;
        }
        config.sys.vm.runInContext(compilerCtx.appFiles.global, win);
    }
    function onError(err, type, elm, appFailure) {
        const diagnostic = {
            type: 'runtime',
            header: 'Runtime error detected',
            level: 'error',
            messageText: err ? err.message ? err.message : err.toString() : ''
        };
        if (err && err.stack) {
            diagnostic.messageText += '\n' + err.stack;
            diagnostic.messageText = diagnostic.messageText.trim();
        }
        switch (type) {
            case 1 /* LoadBundleError */:
                diagnostic.header += ' while loading bundle';
                break;
            case 2 /* QueueEventsError */:
                diagnostic.header += ' while running initial events';
                break;
            case 3 /* WillLoadError */:
                diagnostic.header += ' during componentWillLoad()';
                break;
            case 4 /* DidLoadError */:
                diagnostic.header += ' during componentDidLoad()';
                break;
            case 7 /* InitInstanceError */:
                diagnostic.header += ' while initializing instance';
                break;
            case 8 /* RenderError */:
                diagnostic.header += ' while rendering';
                break;
            case 6 /* DidUpdateError */:
                diagnostic.header += ' while updating';
                break;
        }
        if (elm && elm.tagName) {
            diagnostic.header += ': ' + elm.tagName.toLowerCase();
        }
        diagnostics.push(diagnostic);
        if (appFailure) {
            appLoaded(diagnostic);
        }
    }
    function propConnect(ctrlTag) {
        return proxyController(domApi, controllerComponents, ctrlTag);
    }
    function getContextItem(contextKey) {
        return Context[contextKey];
    }
    return plt;
}
function getComponentBundleFilename(cmpMeta, modeName) {
    let bundleId = (typeof cmpMeta.bundleIds === 'string') ?
        cmpMeta.bundleIds :
        (cmpMeta.bundleIds[modeName] || cmpMeta.bundleIds[DEFAULT_STYLE_MODE]);
    if (cmpMeta.encapsulationMeta === 2 /* ScopedCss */ || cmpMeta.encapsulationMeta === 1 /* ShadowDom */) {
        bundleId += '.sc';
    }
    // server-side always uses es5 and jsonp callback modules
    bundleId += '.es5.js';
    return bundleId;
}

var __awaiter$A = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function hydrateHtml(config, compilerCtx, outputTarget, cmpRegistry, opts) {
    return new Promise(resolve => {
        // validate the hydrate options and add any missing info
        const hydrateTarget = normalizeHydrateOptions(outputTarget, opts);
        // create the results object we're gonna return
        const hydrateResults = generateHydrateResults(config, hydrateTarget);
        // create a emulated window
        // attach data the request to the window
        const dom = config.sys.createDom();
        const win = dom.parse(hydrateTarget);
        const doc = win.document;
        // normalize dir and lang before connecting elements
        // so that the info is their incase they read it at runtime
        normalizeDirection(doc, hydrateTarget);
        normalizeLanguage(doc, hydrateTarget);
        // create the app global
        const App = {};
        // create the platform
        const plt = createPlatformServer(config, hydrateTarget, win, doc, App, cmpRegistry, hydrateResults.diagnostics, hydrateTarget.isPrerender, compilerCtx);
        // fire off this function when the app has finished loading
        // and all components have finished hydrating
        plt.onAppLoad = (rootElm, failureDiagnostic) => __awaiter$A(this, void 0, void 0, function* () {
            if (config._isTesting) {
                hydrateResults.__testPlatform = plt;
            }
            if (failureDiagnostic) {
                hydrateResults.html = generateFailureDiagnostic(failureDiagnostic);
                dom.destroy();
                resolve(hydrateResults);
                return;
            }
            // all synchronous operations next
            if (rootElm) {
                try {
                    // optimize this document!!
                    yield optimizeHtml(config, compilerCtx, hydrateTarget, hydrateResults.url, doc, hydrateResults.diagnostics);
                    // gather up all of the <a> tag information in the doc
                    if (hydrateTarget.isPrerender && hydrateTarget.hydrateComponents) {
                        collectAnchors(config, doc, hydrateResults);
                    }
                    // serialize this dom back into a string
                    if (hydrateTarget.serializeHtml !== false) {
                        hydrateResults.html = dom.serialize();
                    }
                }
                catch (e) {
                    // gahh, something's up
                    hydrateResults.diagnostics.push({
                        level: 'error',
                        type: 'hydrate',
                        header: 'DOM Serialize',
                        messageText: e
                    });
                    // idk, some error, just use the original html
                    hydrateResults.html = hydrateTarget.html;
                }
            }
            if (hydrateTarget.destroyDom !== false) {
                // always destroy the dom unless told otherwise
                dom.destroy();
            }
            else {
                // we didn't destroy the dom
                // so let's return the root element
                hydrateResults.root = rootElm;
            }
            // cool, all good here, even if there are errors
            // we're passing back the result object
            resolve(hydrateResults);
        });
        if (hydrateTarget.hydrateComponents === false) {
            plt.onAppLoad(win.document.body);
            return;
        }
        // patch the render function that we can add SSR ids
        // and to connect any elements it may have just appened to the DOM
        let ssrIds = 0;
        const pltRender = plt.render;
        plt.render = function render(hostElm, oldVNode, newVNode, useNativeShadowDom, encapsulation) {
            let ssrId;
            let existingSsrId;
            if (hydrateTarget.ssrIds !== false) {
                // this may have been patched more than once
                // so reuse the ssr id if it already has one
                if (oldVNode && oldVNode.elm) {
                    existingSsrId = oldVNode.elm.getAttribute(SSR_VNODE_ID);
                }
                if (existingSsrId) {
                    ssrId = parseInt(existingSsrId, 10);
                }
                else {
                    ssrId = ssrIds++;
                }
            }
            useNativeShadowDom = false;
            newVNode = pltRender(hostElm, oldVNode, newVNode, useNativeShadowDom, encapsulation, ssrId);
            connectChildElements(config, plt, App, hydrateResults, newVNode.elm);
            return newVNode;
        };
        // loop through each node and start connecting/hydrating
        // any elements that are host elements to components
        // this kicks off all the async hydrating
        connectChildElements(config, plt, App, hydrateResults, win.document.body);
        if (hydrateResults.components.length === 0) {
            // what gives, never found ANY host elements to connect!
            // ok we're just done i guess, idk
            hydrateResults.html = hydrateTarget.html;
            resolve(hydrateResults);
        }
    });
}

var __awaiter$B = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function createAppRegistry(config) {
    // create the shared app registry object
    const appRegistry = {
        namespace: config.namespace,
        fsNamespace: config.fsNamespace,
        loader: `../${getLoaderFileName(config)}`
    };
    return appRegistry;
}
function getAppRegistry(config, compilerCtx, outputTarget) {
    const registryJsonFilePath = getRegistryJson(config, outputTarget);
    let appRegistry;
    try {
        // open up the app registry json file
        const appRegistryJson = compilerCtx.fs.readFileSync(registryJsonFilePath);
        // parse the json into app registry data
        appRegistry = JSON.parse(appRegistryJson);
    }
    catch (e) {
        throw new Error(`Error parsing app registry, ${registryJsonFilePath}: ${e}`);
    }
    return appRegistry;
}
function serializeComponentRegistry(cmpRegistry) {
    const appRegistryComponents = {};
    Object.keys(cmpRegistry).sort().forEach(tagName => {
        const cmpMeta = cmpRegistry[tagName];
        appRegistryComponents[tagName] = {
            bundleIds: cmpMeta.bundleIds
        };
        if (cmpMeta.encapsulationMeta === 1 /* ShadowDom */) {
            appRegistryComponents[tagName].encapsulation = 'shadow';
        }
        else if (cmpMeta.encapsulationMeta === 2 /* ScopedCss */) {
            appRegistryComponents[tagName].encapsulation = 'scoped';
        }
    });
    return appRegistryComponents;
}
function writeAppRegistry(config, compilerCtx, buildCtx, outputTarget, appRegistry, cmpRegistry) {
    return __awaiter$B(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        if (outputTarget.type === 'www') {
            appRegistry.components = serializeComponentRegistry(cmpRegistry);
            const registryJson = JSON.stringify(appRegistry, null, 2);
            // cache so we can check if it changed on rebuilds
            compilerCtx.appFiles.registryJson = registryJson;
            const appRegistryWWW = getRegistryJson(config, outputTarget);
            yield compilerCtx.fs.writeFile(appRegistryWWW, registryJson);
            const relPath = config.sys.path.relative(config.rootDir, appRegistryWWW);
            buildCtx.debug(`writeAppRegistry: ${relPath}`);
        }
    });
}

function loadComponentRegistry(config, compilerCtx, outputTarget) {
    const appRegistry = getAppRegistry(config, compilerCtx, outputTarget);
    const cmpRegistry = {};
    const tagNames = Object.keys(appRegistry.components);
    tagNames.forEach(tagName => {
        const reg = appRegistry.components[tagName];
        cmpRegistry[tagName] = {
            tagNameMeta: tagName,
            bundleIds: reg.bundleIds
        };
        if (reg.encapsulation === 'shadow') {
            cmpRegistry[tagName].encapsulationMeta = 1 /* ShadowDom */;
        }
        else if (reg.encapsulation === 'scoped') {
            cmpRegistry[tagName].encapsulationMeta = 2 /* ScopedCss */;
        }
    });
    return cmpRegistry;
}

function setBooleanConfig(config, configName, flagName, defaultValue) {
    if (flagName) {
        if (typeof config.flags[flagName] === 'boolean') {
            config[configName] = config.flags[flagName];
        }
    }
    const userConfigName = getUserConfigName(config, configName);
    if (typeof config[userConfigName] === 'function') {
        config[userConfigName] = !!config[userConfigName]();
    }
    if (typeof config[userConfigName] === 'boolean') {
        config[configName] = config[userConfigName];
    }
    else {
        config[configName] = defaultValue;
    }
}
function setNumberConfig(config, configName, _flagName, defaultValue) {
    const userConfigName = getUserConfigName(config, configName);
    if (typeof config[userConfigName] === 'function') {
        config[userConfigName] = config[userConfigName]();
    }
    if (typeof config[userConfigName] === 'number') {
        config[configName] = config[userConfigName];
    }
    else {
        config[configName] = defaultValue;
    }
}
function setStringConfig(config, configName, defaultValue) {
    const userConfigName = getUserConfigName(config, configName);
    if (typeof config[userConfigName] === 'function') {
        config[userConfigName] = config[userConfigName]();
    }
    if (typeof config[userConfigName] === 'string') {
        config[configName] = config[userConfigName];
    }
    else {
        config[configName] = defaultValue;
    }
}
function setArrayConfig(config, configName, defaultValue) {
    const userConfigName = getUserConfigName(config, configName);
    if (typeof config[userConfigName] === 'function') {
        config[userConfigName] = config[userConfigName]();
    }
    if (!Array.isArray(config[configName])) {
        if (Array.isArray(defaultValue)) {
            config[configName] = defaultValue.slice();
        }
        else {
            config[configName] = [];
        }
    }
}
function getUserConfigName(config, correctConfigName) {
    const userConfigNames = Object.keys(config);
    for (const userConfigName of userConfigNames) {
        if (userConfigName.toLowerCase() === correctConfigName.toLowerCase()) {
            if (userConfigName !== correctConfigName) {
                config.logger.warn(`config "${userConfigName}" should be "${correctConfigName}"`);
                return userConfigName;
            }
            break;
        }
    }
    return correctConfigName;
}

function validateAssetVerioning(config) {
    if (!config.assetVersioning) {
        config.assetVersioning = null;
        return;
    }
    if ((config.assetVersioning) === true) {
        config.assetVersioning = {};
    }
    const hashLength = config.hashedFileNameLength > 3 ? config.hashedFileNameLength : DEFAULTS.hashLength;
    setArrayConfig(config.assetVersioning, 'cssProperties', DEFAULTS.cssProperties);
    setNumberConfig(config.assetVersioning, 'hashLength', null, hashLength);
    setBooleanConfig(config.assetVersioning, 'queryMode', null, DEFAULTS.queryMode);
    setStringConfig(config.assetVersioning, 'prefix', DEFAULTS.separator);
    setStringConfig(config.assetVersioning, 'separator', DEFAULTS.separator);
    setBooleanConfig(config.assetVersioning, 'versionHtml', null, DEFAULTS.versionHtml);
    setBooleanConfig(config.assetVersioning, 'versionManifest', null, DEFAULTS.versionManifest);
    setBooleanConfig(config.assetVersioning, 'versionCssProperties', null, DEFAULTS.versionCssProperties);
}
const DEFAULTS = {
    cssProperties: ['background', 'background-url', 'url'],
    hashLength: 8,
    queryMode: false,
    pattern: '**/*.{css,js,png,jpg,jpeg,gif,svg,json,woff,woff2,ttf,eot}',
    prefix: '',
    separator: '.',
    versionHtml: true,
    versionManifest: true,
    versionCssProperties: true,
};

function validateCopy(config) {
    if (config.copy === null || config.copy === false) {
        // manually forcing to skip the copy task
        config.copy = null;
        return;
    }
    if (!Array.isArray(config.copy)) {
        config.copy = [];
    }
    if (!config.copy.some(c => c.src === DEFAULT_ASSETS.src)) {
        config.copy.push(DEFAULT_ASSETS);
    }
    if (!config.copy.some(c => c.src === DEFAULT_MANIFEST.src)) {
        config.copy.push(DEFAULT_MANIFEST);
    }
}
const DEFAULT_ASSETS = { src: 'assets', warn: false };
const DEFAULT_MANIFEST = { src: 'manifest.json', warn: false };

function validateDevServer(config) {
    config.devServer = config.devServer || {};
    if (typeof config.flags.address === 'string') {
        config.devServer.address = config.flags.address;
    }
    else {
        setStringConfig(config.devServer, 'address', '0.0.0.0');
    }
    if (typeof config.flags.port === 'number') {
        config.devServer.port = config.flags.port;
    }
    else {
        setNumberConfig(config.devServer, 'port', null, 3333);
    }
    setBooleanConfig(config.devServer, 'gzip', null, true);
    setBooleanConfig(config.devServer, 'hotReplacement', null, true);
    setBooleanConfig(config.devServer, 'openBrowser', null, true);
    validateProtocol(config.devServer);
    if (config.devServer.historyApiFallback !== null && config.devServer.historyApiFallback !== false) {
        config.devServer.historyApiFallback = config.devServer.historyApiFallback || {};
        if (typeof config.devServer.historyApiFallback.index !== 'string') {
            config.devServer.historyApiFallback.index = 'index.html';
        }
        if (typeof config.devServer.historyApiFallback.disableDotRule !== 'boolean') {
            config.devServer.historyApiFallback.disableDotRule = false;
        }
    }
    if (config.flags && config.flags.open === false) {
        config.devServer.openBrowser = false;
    }
    let serveDir = null;
    let baseUrl = null;
    const wwwOutputTarget = config.outputTargets.find(o => o.type === 'www');
    if (wwwOutputTarget) {
        serveDir = wwwOutputTarget.dir;
        baseUrl = wwwOutputTarget.baseUrl;
        config.logger.debug(`dev server www root: ${serveDir}, base url: ${baseUrl}`);
    }
    else {
        serveDir = config.rootDir;
        if (config.flags && config.flags.serve) {
            config.logger.debug(`dev server missing www output target, serving root directory: ${serveDir}`);
        }
    }
    if (typeof baseUrl !== 'string') {
        baseUrl = `/`;
    }
    baseUrl = normalizePath(baseUrl);
    if (!baseUrl.startsWith('/')) {
        baseUrl = '/' + baseUrl;
    }
    if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
    }
    setStringConfig(config.devServer, 'root', serveDir);
    setStringConfig(config.devServer, 'baseUrl', baseUrl);
    if (!config.sys.path.isAbsolute(config.devServer.root)) {
        config.devServer.root = pathJoin(config, config.rootDir, config.devServer.root);
    }
    if (config.devServer.excludeHmr) {
        if (!Array.isArray(config.devServer.excludeHmr)) {
            config.logger.error(`dev server excludeHmr must be an array of glob strings`);
        }
    }
    else {
        config.devServer.excludeHmr = [];
    }
    return config.devServer;
}
function validateProtocol(devServer) {
    if (typeof devServer.protocol === 'string') {
        let protocol = devServer.protocol.trim().toLowerCase();
        protocol = protocol.replace(':', '').replace('/', '');
        devServer.protocol = protocol;
    }
    if (devServer.protocol !== 'http' && devServer.protocol !== 'https') {
        devServer.protocol = 'http';
    }
}

function validateNamespace$1(config) {
    setStringConfig(config, 'namespace', DEFAULT_NAMESPACE);
    config.namespace = config.namespace.trim();
    const invalidNamespaceChars = config.namespace.replace(/(\w)|(\-)|(\$)/g, '');
    if (invalidNamespaceChars !== '') {
        throw new Error(`Namespace "${config.namespace}" contains invalid characters: ${invalidNamespaceChars}`);
    }
    if (config.namespace.length < 3) {
        throw new Error(`Namespace "${config.namespace}" must be at least 3 characters`);
    }
    if (/^\d+$/.test(config.namespace.charAt(0))) {
        throw new Error(`Namespace "${config.namespace}" cannot have a number for the first character`);
    }
    if (config.namespace.charAt(0) === '-') {
        throw new Error(`Namespace "${config.namespace}" cannot have a dash for the first character`);
    }
    if (config.namespace.charAt(config.namespace.length - 1) === '-') {
        throw new Error(`Namespace "${config.namespace}" cannot have a dash for the last character`);
    }
    // the file system namespace is the one
    // used in filenames and seen in the url
    setStringConfig(config, 'fsNamespace', config.namespace.toLowerCase());
    if (config.namespace.includes('-')) {
        // convert to PascalCase
        // this is the same namespace that gets put on "window"
        config.namespace = dashToPascalCase(config.namespace);
    }
}
const DEFAULT_NAMESPACE = 'App';

function validateDocs(config) {
    if (config.flags.docs || typeof config.flags.docsJson === 'string') {
        // docs flag
        config.outputTargets = config.outputTargets || [];
        if (!config.outputTargets.some(o => o.type === 'docs')) {
            // didn't provide a docs config, so let's add one
            const outputTarget = {
                type: 'docs'
            };
            if (typeof config.flags.docsJson === 'string') {
                outputTarget.jsonFile = config.flags.docsJson;
            }
            else if (config.flags.docs) {
                outputTarget.readmeDir = config.srcDir;
            }
            config.outputTargets.push(outputTarget);
        }
        const docsOutputs = config.outputTargets.filter(o => o.type === 'docs');
        docsOutputs.forEach(outputTarget => {
            validateDocsOutputTarget(config, outputTarget);
        });
    }
    else {
        if (config.outputTargets) {
            // remove docs if there is no docs flag
            config.outputTargets = config.outputTargets.filter(o => o.type !== 'docs');
        }
    }
}
function validateDocsOutputTarget(config, outputTarget) {
    if (typeof outputTarget.readmeDir === 'string' && !config.sys.path.isAbsolute(outputTarget.readmeDir)) {
        outputTarget.readmeDir = pathJoin(config, config.rootDir, outputTarget.readmeDir);
    }
    if (typeof outputTarget.jsonFile === 'string') {
        outputTarget.jsonFile = pathJoin(config, config.rootDir, outputTarget.jsonFile);
    }
}

function validateOutputTargetAngular(config) {
    const path$$1 = config.sys.path;
    const distOutputTargets = config.outputTargets.filter(o => o.type === 'angular');
    distOutputTargets.forEach(outputTarget => {
        outputTarget.excludeComponents = outputTarget.excludeComponents || [];
        if (typeof outputTarget.appBuild !== 'boolean') {
            outputTarget.appBuild = true;
        }
        if (!outputTarget.dir) {
            outputTarget.dir = DEFAULT_DIR;
        }
        if (!path$$1.isAbsolute(outputTarget.dir)) {
            outputTarget.dir = normalizePath(path$$1.join(config.rootDir, outputTarget.dir));
        }
        if (!outputTarget.buildDir) {
            outputTarget.buildDir = DEFAULT_BUILD_DIR;
        }
        if (!path$$1.isAbsolute(outputTarget.buildDir)) {
            outputTarget.buildDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.buildDir));
        }
        if (!outputTarget.typesDir) {
            outputTarget.typesDir = DEFAULT_TYPES_DIR;
        }
        if (!path$$1.isAbsolute(outputTarget.typesDir)) {
            outputTarget.typesDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.typesDir));
        }
        if (typeof outputTarget.empty !== 'boolean') {
            outputTarget.empty = DEFAULT_EMPTY_DIR;
        }
        if (typeof outputTarget.appBuild !== 'boolean') {
            outputTarget.appBuild = true;
        }
        if (!path$$1.isAbsolute(outputTarget.directivesProxyFile)) {
            outputTarget.directivesProxyFile = normalizePath(path$$1.join(config.rootDir, outputTarget.directivesProxyFile));
        }
        if (!path$$1.isAbsolute(outputTarget.directivesArrayFile)) {
            outputTarget.directivesArrayFile = normalizePath(path$$1.join(config.rootDir, outputTarget.directivesArrayFile));
        }
    });
}
const DEFAULT_DIR = 'dist';
const DEFAULT_BUILD_DIR = '';
const DEFAULT_EMPTY_DIR = true;
const DEFAULT_TYPES_DIR = 'types';

function validateOutputTargetDist(config) {
    const path$$1 = config.sys.path;
    const distOutputTargets = config.outputTargets.filter(o => o.type === 'dist');
    distOutputTargets.forEach(outputTarget => {
        if (!outputTarget.dir) {
            outputTarget.dir = DEFAULT_DIR$1;
        }
        if (!path$$1.isAbsolute(outputTarget.dir)) {
            outputTarget.dir = normalizePath(path$$1.join(config.rootDir, outputTarget.dir));
        }
        if (!outputTarget.buildDir) {
            outputTarget.buildDir = DEFAULT_BUILD_DIR$1;
        }
        if (!path$$1.isAbsolute(outputTarget.buildDir)) {
            outputTarget.buildDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.buildDir));
        }
        if (!outputTarget.collectionDir) {
            outputTarget.collectionDir = DEFAULT_COLLECTION_DIR;
        }
        if (!path$$1.isAbsolute(outputTarget.collectionDir)) {
            outputTarget.collectionDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.collectionDir));
        }
        if (!outputTarget.typesDir) {
            outputTarget.typesDir = DEFAULT_TYPES_DIR$1;
        }
        if (!path$$1.isAbsolute(outputTarget.typesDir)) {
            outputTarget.typesDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.typesDir));
        }
        if (typeof outputTarget.empty !== 'boolean') {
            outputTarget.empty = DEFAULT_EMPTY_DIR$1;
        }
        if (typeof outputTarget.appBuild !== 'boolean') {
            outputTarget.appBuild = true;
        }
    });
}
const DEFAULT_DIR$1 = 'dist';
const DEFAULT_BUILD_DIR$1 = '';
const DEFAULT_EMPTY_DIR$1 = true;
const DEFAULT_COLLECTION_DIR = 'collection';
const DEFAULT_TYPES_DIR$1 = 'types';

function validatePrerender(config, outputTarget) {
    let defaults;
    if (config.flags.prerender) {
        // forcing a prerender build
        defaults = FULL_PRERENDER_DEFAULTS;
    }
    else if (config.flags.ssr) {
        // forcing a ssr build
        defaults = SSR_DEFAULTS;
    }
    else {
        // not forcing a prerender build
        if (config.devMode) {
            // not forcing a prerender build
            // but we're in dev mode
            defaults = DEV_MODE_DEFAULTS;
        }
        else {
            // not forcing a prerender build
            // but we're in prod mode
            defaults = PROD_NON_HYDRATE_DEFAULTS;
        }
    }
    setStringConfig(outputTarget, 'baseUrl', defaults.baseUrl);
    setBooleanConfig(outputTarget, 'canonicalLink', null, defaults.canonicalLink);
    setBooleanConfig(outputTarget, 'collapseWhitespace', null, defaults.collapseWhitespace);
    setBooleanConfig(outputTarget, 'hydrateComponents', null, defaults.hydrateComponents);
    setBooleanConfig(outputTarget, 'inlineStyles', null, defaults.inlineStyles);
    setBooleanConfig(outputTarget, 'inlineLoaderScript', null, defaults.inlineLoaderScript);
    setNumberConfig(outputTarget, 'inlineAssetsMaxSize', null, defaults.inlineAssetsMaxSize);
    setBooleanConfig(outputTarget, 'prerenderUrlCrawl', null, defaults.prerenderUrlCrawl);
    setArrayConfig(outputTarget, 'prerenderLocations', defaults.prerenderLocations);
    setBooleanConfig(outputTarget, 'prerenderPathHash', null, defaults.prerenderPathHash);
    setBooleanConfig(outputTarget, 'prerenderPathQuery', null, defaults.prerenderPathQuery);
    setNumberConfig(outputTarget, 'prerenderMaxConcurrent', null, defaults.prerenderMaxConcurrent);
    setBooleanConfig(outputTarget, 'removeUnusedStyles', null, defaults.removeUnusedStyles);
    defaults.baseUrl = normalizePath(defaults.baseUrl);
    if (!outputTarget.baseUrl.startsWith('/')) {
        throw new Error(`baseUrl "${outputTarget.baseUrl}" must start with a slash "/". This represents an absolute path to the root of the domain.`);
    }
    if (!outputTarget.baseUrl.endsWith('/')) {
        outputTarget.baseUrl += '/';
    }
    if (config.flags.prerender && outputTarget.prerenderLocations.length === 0) {
        outputTarget.prerenderLocations.push({
            path: outputTarget.baseUrl
        });
    }
    if (outputTarget.hydrateComponents) {
        config.buildEs5 = true;
    }
}
const FULL_PRERENDER_DEFAULTS = {
    type: 'www',
    baseUrl: '/',
    canonicalLink: true,
    collapseWhitespace: true,
    hydrateComponents: true,
    inlineStyles: true,
    inlineLoaderScript: true,
    inlineAssetsMaxSize: 5000,
    prerenderUrlCrawl: true,
    prerenderPathHash: false,
    prerenderPathQuery: false,
    prerenderMaxConcurrent: 4,
    removeUnusedStyles: true
};
const SSR_DEFAULTS = {
    type: 'www',
    baseUrl: '/',
    canonicalLink: true,
    collapseWhitespace: true,
    hydrateComponents: true,
    inlineStyles: true,
    inlineLoaderScript: true,
    inlineAssetsMaxSize: 0,
    prerenderUrlCrawl: false,
    prerenderPathHash: false,
    prerenderPathQuery: false,
    prerenderMaxConcurrent: 0,
    removeUnusedStyles: false
};
const PROD_NON_HYDRATE_DEFAULTS = {
    type: 'www',
    baseUrl: '/',
    canonicalLink: false,
    collapseWhitespace: true,
    hydrateComponents: false,
    inlineStyles: false,
    inlineLoaderScript: true,
    inlineAssetsMaxSize: 0,
    prerenderUrlCrawl: false,
    prerenderPathHash: false,
    prerenderPathQuery: false,
    prerenderMaxConcurrent: 0,
    removeUnusedStyles: false
};
const DEV_MODE_DEFAULTS = {
    type: 'www',
    baseUrl: '/',
    canonicalLink: false,
    collapseWhitespace: false,
    hydrateComponents: false,
    inlineStyles: false,
    inlineLoaderScript: false,
    inlineAssetsMaxSize: 0,
    prerenderUrlCrawl: false,
    prerenderPathHash: false,
    prerenderPathQuery: false,
    prerenderMaxConcurrent: 0,
    removeUnusedStyles: false
};

function validateOutputTargetWww(config) {
    if (!Array.isArray(config.outputTargets)) {
        config.outputTargets = [
            { type: 'www' }
        ];
    }
    const wwwOutputTargets = config.outputTargets.filter(o => o.type === 'www');
    wwwOutputTargets.forEach(outputTarget => {
        validateOutputTarget(config, outputTarget);
    });
}
function validateOutputTarget(config, outputTarget) {
    const path$$1 = config.sys.path;
    setStringConfig(outputTarget, 'dir', DEFAULT_DIR$2);
    if (!path$$1.isAbsolute(outputTarget.dir)) {
        outputTarget.dir = pathJoin(config, config.rootDir, outputTarget.dir);
    }
    setStringConfig(outputTarget, 'buildDir', DEFAULT_BUILD_DIR$2);
    if (!path$$1.isAbsolute(outputTarget.buildDir)) {
        outputTarget.buildDir = pathJoin(config, outputTarget.dir, outputTarget.buildDir);
    }
    setStringConfig(outputTarget, 'indexHtml', DEFAULT_INDEX_HTML);
    if (!path$$1.isAbsolute(outputTarget.indexHtml)) {
        outputTarget.indexHtml = pathJoin(config, outputTarget.dir, outputTarget.indexHtml);
    }
    setBooleanConfig(outputTarget, 'empty', null, DEFAULT_EMPTY_DIR$2);
    validatePrerender(config, outputTarget);
    if (typeof outputTarget.appBuild !== 'boolean') {
        outputTarget.appBuild = true;
    }
}
const DEFAULT_DIR$2 = 'www';
const DEFAULT_INDEX_HTML = 'index.html';
const DEFAULT_BUILD_DIR$2 = 'build';
const DEFAULT_EMPTY_DIR$2 = true;

function validateResourcesUrl(outputTarget) {
    if (typeof outputTarget.resourcesUrl === 'string') {
        outputTarget.resourcesUrl = normalizePath(outputTarget.resourcesUrl.trim());
        if (outputTarget.resourcesUrl.charAt(outputTarget.resourcesUrl.length - 1) !== '/') {
            // ensure there's a trailing /
            outputTarget.resourcesUrl += '/';
        }
    }
}

function validateServiceWorker(config, outputTarget) {
    if (config.devMode && !config.flags.serviceWorker) {
        outputTarget.serviceWorker = null;
        return;
    }
    if (outputTarget.serviceWorker === false || outputTarget.serviceWorker === null) {
        outputTarget.serviceWorker = null;
        return;
    }
    if (!outputTarget.serviceWorker && outputTarget.type !== 'www') {
        outputTarget.serviceWorker = null;
        return;
    }
    if (outputTarget.serviceWorker === true) {
        outputTarget.serviceWorker = {};
    }
    else if (!outputTarget.serviceWorker && config.devMode) {
        outputTarget.serviceWorker = null;
        return;
    }
    if (typeof outputTarget.serviceWorker !== 'object') {
        // what was passed in could have been a boolean
        // in that case let's just turn it into an empty obj so Object.assign doesn't crash
        outputTarget.serviceWorker = {};
    }
    if (!Array.isArray(outputTarget.serviceWorker.globPatterns)) {
        if (typeof outputTarget.serviceWorker.globPatterns === 'string') {
            outputTarget.serviceWorker.globPatterns = [outputTarget.serviceWorker.globPatterns];
        }
        else if (typeof outputTarget.serviceWorker.globPatterns !== 'string') {
            outputTarget.serviceWorker.globPatterns = [DEFAULT_GLOB_PATTERNS];
        }
    }
    if (typeof outputTarget.serviceWorker.globDirectory !== 'string') {
        outputTarget.serviceWorker.globDirectory = outputTarget.dir;
    }
    if (typeof outputTarget.serviceWorker.globIgnores === 'string') {
        outputTarget.serviceWorker.globIgnores = [outputTarget.serviceWorker.globIgnores];
    }
    outputTarget.serviceWorker.globIgnores = outputTarget.serviceWorker.globIgnores || [];
    addGlobIgnores(config, outputTarget.serviceWorker.globIgnores);
    if (!outputTarget.serviceWorker.swDest) {
        outputTarget.serviceWorker.swDest = config.sys.path.join(outputTarget.dir, DEFAULT_FILENAME);
    }
    if (!config.sys.path.isAbsolute(outputTarget.serviceWorker.swDest)) {
        outputTarget.serviceWorker.swDest = config.sys.path.join(outputTarget.dir, outputTarget.serviceWorker.swDest);
    }
}
function addGlobIgnores(config, globIgnores) {
    const appRegistry = `**/${getRegistryFileName(config)}`;
    globIgnores.push(appRegistry);
    const appGlobal = `**/${getGlobalFileName(config)}`;
    globIgnores.push(appGlobal);
    const hostConfigJson = `**/${HOST_CONFIG_FILENAME}`;
    globIgnores.push(hostConfigJson);
}
const DEFAULT_GLOB_PATTERNS = '**/*.{js,css,json,html,ico,png,svg}';
const DEFAULT_FILENAME = 'sw.js';

function validateStats(config) {
    if (config.flags.stats) {
        const hasOutputTarget = config.outputTargets.some(o => o.type === 'stats');
        if (!hasOutputTarget) {
            config.outputTargets.push({
                type: 'stats'
            });
        }
    }
    const outputTargets = config.outputTargets.filter(o => o.type === 'stats');
    outputTargets.forEach(outputTarget => {
        validateStatsOutputTarget(config, outputTarget);
    });
}
function validateStatsOutputTarget(config, outputTarget) {
    if (!outputTarget.file) {
        outputTarget.file = DEFAULT_JSON_FILE_NAME;
    }
    if (!config.sys.path.isAbsolute(outputTarget.file)) {
        outputTarget.file = pathJoin(config, config.rootDir, outputTarget.file);
    }
}
const DEFAULT_JSON_FILE_NAME = 'stencil-stats.json';

/**
 * DEPRECATED "config" generateWWW, wwwDir, emptyWWW, generateDistribution, distDir, emptyDist
 * since 0.7.0, 2018-03-02
 */
function _deprecatedToMultipleTarget(config) {
    const deprecatedConfigs = [];
    if (config.generateWWW !== undefined) {
        deprecatedConfigs.push('generateWWW');
        if (config.generateWWW) {
            config.outputTargets = config.outputTargets || [];
            let o = config.outputTargets.find(o => o.type === 'www');
            if (!o) {
                o = { type: 'www' };
                config.outputTargets.push(o);
            }
        }
        delete config.generateWWW;
    }
    if (config.emptyWWW !== undefined) {
        deprecatedConfigs.push('emptyWWW');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www' };
            config.outputTargets.push(o);
        }
        o.empty = !!config.emptyWWW;
        delete config.emptyWWW;
    }
    if (config.wwwDir !== undefined) {
        deprecatedConfigs.push('wwwDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www' };
            config.outputTargets.push(o);
        }
        o.dir = config.wwwDir;
        delete config.wwwDir;
    }
    if (config.buildDir !== undefined) {
        deprecatedConfigs.push('buildDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www' };
            config.outputTargets.push(o);
        }
        o.buildDir = config.buildDir;
        delete config.buildDir;
    }
    if (config.wwwIndexHtml !== undefined) {
        deprecatedConfigs.push('wwwIndexHtml');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www' };
            config.outputTargets.push(o);
        }
        o.indexHtml = config.wwwIndexHtml;
        delete config.wwwIndexHtml;
    }
    if (config.generateDistribution !== undefined) {
        deprecatedConfigs.push('generateDistribution');
        if (config.generateDistribution) {
            config.outputTargets = config.outputTargets || [];
            let o = config.outputTargets.find(o => o.type === 'dist');
            if (!o) {
                o = { type: 'dist' };
                config.outputTargets.push(o);
            }
        }
        delete config.generateDistribution;
    }
    if (config.distDir !== undefined) {
        deprecatedConfigs.push('distDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'dist');
        if (!o) {
            o = { type: 'dist' };
            config.outputTargets.push(o);
        }
        o.dir = config.distDir;
        delete config.distDir;
    }
    if (config.emptyDist !== undefined) {
        deprecatedConfigs.push('emptyDist');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'dist');
        if (!o) {
            o = { type: 'dist' };
            config.outputTargets.push(o);
        }
        o.empty = !!config.emptyDist;
        delete config.emptyDist;
    }
    if (config.collectionDir !== undefined) {
        deprecatedConfigs.push('collectionDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'dist');
        if (!o) {
            o = { type: 'dist' };
            config.outputTargets.push(o);
        }
        o.dir = config.collectionDir;
        delete config.collectionDir;
    }
    if (config.typesDir !== undefined) {
        deprecatedConfigs.push('typesDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'dist');
        if (!o) {
            o = { type: 'dist' };
            config.outputTargets.push(o);
        }
        o.dir = config.typesDir;
        delete config.typesDir;
    }
    if (config.publicPath !== undefined) {
        deprecatedConfigs.push('publicPath');
        config.outputTargets = config.outputTargets || [];
        const www = config.outputTargets.find(o => o.type === 'www');
        if (www) {
            www.resourcesUrl = config.publicPath;
        }
        delete config.publicPath;
    }
    if (config.serviceWorker !== undefined) {
        deprecatedConfigs.push('serviceWorker');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www', serviceWorker: config.serviceWorker };
            config.outputTargets.push(o);
        }
        else {
            o.serviceWorker = config.serviceWorker;
        }
        delete config.serviceWorker;
    }
    if (config.prerender !== undefined) {
        deprecatedConfigs.push('prerender');
        delete config.prerender;
    }
    if (deprecatedConfigs.length > 0) {
        const warningMsg = [
            `As of v0.7.0, the config `,
            deprecatedConfigs.length > 1 ? `properties ` : `property `,
            `"${deprecatedConfigs.join(', ')}" `,
            deprecatedConfigs.length > 1 ? `have ` : `has `,
            `been deprecated in favor of a multiple output target configuration. `,
            `Please use the "outputTargets" config which `,
            `is an array of output targets. `,
            `Note that not having an "outputTarget" config will default `,
            `to have an { type: "www" } output target. `,
            `More information aobut the new format can be found here: https://stenciljs.com/docs/config`
        ];
        config.logger.warn(warningMsg.join(''));
    }
    return deprecatedConfigs;
}

function validateOutputTargets(config) {
    // setup outputTargets from deprecated config properties
    _deprecatedToMultipleTarget(config);
    if (Array.isArray(config.outputTargets)) {
        config.outputTargets.forEach(outputTarget => {
            if (typeof outputTarget.type !== 'string') {
                outputTarget.type = 'www';
            }
            outputTarget.type = outputTarget.type.trim().toLowerCase();
            if (!VALID_TYPES.includes(outputTarget.type)) {
                throw new Error(`invalid outputTarget type "${outputTarget.type}". Valid target types: ${VALID_TYPES.join(', ')}`);
            }
        });
    }
    validateOutputTargetWww(config);
    validateOutputTargetDist(config);
    validateOutputTargetAngular(config);
    validateDocs(config);
    validateStats(config);
    if (!config.outputTargets || config.outputTargets.length === 0) {
        throw new Error(`outputTarget required`);
    }
    config.outputTargets.forEach(outputTarget => {
        validateResourcesUrl(outputTarget);
        validateServiceWorker(config, outputTarget);
    });
}
const VALID_TYPES = ['angular', 'dist', 'docs', 'stats', 'www'];

function validatePaths(config) {
    const path$$1 = config.sys.path;
    if (typeof config.globalScript === 'string' && !path$$1.isAbsolute(config.globalScript)) {
        if (!path$$1.isAbsolute(config.globalScript)) {
            config.globalScript = path$$1.join(config.rootDir, config.globalScript);
        }
        config.globalScript = normalizePath(config.globalScript);
    }
    if (Array.isArray(config.globalStyle)) {
        // DEPRECATED 2018-05-31
        config.logger.warn(`"globalStyle" config no longer accepts an array. Please update to only use a single entry point for a global style css file.`);
        if (config.globalStyle.length > 0) {
            config.globalStyle = config.globalStyle[0];
        }
    }
    if (typeof config.globalStyle === 'string') {
        if (!path$$1.isAbsolute(config.globalStyle)) {
            config.globalStyle = path$$1.join(config.rootDir, config.globalStyle);
        }
        config.globalStyle = normalizePath(config.globalStyle);
    }
    setStringConfig(config, 'srcDir', DEFAULT_SRC_DIR);
    if (!path$$1.isAbsolute(config.srcDir)) {
        config.srcDir = path$$1.join(config.rootDir, config.srcDir);
    }
    config.srcDir = normalizePath(config.srcDir);
    setStringConfig(config, 'cacheDir', DEFAULT_CACHE_DIR);
    if (!path$$1.isAbsolute(config.cacheDir)) {
        config.cacheDir = path$$1.join(config.rootDir, config.cacheDir);
    }
    config.cacheDir = normalizePath(config.cacheDir);
    setStringConfig(config, 'tsconfig', DEFAULT_TSCONFIG);
    if (!path$$1.isAbsolute(config.tsconfig)) {
        config.tsconfig = path$$1.join(config.rootDir, config.tsconfig);
    }
    config.tsconfig = normalizePath(config.tsconfig);
    setStringConfig(config, 'srcIndexHtml', normalizePath(path$$1.join(config.srcDir, DEFAULT_INDEX_HTML$1)));
    if (!path$$1.isAbsolute(config.srcIndexHtml)) {
        config.srcIndexHtml = path$$1.join(config.rootDir, config.srcIndexHtml);
    }
    config.srcIndexHtml = normalizePath(config.srcIndexHtml);
    if (config.writeLog) {
        setStringConfig(config, 'buildLogFilePath', DEFAULT_BUILD_LOG_FILE_NAME);
        if (!path$$1.isAbsolute(config.buildLogFilePath)) {
            config.buildLogFilePath = path$$1.join(config.rootDir, config.buildLogFilePath);
        }
        config.buildLogFilePath = normalizePath(config.buildLogFilePath);
        config.logger.buildLogFilePath = config.buildLogFilePath;
    }
}
const DEFAULT_BUILD_LOG_FILE_NAME = 'stencil-build.log';
const DEFAULT_CACHE_DIR = '.stencil';
const DEFAULT_INDEX_HTML$1 = 'index.html';
const DEFAULT_SRC_DIR = 'src';
const DEFAULT_TSCONFIG = 'tsconfig.json';

function validatePlugins(config) {
    config.plugins = (config.plugins || []).filter(p => !!p);
}

function validateWorkers(config) {
    let cpus = 1;
    if (config.sys && config.sys.details && typeof config.sys.details.cpus === 'number') {
        cpus = config.sys.details.cpus;
    }
    if (typeof config.maxConcurrentWorkers !== 'number') {
        config.maxConcurrentWorkers = cpus;
    }
    if (config.flags && typeof config.flags.maxWorkers === 'number') {
        config.maxConcurrentWorkers = config.flags.maxWorkers;
    }
    config.maxConcurrentWorkers = Math.max(Math.min(config.maxConcurrentWorkers, cpus), 1);
    if (typeof config.maxConcurrentTasksPerWorker !== 'number') {
        config.maxConcurrentTasksPerWorker = DEFAULT_MAX_TASKS_PER_WORKER;
    }
    config.maxConcurrentTasksPerWorker = Math.max(Math.min(config.maxConcurrentTasksPerWorker, 20), 1);
}
const DEFAULT_MAX_TASKS_PER_WORKER = 2;

function validateRollupConfig(config) {
    const cleanRollupConfig = getCleanRollupConfig(config.rollupConfig);
    config.rollupConfig = cleanRollupConfig;
}
function getCleanRollupConfig(rollupConfig) {
    let cleanRollupConfig = DEFAULT_ROLLUP_CONFIG;
    if (!rollupConfig || !isObject(rollupConfig)) {
        return cleanRollupConfig;
    }
    if (rollupConfig.inputOptions && isObject(rollupConfig.inputOptions)) {
        cleanRollupConfig = Object.assign({}, cleanRollupConfig, { inputOptions: pluck(rollupConfig.inputOptions, ['context', 'moduleContext']) });
    }
    if (rollupConfig.outputOptions && isObject(rollupConfig.outputOptions)) {
        cleanRollupConfig = Object.assign({}, cleanRollupConfig, { outputOptions: pluck(rollupConfig.outputOptions, ['globals']) });
    }
    return cleanRollupConfig;
}
const DEFAULT_ROLLUP_CONFIG = {
    inputOptions: {},
    outputOptions: {}
};

/**
 * DEPRECATED "config.collections" since 0.6.0, 2018-02-13
 */
function _deprecatedValidateConfigCollections(config) {
    if (!Array.isArray(config.collections)) {
        return;
    }
    const deprecatedCollections = config.collections;
    if (deprecatedCollections.length > 0) {
        const errorMsg = [
            `As of v0.6.0, "config.collections" has been deprecated in favor of standard ES module imports. `,
            `Instead of listing collections within the stencil config, collections should now be `,
            `imported by the app's root component or module. The benefit of this is to not only simplify `,
            `the config by using a standards approach for imports, but to also automatically import the `,
            `collection's types to improve development. Please remove "config.collections" `,
            `from the "stencil.config.js" file, and add `,
            deprecatedCollections.length === 1 ? `this import ` : `these imports `,
            `to your root component or root module:  `
        ];
        deprecatedCollections.forEach(collection => {
            errorMsg.push(`import '${collection.name}';  `);
        });
        config.logger.error(errorMsg.join(''));
    }
}

function validateConfig(config, setEnvVariables) {
    if (!config) {
        throw new Error(`invalid build config`);
    }
    if (config._isValidated) {
        // don't bother if we've already validated this config
        return config;
    }
    if (!config.logger) {
        throw new Error(`config.logger required`);
    }
    if (!config.rootDir) {
        throw new Error('config.rootDir required');
    }
    if (!config.sys) {
        throw new Error('config.sys required');
    }
    config.flags = config.flags || {};
    if (config.flags.debug) {
        config.logLevel = 'debug';
    }
    else if (config.flags.logLevel) {
        config.logLevel = config.flags.logLevel;
    }
    else if (typeof config.logLevel !== 'string') {
        config.logLevel = 'info';
    }
    config.logger.level = config.logLevel;
    setBooleanConfig(config, 'writeLog', 'log', false);
    setBooleanConfig(config, 'buildAppCore', null, true);
    // default devMode false
    if (config.flags.prod) {
        config.devMode = false;
    }
    else if (config.flags.dev) {
        config.devMode = true;
    }
    else {
        setBooleanConfig(config, 'devMode', null, DEFAULT_DEV_MODE);
    }
    // get a good namespace
    validateNamespace$1(config);
    // figure out all of the config paths and absolute paths
    validatePaths(config);
    // setup the outputTargets
    validateOutputTargets(config);
    // validate how many workers we can use
    validateWorkers(config);
    // default devInspector to whatever devMode is
    setBooleanConfig(config, 'devInspector', null, config.devMode);
    // default watch false
    setBooleanConfig(config, 'watch', 'watch', false);
    setBooleanConfig(config, 'minifyCss', null, !config.devMode);
    setBooleanConfig(config, 'minifyJs', null, !config.devMode);
    setBooleanConfig(config, 'buildEs5', 'es5', !config.devMode);
    setBooleanConfig(config, 'hashFileNames', null, !(config.devMode || config.watch));
    setNumberConfig(config, 'hashedFileNameLength', null, DEFAULT_HASHED_FILENAME_LENTH);
    if (config.hashFileNames) {
        if (config.hashedFileNameLength < MIN_HASHED_FILENAME_LENTH) {
            throw new Error(`config.hashedFileNameLength must be at least ${MIN_HASHED_FILENAME_LENTH} characters`);
        }
        if (config.hashedFileNameLength > MAX_HASHED_FILENAME_LENTH) {
            throw new Error(`config.hashedFileNameLength cannot be more than ${MAX_HASHED_FILENAME_LENTH} characters`);
        }
    }
    validateCopy(config);
    validatePlugins(config);
    validateAssetVerioning(config);
    validateDevServer(config);
    if (!config.watchIgnoredRegex) {
        config.watchIgnoredRegex = DEFAULT_WATCH_IGNORED_REGEX;
    }
    setStringConfig(config, 'hydratedCssClass', DEFAULT_HYDRATED_CSS_CLASS);
    setBooleanConfig(config, 'generateDocs', 'docs', false);
    setBooleanConfig(config, 'enableCache', 'cache', true);
    if (!Array.isArray(config.includeSrc)) {
        config.includeSrc = DEFAULT_INCLUDES.map(include => {
            return config.sys.path.join(config.srcDir, include);
        });
    }
    if (!Array.isArray(config.excludeSrc)) {
        config.excludeSrc = DEFAULT_EXCLUDES.slice();
    }
    /**
     * DEPRECATED "config.collections" since 0.6.0, 2018-02-13
     */
    _deprecatedValidateConfigCollections(config);
    setArrayConfig(config, 'plugins');
    setArrayConfig(config, 'bundles');
    // set to true so it doesn't bother going through all this again on rebuilds
    config._isValidated = true;
    if (setEnvVariables !== false) {
        setProcessEnvironment(config);
    }
    validateRollupConfig(config);
    return config;
}
function setProcessEnvironment(config) {
    process.env.NODE_ENV = config.devMode ? 'development' : 'production';
}
const DEFAULT_DEV_MODE = false;
const DEFAULT_HASHED_FILENAME_LENTH = 8;
const MIN_HASHED_FILENAME_LENTH = 4;
const MAX_HASHED_FILENAME_LENTH = 32;
const DEFAULT_INCLUDES = ['**/*.ts', '**/*.tsx'];
const DEFAULT_EXCLUDES = ['**/test/**', '**/*.spec.*'];
const DEFAULT_WATCH_IGNORED_REGEX = /(?:^|[\\\/])(\.(?!\.)[^\\\/]+)$/i;
const DEFAULT_HYDRATED_CSS_CLASS = 'hydrated';

var __awaiter$C = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Renderer {
    constructor(config, registry, ctx, outputTarget) {
        this.config = config;
        this.config = validateConfig(config);
        // do not allow more than one worker when prerendering
        config.sys.initWorkers(1, 1);
        // init the build context
        this.ctx = getCompilerCtx(config, ctx);
        this.outputTarget = outputTarget || config.outputTargets.find(o => o.type === 'www');
        // load the component registry from the registry.json file
        this.cmpRegistry = registry || loadComponentRegistry(config, this.ctx, this.outputTarget);
        if (Object.keys(this.cmpRegistry).length === 0) {
            throw new Error(`No registered components found: ${config.namespace}`);
        }
        // load the app global file into the context
        loadAppGlobal(config, this.ctx, this.outputTarget);
    }
    hydrate(hydrateOpts) {
        return __awaiter$C(this, void 0, void 0, function* () {
            let hydrateResults;
            // kick off hydrated, which is an async opertion
            try {
                hydrateResults = yield hydrateHtml(this.config, this.ctx, this.outputTarget, this.cmpRegistry, hydrateOpts);
            }
            catch (e) {
                hydrateResults = {
                    url: hydrateOpts.path,
                    diagnostics: [],
                    html: hydrateOpts.html,
                    styles: null,
                    anchors: [],
                    components: [],
                    styleUrls: [],
                    scriptUrls: [],
                    imgUrls: []
                };
                catchError(hydrateResults.diagnostics, e);
            }
            return hydrateResults;
        });
    }
    get fs() {
        return this.ctx.fs;
    }
    destroy() {
        if (this.config && this.config.sys && this.config.sys.destroy) {
            this.config.sys.destroy();
        }
    }
}
function loadAppGlobal(config, compilerCtx, outputTarget) {
    compilerCtx.appFiles = compilerCtx.appFiles || {};
    if (compilerCtx.appFiles.global) {
        // already loaded the global js content
        return;
    }
    // let's load the app global js content
    const appGlobalPath = getGlobalJsBuildPath(config, outputTarget);
    try {
        compilerCtx.appFiles.global = compilerCtx.fs.readFileSync(appGlobalPath);
    }
    catch (e) {
        config.logger.debug(`missing app global: ${appGlobalPath}`);
    }
}

var __awaiter$D = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function prerenderPath(config, compilerCtx, buildCtx, outputTarget, indexSrcHtml, prerenderLocation) {
    return __awaiter$D(this, void 0, void 0, function* () {
        const msg = outputTarget.hydrateComponents ? 'prerender' : 'optimize html';
        const timeSpan = buildCtx.createTimeSpan(`${msg}, started: ${prerenderLocation.path}`);
        const results = {
            diagnostics: []
        };
        try {
            // create the renderer config
            const rendererConfig = Object.assign({}, config);
            // create the hydrate options from the prerender config
            const hydrateOpts = {};
            hydrateOpts.url = prerenderLocation.url;
            hydrateOpts.isPrerender = true;
            hydrateOpts.timestamp = buildCtx.timestamp;
            // set the input html which we just read from the src index html file
            hydrateOpts.html = indexSrcHtml;
            // create a server-side renderer
            const renderer = new Renderer(rendererConfig, null, compilerCtx, outputTarget);
            // parse the html to dom nodes, hydrate the components, then
            // serialize the hydrated dom nodes back to into html
            const hydratedResults = yield renderer.hydrate(hydrateOpts);
            // hydrating to string is done!!
            // let's use this updated html for the index content now
            Object.assign(results, hydratedResults);
        }
        catch (e) {
            // ahh man! what happened!
            catchError(buildCtx.diagnostics, e);
        }
        timeSpan.finish(`${msg}, finished: ${prerenderLocation.path}`);
        return results;
    });
}

var __awaiter$E = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function prerenderOutputTargets(config, compilerCtx, buildCtx, entryModules) {
    return __awaiter$E(this, void 0, void 0, function* () {
        if (!config.srcIndexHtml) {
            return;
        }
        const outputTargets = config.outputTargets.filter(o => {
            return o.type === 'www' && o.indexHtml;
        });
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$E(this, void 0, void 0, function* () {
            if (outputTarget.hydrateComponents && outputTarget.prerenderLocations && outputTarget.prerenderLocations.length > 0) {
                yield prerenderOutputTarget(config, compilerCtx, buildCtx, outputTarget, entryModules);
            }
            else {
                const windowLocationPath = outputTarget.baseUrl;
                yield optimizeIndexHtml(config, compilerCtx, outputTarget, windowLocationPath, buildCtx.diagnostics);
            }
        })));
    });
}
function prerenderOutputTarget(config, compilerCtx, buildCtx, outputTarget, entryModules) {
    return __awaiter$E(this, void 0, void 0, function* () {
        // if there was src index.html file, then the process before this one
        // would have already loaded and updated the src index to its www path
        // get the www index html content for the template for all prerendered pages
        let indexHtml = null;
        try {
            indexHtml = yield compilerCtx.fs.readFile(outputTarget.indexHtml);
        }
        catch (e) { }
        if (typeof indexHtml !== 'string') {
            // looks like we don't have an index html file, which is fine
            buildCtx.debug(`prerenderApp, missing index.html for prerendering`);
            return [];
        }
        // get the prerender urls to queue up
        const prerenderQueue = getPrerenderQueue(config, outputTarget);
        if (!prerenderQueue.length) {
            const d = buildWarn(buildCtx.diagnostics);
            d.messageText = `No urls found in the prerender config`;
            return [];
        }
        return runPrerenderApp(config, compilerCtx, buildCtx, outputTarget, entryModules, prerenderQueue, indexHtml);
    });
}
function runPrerenderApp(config, compilerCtx, buildCtx, outputTarget, entryModules, prerenderQueue, indexHtml) {
    return __awaiter$E(this, void 0, void 0, function* () {
        // keep track of how long the entire build process takes
        const timeSpan = buildCtx.createTimeSpan(`prerendering started`, !outputTarget.hydrateComponents);
        const hydrateResults = [];
        try {
            yield new Promise(resolve => {
                drainPrerenderQueue(config, compilerCtx, buildCtx, outputTarget, prerenderQueue, indexHtml, hydrateResults, resolve);
            });
            yield generateHostConfig(config, compilerCtx, outputTarget, entryModules, hydrateResults);
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
        hydrateResults.forEach(hydrateResult => {
            hydrateResult.diagnostics.forEach(diagnostic => {
                buildCtx.diagnostics.push(diagnostic);
            });
        });
        if (hasError(buildCtx.diagnostics)) {
            timeSpan.finish(`prerendering failed`);
        }
        else {
            timeSpan.finish(`prerendered urls: ${hydrateResults.length}`);
        }
        if (compilerCtx.localPrerenderServer) {
            compilerCtx.localPrerenderServer.close();
            delete compilerCtx.localPrerenderServer;
        }
        return hydrateResults;
    });
}
function drainPrerenderQueue(config, compilerCtx, buildCtx, outputTarget, prerenderQueue, indexSrcHtml, hydrateResults, resolve) {
    for (var i = 0; i < outputTarget.prerenderMaxConcurrent; i++) {
        const activelyProcessingCount = prerenderQueue.filter(p => p.status === 'processing').length;
        if (activelyProcessingCount >= outputTarget.prerenderMaxConcurrent) {
            // whooaa, slow down there buddy, let's not get carried away
            break;
        }
        runNextPrerenderUrl(config, compilerCtx, buildCtx, outputTarget, prerenderQueue, indexSrcHtml, hydrateResults, resolve);
    }
    const remaining = prerenderQueue.filter(p => {
        return p.status === 'processing' || p.status === 'pending';
    }).length;
    if (remaining === 0) {
        // we're not actively processing anything
        // and there aren't anymore urls in the queue to be prerendered
        // so looks like our job here is done, good work team
        resolve();
    }
}
function runNextPrerenderUrl(config, compilerCtx, buildCtx, outputTarget, prerenderQueue, indexSrcHtml, hydrateResults, resolve) {
    return __awaiter$E(this, void 0, void 0, function* () {
        const p = prerenderQueue.find(p => p.status === 'pending');
        if (!p)
            return;
        // we've got a url that's pending
        // well guess what, it's go time
        p.status = 'processing';
        try {
            // prender this path and wait on the results
            const results = yield prerenderPath(config, compilerCtx, buildCtx, outputTarget, indexSrcHtml, p);
            // awesome!!
            if (outputTarget.prerenderUrlCrawl) {
                crawlAnchorsForNextUrls(config, outputTarget, prerenderQueue, results.url, results.anchors);
            }
            hydrateResults.push(results);
            yield writePrerenderDest(config, compilerCtx, outputTarget, results);
        }
        catch (e) {
            // darn, idk, bad news
            catchError(buildCtx.diagnostics, e);
        }
        // this job is not complete
        p.status = 'complete';
        // let's try to drain the queue again and let this
        // next call figure out if we're actually done or not
        drainPrerenderQueue(config, compilerCtx, buildCtx, outputTarget, prerenderQueue, indexSrcHtml, hydrateResults, resolve);
    });
}
function writePrerenderDest(config, compilerCtx, outputTarget, results) {
    return __awaiter$E(this, void 0, void 0, function* () {
        // create the full path where this will be saved
        const filePath = getWritePathFromUrl(config, outputTarget, results.url);
        // add the prerender html content it to our collection of
        // files that need to be saved when we're all ready
        yield compilerCtx.fs.writeFile(filePath, results.html, { useCache: false });
        // write the files now
        // and since we're not using cache it'll free up its memory
        yield compilerCtx.fs.commit();
    });
}

var __awaiter$F = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function buildAuxiliaries(config, compilerCtx, buildCtx, entryModules, cmpRegistry) {
    return __awaiter$F(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        // let's prerender this first
        // and run service workers on top of this when it's done
        yield prerenderOutputTargets(config, compilerCtx, buildCtx, entryModules);
        // generate component docs
        // and service workers can run in parallel
        yield Promise.all([
            generateDocs(config, compilerCtx),
            generateServiceWorkers(config, compilerCtx, buildCtx),
            generateProxies$1(config, compilerCtx, cmpRegistry)
        ]);
        if (!buildCtx.hasError && buildCtx.isActiveBuild) {
            yield compilerCtx.fs.commit();
        }
    });
}

function getComponentAssetsCopyTasks(config, compilerCtx, buildCtx, entryModules, filesChanged) {
    const copyTasks = [];
    if (canSkipAssetsCopy(config, compilerCtx, entryModules, filesChanged)) {
        // no need to recopy all assets again
        return copyTasks;
    }
    const outputTargets = config.outputTargets.filter(outputTarget => {
        return outputTarget.appBuild;
    });
    if (outputTargets.length === 0) {
        return copyTasks;
    }
    // get a list of all the directories to copy
    // these paths should be absolute
    const copyToBuildDir = [];
    const copyToCollectionDir = [];
    entryModules.forEach(entryModule => {
        const moduleFiles = entryModule.moduleFiles.filter(m => {
            return m.cmpMeta.assetsDirsMeta && m.cmpMeta.assetsDirsMeta.length;
        });
        moduleFiles.forEach(moduleFile => {
            moduleFile.cmpMeta.assetsDirsMeta.forEach(assetsMeta => {
                copyToBuildDir.push(assetsMeta);
                if (!moduleFile.excludeFromCollection && !moduleFile.isCollectionDependency) {
                    copyToCollectionDir.push(assetsMeta);
                }
            });
        });
    });
    // copy all of the files in asset directories to the app's build and/or dist directory
    copyToBuildDir.forEach(assetsMeta => {
        // figure out what the path is to the component directory
        outputTargets.forEach(outputTarget => {
            const buildDirDestination = pathJoin(config, getAppBuildDir(config, outputTarget), assetsMeta.cmpRelativePath);
            copyTasks.push({
                src: assetsMeta.absolutePath,
                dest: buildDirDestination
            });
        });
    });
    outputTargets.forEach(outputTarget => {
        if (outputTarget.collectionDir) {
            // copy all of the files in asset directories to the app's collection directory
            copyToCollectionDir.forEach(assetsMeta => {
                // figure out what the path is to the component directory
                const collectionDirDestination = pathJoin(config, outputTarget.collectionDir, config.sys.path.relative(config.srcDir, assetsMeta.absolutePath));
                copyTasks.push({
                    src: assetsMeta.absolutePath,
                    dest: collectionDirDestination
                });
            });
        }
    });
    buildCtx.debug(`getComponentAssetsCopyTasks: ${copyTasks.length}`);
    return copyTasks;
}
function canSkipAssetsCopy(config, compilerCtx, entryModules, filesChanged) {
    if (!compilerCtx.hasSuccessfulBuild) {
        // always copy assets if we haven't had a successful build yet
        // cannot skip build
        return false;
    }
    // assume we want to skip copying assets again
    let shouldSkipAssetsCopy = true;
    // loop through each of the changed files
    filesChanged.forEach(changedFile => {
        // get the directory of where the changed file is in
        const changedFileDirPath = normalizePath(config.sys.path.dirname(changedFile));
        // loop through all the possible asset directories
        entryModules.forEach(entryModule => {
            entryModule.moduleFiles.forEach(moduleFile => {
                if (moduleFile.cmpMeta && moduleFile.cmpMeta.assetsDirsMeta) {
                    // loop through each of the asset directories of each component
                    moduleFile.cmpMeta.assetsDirsMeta.forEach(assetsDir => {
                        // get the absolute of the asset directory
                        const assetDirPath = normalizePath(assetsDir.absolutePath);
                        // if the changed file directory is this asset directory
                        // then we should recopy everything over again
                        if (changedFileDirPath === assetDirPath) {
                            shouldSkipAssetsCopy = false;
                            return;
                        }
                    });
                }
            });
        });
    });
    return shouldSkipAssetsCopy;
}

var __awaiter$G = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getConfigCopyTasks(config, buildCtx) {
    return __awaiter$G(this, void 0, void 0, function* () {
        const copyTasks = [];
        if (!Array.isArray(config.copy)) {
            return copyTasks;
        }
        if (buildCtx.isRebuild && !buildCtx.hasCopyChanges) {
            // don't bother copying if this was from a watch change
            // but the change didn't include any copy task files
            return copyTasks;
        }
        try {
            yield Promise.all(config.copy.map((copyTask) => __awaiter$G(this, void 0, void 0, function* () {
                yield processCopyTasks(config, copyTasks, copyTask);
            })));
        }
        catch (e) {
            const err = buildError(buildCtx.diagnostics);
            err.messageText = e.message;
        }
        buildCtx.debug(`getConfigCopyTasks: ${copyTasks.length}`);
        return copyTasks;
    });
}
function processCopyTasks(config, allCopyTasks, copyTask) {
    return __awaiter$G(this, void 0, void 0, function* () {
        if (!copyTask) {
            // possible null was set, which is fine, just skip over this one
            return;
        }
        if (!copyTask.src) {
            throw new Error(`copy missing "src" property`);
        }
        if (copyTask.dest && config.sys.isGlob(copyTask.dest)) {
            throw new Error(`copy "dest" property cannot be a glob: ${copyTask.dest}`);
        }
        const outputTargets = config.outputTargets.filter(outputTarget => {
            return outputTarget.appBuild;
        });
        if (config.sys.isGlob(copyTask.src)) {
            const copyTasks = yield processGlob(config, outputTargets, copyTask);
            allCopyTasks.push(...copyTasks);
            return;
        }
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$G(this, void 0, void 0, function* () {
            if (outputTarget.collectionDir) {
                yield processCopyTaskDestDir(config, allCopyTasks, copyTask, outputTarget.collectionDir);
            }
            else {
                yield processCopyTaskDestDir(config, allCopyTasks, copyTask, outputTarget.dir);
            }
        })));
    });
}
function processCopyTaskDestDir(config, allCopyTasks, copyTask, destAbsDir) {
    return __awaiter$G(this, void 0, void 0, function* () {
        const processedCopyTask = {
            src: getSrcAbsPath(config, copyTask.src),
            dest: getDestAbsPath(config, copyTask.src, destAbsDir, copyTask.dest)
        };
        if (typeof copyTask.warn === 'boolean') {
            processedCopyTask.warn = copyTask.warn;
        }
        allCopyTasks.push(processedCopyTask);
    });
}
function processGlob(config, outputTargets, copyTask) {
    return __awaiter$G(this, void 0, void 0, function* () {
        const globCopyTasks = [];
        const globOpts = {
            cwd: config.srcDir,
            nodir: true
        };
        const files = yield config.sys.glob(copyTask.src, globOpts);
        files.forEach(globRelPath => {
            outputTargets.forEach(outputTarget => {
                if (outputTarget.collectionDir) {
                    globCopyTasks.push(createGlobCopyTask(config, copyTask, outputTarget.collectionDir, globRelPath));
                }
                else {
                    globCopyTasks.push(createGlobCopyTask(config, copyTask, outputTarget.dir, globRelPath));
                }
            });
        });
        return globCopyTasks;
    });
}
function createGlobCopyTask(config, copyTask, destDir, globRelPath) {
    const processedCopyTask = {
        src: config.sys.path.join(config.srcDir, globRelPath),
    };
    if (copyTask.dest) {
        if (config.sys.path.isAbsolute(copyTask.dest)) {
            processedCopyTask.dest = config.sys.path.join(copyTask.dest, config.sys.path.basename(globRelPath));
        }
        else {
            processedCopyTask.dest = config.sys.path.join(destDir, copyTask.dest, config.sys.path.basename(globRelPath));
        }
    }
    else {
        processedCopyTask.dest = config.sys.path.join(destDir, globRelPath);
    }
    return processedCopyTask;
}
function getSrcAbsPath(config, src) {
    if (config.sys.path.isAbsolute(src)) {
        return src;
    }
    return config.sys.path.join(config.srcDir, src);
}
function getDestAbsPath(config, src, destAbsPath, destRelPath) {
    if (destRelPath) {
        if (config.sys.path.isAbsolute(destRelPath)) {
            return destRelPath;
        }
        else {
            return config.sys.path.join(destAbsPath, destRelPath);
        }
    }
    if (config.sys.path.isAbsolute(src)) {
        throw new Error(`copy task, "to" property must exist if "from" property is an absolute path: ${src}`);
    }
    return config.sys.path.join(destAbsPath, src);
}
function isCopyTaskFile(config, filePath) {
    if (!Array.isArray(config.copy)) {
        // there is no copy config
        return false;
    }
    filePath = normalizePath(filePath);
    // go through all the copy tasks and see if this path matches
    for (let i = 0; i < config.copy.length; i++) {
        var copySrc = config.copy[i].src;
        if (config.sys.isGlob(copySrc)) {
            // test the glob
            copySrc = config.sys.path.join(config.srcDir, copySrc);
            if (config.sys.minimatch(filePath, copySrc)) {
                return true;
            }
        }
        else {
            copySrc = normalizePath(getSrcAbsPath(config, copySrc));
            if (!config.sys.path.relative(copySrc, filePath).startsWith('.')) {
                return true;
            }
        }
    }
    return false;
}

var __awaiter$H = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function copyTasksMain(config, compilerCtx, buildCtx, entryModules) {
    return __awaiter$H(this, void 0, void 0, function* () {
        try {
            const cmpAssetsCopyTasks = getComponentAssetsCopyTasks(config, compilerCtx, buildCtx, entryModules, buildCtx.filesChanged);
            const configCopyTasks = yield getConfigCopyTasks(config, buildCtx);
            const copyTasks = [
                ...configCopyTasks,
                ...cmpAssetsCopyTasks
            ];
            if (copyTasks.length > 0) {
                const timeSpan = buildCtx.createTimeSpan(`copyTasks started`, true);
                const copyResults = yield config.sys.copy(copyTasks);
                buildCtx.diagnostics.push(...copyResults.diagnostics);
                compilerCtx.fs.cancelDeleteDirectoriesFromDisk(copyResults.dirPaths);
                compilerCtx.fs.cancelDeleteFilesFromDisk(copyResults.filePaths);
                timeSpan.finish(`copyTasks finished`);
            }
        }
        catch (e) {
            const err = buildError(buildCtx.diagnostics);
            err.messageText = e.message;
        }
    });
}

var __awaiter$I = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function emptyOutputTargetDirs(config, compilerCtx, buildCtx) {
    return __awaiter$I(this, void 0, void 0, function* () {
        if (buildCtx.isRebuild) {
            // only empty the directories on the first build
            return;
        }
        // let's empty out the build dest directory
        const outputTargets = config.outputTargets.filter(o => o.empty === true);
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$I(this, void 0, void 0, function* () {
            buildCtx.debug(`empty dir: ${outputTarget.dir}`);
            // Check if there is a .gitkeep file
            // We want to keep it so people don't have to readd manually
            // to their projects each time.
            const gitkeepPath = config.sys.path.join(outputTarget.dir, '.gitkeep');
            const existsGitkeep = yield compilerCtx.fs.access(gitkeepPath);
            yield compilerCtx.fs.emptyDir(outputTarget.dir);
            // If there was a .gitkeep file, add it again.
            if (existsGitkeep) {
                yield compilerCtx.fs.writeFile(gitkeepPath, '', { immediateWrite: true });
            }
        })));
    });
}

function buildExpressionReplacer(config, input) {
    return input
        .replace(/process.env.NODE_ENV(\s*)(===|==)(\s*)['"`]production['"`]/g, (!config.devMode).toString())
        .replace(/process.env.NODE_ENV(\s*)(!==|!=)(\s*)['"`]development['"`]/g, (!config.devMode).toString())
        .replace(/process.env.NODE_ENV(\s*)(===|==)(\s*)['"`]development['"`]/g, (config.devMode).toString())
        .replace(/process.env.NODE_ENV(\s*)(!==|!=)(\s*)['"`]production['"`]/g, (config.devMode).toString());
}

function loadRollupDiagnostics(config, compilerCtx, buildCtx, rollupError) {
    const d = {
        level: 'error',
        type: 'bundling',
        language: 'javascript',
        code: rollupError.code,
        header: formatErrorCode(rollupError.code),
        messageText: rollupError.message,
        relFilePath: null,
        absFilePath: null,
        lines: []
    };
    if (rollupError.loc && rollupError.loc.file) {
        d.absFilePath = normalizePath(rollupError.loc.file);
        if (config) {
            d.relFilePath = normalizePath(config.sys.path.relative(config.cwd, d.absFilePath));
        }
        try {
            const sourceText = compilerCtx.fs.readFileSync(d.absFilePath);
            const srcLines = splitLineBreaks(sourceText);
            const errorLine = {
                lineIndex: rollupError.loc.line - 1,
                lineNumber: rollupError.loc.line,
                text: srcLines[rollupError.loc.line - 1],
                errorCharStart: rollupError.loc.column,
                errorLength: 0
            };
            d.lineNumber = errorLine.lineNumber;
            d.columnNumber = errorLine.errorCharStart;
            const highlightLine = errorLine.text.substr(rollupError.loc.column);
            for (var i = 0; i < highlightLine.length; i++) {
                if (CHAR_BREAK.indexOf(highlightLine.charAt(i)) > -1) {
                    break;
                }
                errorLine.errorLength++;
            }
            d.lines.push(errorLine);
            if (errorLine.errorLength === 0 && errorLine.errorCharStart > 0) {
                errorLine.errorLength = 1;
                errorLine.errorCharStart--;
            }
            if (errorLine.lineIndex > 0) {
                const previousLine = {
                    lineIndex: errorLine.lineIndex - 1,
                    lineNumber: errorLine.lineNumber - 1,
                    text: srcLines[errorLine.lineIndex - 1],
                    errorCharStart: -1,
                    errorLength: -1
                };
                d.lines.unshift(previousLine);
            }
            if (errorLine.lineIndex + 1 < srcLines.length) {
                const nextLine = {
                    lineIndex: errorLine.lineIndex + 1,
                    lineNumber: errorLine.lineNumber + 1,
                    text: srcLines[errorLine.lineIndex + 1],
                    errorCharStart: -1,
                    errorLength: -1
                };
                d.lines.push(nextLine);
            }
        }
        catch (e) {
            d.messageText = `Error parsing: ${rollupError.loc.file}, line: ${rollupError.loc.line}, column: ${rollupError.loc.column}`;
        }
    }
    buildCtx.diagnostics.push(d);
}
const CHAR_BREAK = [' ', '=', '.', ',', '?', ':', ';', '(', ')', '{', '}', '[', ']', '|', `'`, `"`, '`'];
function createOnWarnFn(config, diagnostics, bundleModulesFiles) {
    const previousWarns = {};
    return function onWarningMessage(warning) {
        if (!warning || warning.message in previousWarns) {
            return;
        }
        previousWarns[warning.message] = true;
        if (warning.code) {
            if (INGORE_WARNING_CODES.includes(warning.code)) {
                return;
            }
            if (SUPPRESS_WARNING_CODES.includes(warning.code)) {
                config.logger.debug(warning.message);
                return;
            }
        }
        let label = '';
        if (bundleModulesFiles) {
            label = bundleModulesFiles.map(moduleFile => moduleFile.cmpMeta.tagNameMeta).join(', ').trim();
            if (label.length) {
                label += ': ';
            }
        }
        buildWarn(diagnostics).messageText = label + (warning.message || warning);
    };
}
const INGORE_WARNING_CODES = [
    `THIS_IS_UNDEFINED`, `NON_EXISTENT_EXPORT`
];
const SUPPRESS_WARNING_CODES = [
    `CIRCULAR_DEPENDENCY`
];
function formatErrorCode(errorCode) {
    if (typeof errorCode === 'string') {
        return errorCode.split('_').map(c => {
            return toTitleCase(c.toLowerCase());
        }).join(' ');
    }
    return errorCode;
}

function getComponentRefsFromSourceStrings(moduleFiles) {
    const componentRefs = [];
    const tags = moduleFiles
        .filter(moduleFile => !!moduleFile.cmpMeta)
        .map(moduleFile => moduleFile.cmpMeta.tagNameMeta);
    moduleFiles.forEach(moduleFile => {
        moduleFile.potentialCmpRefs.forEach(potentialCmpRef => {
            parsePotentialComponentRef(componentRefs, tags, moduleFile, potentialCmpRef);
        });
    });
    return componentRefs;
}
function parsePotentialComponentRef(componentRefs, tags, moduleFile, potentialCmpRef) {
    if (typeof potentialCmpRef.tag === 'string') {
        potentialCmpRef.tag = potentialCmpRef.tag.toLowerCase();
        if (tags.some(tag => potentialCmpRef.tag === tag)) {
            // exact match, we're good
            // probably something like h('ion-button') or
            // document.createElement('ion-toggle');
            componentRefs.push({
                tag: potentialCmpRef.tag,
                filePath: moduleFile.sourceFilePath
            });
        }
    }
    else if (typeof potentialCmpRef.html === 'string') {
        // string could be HTML
        // could be something like elm.innerHTML = '<ion-button>';
        // replace any whitespace with a ~ character
        // this is especially important for newlines and tabs
        // for tag with attributes and has a newline in the tag
        potentialCmpRef.html = potentialCmpRef.html.toLowerCase().replace(/\s/g, '~');
        const foundTags = tags.filter(tag => {
            return potentialCmpRef.html.includes('<' + tag + '>') ||
                potentialCmpRef.html.includes('</' + tag + '>') ||
                potentialCmpRef.html.includes('<' + tag + '~');
        });
        foundTags.forEach(foundTag => {
            componentRefs.push({
                tag: foundTag,
                filePath: moduleFile.sourceFilePath
            });
        });
    }
}

function calcComponentDependencies(moduleFiles) {
    // figure out all the component references seen in each file
    // these are all the the components found in the app, and which file it was found in
    const componentRefs = getComponentRefsFromSourceStrings(moduleFiles);
    // go through all the module files in the app
    moduleFiles.forEach(moduleFile => {
        if (moduleFile.cmpMeta) {
            // if this module file has component metadata
            // then let's figure out which dependencies it has
            getComponentDependencies(moduleFiles, componentRefs, moduleFile);
        }
    });
}
function getComponentDependencies(moduleFiles, componentRefs, moduleFile) {
    // build a list of all the component dependencies this has, using their tag as the key
    moduleFile.cmpMeta.dependencies = moduleFile.cmpMeta.dependencies || [];
    // figure out if this file has any components in it
    // get all the component references for this file path
    const componentRefsOfFile = componentRefs.filter(cr => cr.filePath === moduleFile.sourceFilePath);
    // get the tags for the component references with this file path
    const refTags = componentRefsOfFile.map(cr => cr.tag);
    // for each component ref of this file
    // go ahead and add the tag to the cmp metadata dependencies
    refTags.forEach(tag => {
        if (tag !== moduleFile.cmpMeta.tagNameMeta && !moduleFile.cmpMeta.dependencies.includes(tag)) {
            moduleFile.cmpMeta.dependencies.push(tag);
        }
    });
    const importsInspected = [];
    getComponentDepsFromImports(moduleFiles, componentRefs, importsInspected, moduleFile, moduleFile.cmpMeta);
    moduleFile.cmpMeta.dependencies.sort();
}
function getComponentDepsFromImports(moduleFiles, componentRefs, importsInspected, inspectModuleFile, cmpMeta) {
    inspectModuleFile.localImports.forEach(localImport => {
        if (importsInspected.includes(localImport)) {
            return;
        }
        importsInspected.push(localImport);
        const subModuleFile = moduleFiles.find(moduleFile => {
            return (moduleFile.sourceFilePath === localImport) ||
                (moduleFile.sourceFilePath === localImport + '.ts') ||
                (moduleFile.sourceFilePath === localImport + '.tsx') ||
                (moduleFile.sourceFilePath === localImport + '.js');
        });
        if (subModuleFile) {
            const tags = componentRefs.filter(cr => cr.filePath === subModuleFile.sourceFilePath).map(cr => cr.tag);
            tags.forEach(tag => {
                if (!cmpMeta.dependencies.includes(tag)) {
                    cmpMeta.dependencies.push(tag);
                }
            });
            getComponentDepsFromImports(moduleFiles, componentRefs, importsInspected, subModuleFile, cmpMeta);
        }
    });
}

function processAppGraph(buildCtx, allModules, entryTags) {
    const graph = getGraph(buildCtx, allModules, entryTags);
    const entryPoints = [];
    for (const graphEntry of graph) {
        if (entryPoints.some(en => en.some(ec => ec.tag === graphEntry.tag))) {
            // already handled this one
            continue;
        }
        const depsOf = graph.filter(d => d.dependencies.includes(graphEntry.tag));
        if (depsOf.length > 1) {
            const commonEntryCmps = [];
            depsOf.forEach(depOf => {
                depOf.dependencies.forEach(depTag => {
                    if (depsOf.every(d => d.dependencies.includes(depTag))) {
                        const existingCommonEntryCmp = commonEntryCmps.find(ec => {
                            return ec.tag === depTag;
                        });
                        if (existingCommonEntryCmp) {
                            existingCommonEntryCmp.dependencyOf.push(depOf.tag);
                        }
                        else {
                            commonEntryCmps.push({
                                tag: depTag,
                                dependencyOf: [depOf.tag]
                            });
                        }
                    }
                });
            });
            const existingEntryPoint = entryPoints.find(ep => {
                return ep.some(ec => commonEntryCmps.some(cec => cec.tag === ec.tag));
            });
            if (existingEntryPoint) {
                const depsOf = graph.filter(d => d.dependencies.includes(graphEntry.tag));
                if (depsOf.length > 0) {
                    const existingEntryPointDepOf = entryPoints.find(ep => ep.some(ec => depsOf.some(d => d.dependencies.includes(ec.tag))));
                    if (existingEntryPointDepOf) {
                        existingEntryPointDepOf.push({
                            tag: graphEntry.tag,
                            dependencyOf: depsOf.map(d => d.tag)
                        });
                    }
                    else {
                        entryPoints.push([
                            {
                                tag: graphEntry.tag,
                                dependencyOf: []
                            }
                        ]);
                    }
                }
                else {
                    entryPoints.push([
                        {
                            tag: graphEntry.tag,
                            dependencyOf: []
                        }
                    ]);
                }
            }
            else {
                entryPoints.push(commonEntryCmps);
            }
        }
        else if (depsOf.length === 1) {
            const existingEntryPoint = entryPoints.find(ep => ep.some(ec => ec.tag === depsOf[0].tag));
            if (existingEntryPoint) {
                existingEntryPoint.push({
                    tag: graphEntry.tag,
                    dependencyOf: [depsOf[0].tag]
                });
            }
            else {
                entryPoints.push([
                    {
                        tag: depsOf[0].tag,
                        dependencyOf: []
                    },
                    {
                        tag: graphEntry.tag,
                        dependencyOf: [depsOf[0].tag]
                    }
                ]);
            }
        }
        else {
            entryPoints.push([
                {
                    tag: graphEntry.tag,
                    dependencyOf: []
                }
            ]);
        }
    }
    entryPoints.forEach(entryPoint => {
        entryPoint.forEach(entryCmp => {
            entryCmp.dependencyOf.sort();
        });
        entryPoint.sort((a, b) => {
            if (a.tag < b.tag)
                return -1;
            if (a.tag > b.tag)
                return 1;
            return 0;
        });
    });
    entryPoints.sort((a, b) => {
        if (a[0].tag < b[0].tag)
            return -1;
        if (a[0].tag > b[0].tag)
            return 1;
        return 0;
    });
    return entryPoints;
}
function getGraph(buildCtx, allModules, entryTags) {
    const graph = [];
    function addDeps(tag) {
        if (graph.some(d => d.tag === tag)) {
            return;
        }
        const m = allModules.find(m => m.cmpMeta && m.cmpMeta.tagNameMeta === tag);
        if (!m) {
            const diagnostic = buildError(buildCtx.diagnostics);
            diagnostic.messageText = `unable to find tag "${tag}" while generating component graph`;
            return;
        }
        m.cmpMeta.dependencies = (m.cmpMeta.dependencies || []);
        const dependencies = m.cmpMeta.dependencies.filter(t => t !== tag).sort();
        graph.push({
            tag: tag,
            dependencies: dependencies
        });
        dependencies.forEach(addDeps);
    }
    entryTags.forEach(addDeps);
    return graph;
}

function generateComponentEntries(buildCtx, allModules, userConfigEntryTags, appEntryTags) {
    // user config entry modules you leave as is
    // whatever the user put in the bundle is how it goes
    const entryPoints = [];
    // get all the config.bundle entry tags the user may have manually configured
    const userConfigEntryPoints = processUserConfigBundles(userConfigEntryTags);
    const hasUserConfigEntries = (userConfigEntryPoints.length > 0);
    // start out by adding all the user config entry points first
    entryPoints.push(...userConfigEntryPoints);
    // process all of the app's components not already found
    // in the config or the root html
    const appEntries = processAppComponentEntryTags(buildCtx, hasUserConfigEntries, allModules, entryPoints, appEntryTags);
    entryPoints.push(...appEntries);
    return entryPoints;
}
function processAppComponentEntryTags(buildCtx, hasUserConfigEntries, allModules, entryPoints, appEntryTags) {
    // remove any tags already found in user config
    appEntryTags = appEntryTags.filter(tag => !entryPoints.some(ep => ep.some(em => em.tag === tag)));
    if (hasUserConfigEntries && appEntryTags.length > 0) {
        appEntryTags.forEach(appEntryTag => {
            const warn = buildWarn(buildCtx.diagnostics);
            warn.header = `Stencil Config`;
            warn.messageText = `config.bundles does not include component tag "${appEntryTag}". When manually configurating config.bundles, all component tags used by this app must be listed in a component bundle.`;
        });
    }
    return processAppGraph(buildCtx, allModules, appEntryTags);
}
function processUserConfigBundles(userConfigEntryTags) {
    return userConfigEntryTags.map(entryTags => {
        return entryTags.map(entryTag => {
            const entryComponent = {
                tag: entryTag,
                dependencyOf: ['#config']
            };
            return entryComponent;
        });
    });
}

var __awaiter$J = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function autoprefixCssMain(config, compilerCtx, input, autoprefixConfig) {
    return __awaiter$J(this, void 0, void 0, function* () {
        if (typeof input !== 'string') {
            return input;
        }
        if (input === '') {
            return input;
        }
        const cacheKey = compilerCtx.cache.createKey('autoprefix', 'autoprefixer8.6.5_postcss6.0.210', input, autoprefixConfig);
        const cachedContent = yield compilerCtx.cache.get(cacheKey);
        if (cachedContent != null) {
            // let's use the cached data we already figured out
            return cachedContent;
        }
        const output = yield config.sys.autoprefixCss(input, autoprefixConfig);
        if (typeof output === 'string') {
            yield compilerCtx.cache.put(cacheKey, output);
        }
        return output;
    });
}

function parseStyleDocs(styleDocs, styleText) {
    if (typeof styleText !== 'string') {
        return;
    }
    let startIndex;
    while ((startIndex = styleText.indexOf(CSS_DOC_START)) > -1) {
        styleText = styleText.substring(startIndex + CSS_DOC_START.length);
        const endIndex = styleText.indexOf(CSS_DOC_END);
        if (endIndex === -1) {
            break;
        }
        const comment = styleText.substring(0, endIndex);
        parseCssComment(styleDocs, comment);
        styleText = styleText.substring(endIndex + CSS_DOC_END.length);
    }
}
function parseCssComment(styleDocs, comment) {
    /**
     * @prop --max-width: Max width of the alert
     */
    const lines = comment.split(/\r?\n/).map(line => {
        line = line.trim();
        while (line.startsWith('*')) {
            line = line.substring(1).trim();
        }
        return line;
    });
    comment = lines.join(' ').replace(/\t/g, ' ').trim();
    while (comment.includes('  ')) {
        comment = comment.replace('  ', ' ');
    }
    const docs = comment.split(CSS_PROP_ANNOTATION);
    docs.forEach(d => {
        const doc = d.trim();
        if (!doc.startsWith(`--`)) {
            return;
        }
        const splt = doc.split(`:`);
        const cssDoc = {
            name: splt[0].trim(),
            docs: (splt.shift() && splt.join(`:`)).trim(),
            annotation: 'prop'
        };
        if (!styleDocs.some(c => c.name === cssDoc.name && c.annotation === 'prop')) {
            styleDocs.push(cssDoc);
        }
    });
    return styleDocs;
}
const CSS_DOC_START = `/**`;
const CSS_DOC_END = `*/`;
const CSS_PROP_ANNOTATION = `@prop`;

var __awaiter$K = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function parseCssImports(config, compilerCtx, buildCtx, srcFilePath, resolvedFilePath, styleText, styleDocs) {
    return __awaiter$K(this, void 0, void 0, function* () {
        const isCssEntry = resolvedFilePath.toLowerCase().endsWith('.css');
        return cssImports(config, compilerCtx, buildCtx, isCssEntry, srcFilePath, resolvedFilePath, styleText, [], styleDocs);
    });
}
function cssImports(config, compilerCtx, buildCtx, isCssEntry, srcFilePath, resolvedFilePath, styleText, noLoop, styleDocs) {
    return __awaiter$K(this, void 0, void 0, function* () {
        if (noLoop.includes(resolvedFilePath)) {
            return styleText;
        }
        noLoop.push(resolvedFilePath);
        if (styleDocs) {
            parseStyleDocs(styleDocs, styleText);
        }
        const cssImports = getCssImports(config, buildCtx, resolvedFilePath, styleText);
        if (cssImports.length === 0) {
            return styleText;
        }
        yield Promise.all(cssImports.map((cssImportData) => __awaiter$K(this, void 0, void 0, function* () {
            yield concatCssImport(config, compilerCtx, buildCtx, isCssEntry, srcFilePath, cssImportData, noLoop, styleDocs);
        })));
        return replaceImportDeclarations(styleText, cssImports, isCssEntry);
    });
}
function concatCssImport(config, compilerCtx, buildCtx, isCssEntry, srcFilePath, cssImportData, noLoop, styleDocs) {
    return __awaiter$K(this, void 0, void 0, function* () {
        try {
            cssImportData.styleText = yield compilerCtx.fs.readFile(cssImportData.filePath);
            cssImportData.styleText = yield cssImports(config, compilerCtx, buildCtx, isCssEntry, cssImportData.filePath, cssImportData.filePath, cssImportData.styleText, noLoop, styleDocs);
        }
        catch (e) {
            const err = buildError(buildCtx.diagnostics);
            err.messageText = `Unable to read css import: ${cssImportData.srcImport}`;
            err.absFilePath = normalizePath(srcFilePath);
            err.relFilePath = normalizePath(config.sys.path.relative(config.rootDir, srcFilePath));
        }
    });
}
function getCssImports(config, buildCtx, filePath, styleText) {
    const imports = [];
    if (!styleText.includes('@import')) {
        // no @import at all, so don't bother
        return imports;
    }
    styleText = stripComments(styleText);
    const dir = config.sys.path.dirname(filePath);
    const importeeExt = filePath.split('.').pop().toLowerCase();
    let r;
    while (r = IMPORT_RE.exec(styleText)) {
        const cssImportData = {
            srcImport: r[0],
            url: r[4].replace(/[\"\'\)]/g, '')
        };
        if (!isLocalCssImport(cssImportData.srcImport)) {
            // do nothing for @import url(http://external.css)
            config.logger.debug(`did not resolve external css @import: ${cssImportData.srcImport}`);
            continue;
        }
        if (isCssNodeModule(cssImportData.url)) {
            // node resolve this path cuz it starts with ~
            resolveCssNodeModule(config, buildCtx.diagnostics, filePath, cssImportData);
        }
        else if (config.sys.path.isAbsolute(cssImportData.url)) {
            // absolute path already
            cssImportData.filePath = normalizePath(cssImportData.url);
        }
        else {
            // relatie path
            cssImportData.filePath = normalizePath(config.sys.path.join(dir, cssImportData.url));
        }
        if (importeeExt !== 'css' && !cssImportData.filePath.toLowerCase().endsWith('.css')) {
            cssImportData.filePath += `.${importeeExt}`;
        }
        if (typeof cssImportData.filePath === 'string') {
            imports.push(cssImportData);
        }
    }
    return imports;
}
const IMPORT_RE = /(@import)\s+(url\()?\s?(.*?)\s?\)?([^;]*);?/gi;
function isCssNodeModule(url) {
    return url.startsWith('~');
}
function resolveCssNodeModule(config, diagnostics, filePath, cssImportData) {
    try {
        const dir = config.sys.path.dirname(filePath);
        const moduleId = getModuleId(cssImportData.url);
        cssImportData.filePath = config.sys.resolveModule(dir, moduleId);
        cssImportData.filePath = config.sys.path.dirname(cssImportData.filePath);
        cssImportData.filePath += normalizePath(cssImportData.url.substring(moduleId.length + 1));
        cssImportData.updatedImport = `@import "${cssImportData.filePath}";`;
    }
    catch (e) {
        const d = buildError(diagnostics);
        d.messageText = `Unable to resolve node module for CSS @import: ${cssImportData.url}`;
        d.absFilePath = normalizePath(filePath);
        d.relFilePath = normalizePath(config.sys.path.relative(config.rootDir, filePath));
    }
}
function isLocalCssImport(srcImport) {
    srcImport = srcImport.toLowerCase();
    if (srcImport.includes('url(')) {
        srcImport = srcImport.replace(/\"/g, '');
        srcImport = srcImport.replace(/\'/g, '');
        srcImport = srcImport.replace(/\s/g, '');
        if (srcImport.includes('url(http') || srcImport.includes('url(//')) {
            return false;
        }
    }
    return true;
}
function getModuleId(orgImport) {
    if (orgImport.startsWith('~')) {
        orgImport = orgImport.substring(1);
    }
    const splt = orgImport.split('/');
    if (orgImport.startsWith('@')) {
        if (splt.length > 1) {
            return splt.slice(0, 2).join('/');
        }
    }
    return splt[0];
}
function replaceImportDeclarations(styleText, cssImports, isCssEntry) {
    cssImports.forEach(cssImportData => {
        if (isCssEntry) {
            if (typeof cssImportData.styleText === 'string') {
                styleText = styleText.replace(cssImportData.srcImport, cssImportData.styleText);
            }
        }
        else if (typeof cssImportData.updatedImport === 'string') {
            styleText = styleText.replace(cssImportData.srcImport, cssImportData.updatedImport);
        }
    });
    return styleText;
}
function stripComments(input) {
    let isInsideString = null;
    let currentCharacter = '';
    let returnValue = '';
    for (let i = 0; i < input.length; i++) {
        currentCharacter = input[i];
        if (input[i - 1] !== '\\') {
            if (currentCharacter === '"' || currentCharacter === '\'') {
                if (isInsideString === currentCharacter) {
                    isInsideString = null;
                }
                else if (!isInsideString) {
                    isInsideString = currentCharacter;
                }
            }
        }
        // Find beginning of /* type comment
        if (!isInsideString && currentCharacter === '/' && input[i + 1] === '*') {
            // Ignore important comment when configured to preserve comments using important syntax: /*!
            let j = i + 2;
            // Iterate over comment
            for (; j < input.length; j++) {
                // Find end of comment
                if (input[j] === '*' && input[j + 1] === '/') {
                    break;
                }
            }
            // Resume iteration over CSS string from the end of the comment
            i = j + 1;
            continue;
        }
        returnValue += currentCharacter;
    }
    return returnValue;
}

var __awaiter$L = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getComponentStylesCache(config, compilerCtx, buildCtx, moduleFile, styleMeta, modeName) {
    return __awaiter$L(this, void 0, void 0, function* () {
        const cacheKey = getComponentStylesCacheKey(moduleFile, modeName);
        const cachedStyleMeta = compilerCtx.cachedStyleMeta.get(cacheKey);
        if (!cachedStyleMeta) {
            // don't have the cache to begin with, so can't continue
            return null;
        }
        if (isChangedTsFile(moduleFile, buildCtx) && hasDecoratorStyleChanges(compilerCtx, moduleFile, cacheKey)) {
            // this module is one of the changed ts files
            // and the changed ts file has different
            // styleUrls or styleStr in the component decorator
            return null;
        }
        if (!buildCtx.hasStyleChanges) {
            // doesn't look like there was any style changes to begin with
            // just return our cached data
            return cachedStyleMeta;
        }
        if (isChangedStyleEntryFile(buildCtx, styleMeta)) {
            // one of the files that's this components style url was one that changed
            return null;
        }
        const hasChangedImport = yield isChangedStyleEntryImport(config, compilerCtx, buildCtx, styleMeta);
        if (hasChangedImport) {
            // one of the files that's imported by the style url changed
            return null;
        }
        // woot! let's use the cached data we already compiled
        return cachedStyleMeta;
    });
}
function isChangedTsFile(moduleFile, buildCtx) {
    return (buildCtx.filesChanged.includes(moduleFile.sourceFilePath));
}
function hasDecoratorStyleChanges(compilerCtx, moduleFile, cacheKey) {
    const lastStyleInput = compilerCtx.lastComponentStyleInput.get(cacheKey);
    if (!lastStyleInput) {
        return true;
    }
    return (lastStyleInput !== getComponentStyleInputKey(moduleFile));
}
function isChangedStyleEntryFile(buildCtx, styleMeta) {
    if (!styleMeta.externalStyles) {
        return false;
    }
    return (buildCtx.filesChanged.some(f => {
        return styleMeta.externalStyles.some(s => s.absolutePath === f);
    }));
}
function isChangedStyleEntryImport(config, compilerCtx, buildCtx, styleMeta) {
    return __awaiter$L(this, void 0, void 0, function* () {
        if (!styleMeta.externalStyles) {
            return false;
        }
        const checkedFiles = [];
        const promises = styleMeta.externalStyles.map(externalStyle => {
            return hasChangedImportFile(config, compilerCtx, buildCtx, externalStyle.absolutePath, checkedFiles);
        });
        const results = yield Promise.all(promises);
        return results.includes(true);
    });
}
function hasChangedImportFile(config, compilerCtx, buildCtx, filePath, checkedFiles) {
    return __awaiter$L(this, void 0, void 0, function* () {
        if (checkedFiles.includes(filePath)) {
            // already checked
            return false;
        }
        checkedFiles.push(filePath);
        let rtn = false;
        try {
            const content = yield compilerCtx.fs.readFile(filePath);
            rtn = yield hasChangedImportContent(config, compilerCtx, buildCtx, filePath, content, checkedFiles);
        }
        catch (e) { }
        return rtn;
    });
}
function hasChangedImportContent(config, compilerCtx, buildCtx, filePath, content, checkedFiles) {
    return __awaiter$L(this, void 0, void 0, function* () {
        const cssImports = getCssImports(config, buildCtx, filePath, content);
        if (cssImports.length === 0) {
            // don't bother
            return false;
        }
        const isChangedImport = buildCtx.filesChanged.some(changedFilePath => {
            return cssImports.some(c => c.filePath === changedFilePath);
        });
        if (isChangedImport) {
            // one of the changed files is an import of this file
            return true;
        }
        // keep diggin'
        const promises = cssImports.map(cssImportData => {
            return hasChangedImportFile(config, compilerCtx, buildCtx, cssImportData.filePath, checkedFiles);
        });
        const results = yield Promise.all(promises);
        return results.includes(true);
    });
}
function getComponentStyleInputKey(moduleFile) {
    const input = [];
    if (moduleFile.cmpMeta.stylesMeta) {
        Object.keys(moduleFile.cmpMeta.stylesMeta).forEach(modeName => {
            input.push(modeName);
            const styleMeta = moduleFile.cmpMeta.stylesMeta[modeName];
            if (styleMeta.styleStr) {
                input.push(styleMeta.styleStr);
            }
            if (styleMeta.externalStyles) {
                styleMeta.externalStyles.forEach(s => {
                    input.push(s.absolutePath);
                });
            }
        });
    }
    return input.join(',');
}
function setComponentStylesCache(compilerCtx, moduleFile, modeName, styleMeta) {
    const cacheKey = getComponentStylesCacheKey(moduleFile, modeName);
    compilerCtx.cachedStyleMeta.set(cacheKey, styleMeta);
    const styleInput = getComponentStyleInputKey(moduleFile);
    compilerCtx.lastComponentStyleInput.set(cacheKey, styleInput);
}
function getComponentStylesCacheKey(moduleFile, modeName) {
    return `${moduleFile.sourceFilePath}#${modeName}`;
}

var __awaiter$M = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function runPluginResolveId(pluginCtx, importee) {
    return __awaiter$M(this, void 0, void 0, function* () {
        for (const plugin of pluginCtx.config.plugins) {
            if (typeof plugin.resolveId === 'function') {
                try {
                    const results = plugin.resolveId(importee, null, pluginCtx);
                    if (results != null) {
                        if (typeof results.then === 'function') {
                            const promiseResults = yield results;
                            if (promiseResults != null) {
                                return promiseResults;
                            }
                        }
                        else if (typeof results === 'string') {
                            return results;
                        }
                    }
                }
                catch (e) {
                    catchError(pluginCtx.diagnostics, e);
                }
            }
        }
        // default resolvedId
        return importee;
    });
}
function runPluginLoad(pluginCtx, id) {
    return __awaiter$M(this, void 0, void 0, function* () {
        for (const plugin of pluginCtx.config.plugins) {
            if (typeof plugin.load === 'function') {
                try {
                    const results = plugin.load(id, pluginCtx);
                    if (results != null) {
                        if (typeof results.then === 'function') {
                            const promiseResults = yield results;
                            if (promiseResults != null) {
                                return promiseResults;
                            }
                        }
                        else if (typeof results === 'string') {
                            return results;
                        }
                    }
                }
                catch (e) {
                    catchError(pluginCtx.diagnostics, e);
                }
            }
        }
        // default load()
        return pluginCtx.fs.readFile(id);
    });
}
function runPluginTransforms(config, compilerCtx, buildCtx, id, moduleFile) {
    return __awaiter$M(this, void 0, void 0, function* () {
        const pluginCtx = {
            config: config,
            sys: config.sys,
            fs: compilerCtx.fs,
            cache: compilerCtx.cache,
            diagnostics: []
        };
        const resolvedId = yield runPluginResolveId(pluginCtx, id);
        const sourceText = yield runPluginLoad(pluginCtx, resolvedId);
        const transformResults = {
            code: sourceText,
            id: id
        };
        const isRawCssFile = transformResults.id.toLowerCase().endsWith('.css');
        if (isRawCssFile) {
            // concat all css @imports into one file
            // when the entry file is a .css file (not .scss)
            // do this BEFORE transformations on css files
            const shouldParseCssDocs = (!!moduleFile && config.outputTargets.some(o => o.type === 'docs'));
            if (shouldParseCssDocs && moduleFile.cmpMeta) {
                moduleFile.cmpMeta.styleDocs = moduleFile.cmpMeta.styleDocs || [];
                transformResults.code = yield parseCssImports(config, compilerCtx, buildCtx, id, id, transformResults.code, moduleFile.cmpMeta.styleDocs);
            }
            else {
                transformResults.code = yield parseCssImports(config, compilerCtx, buildCtx, id, id, transformResults.code);
            }
        }
        for (const plugin of pluginCtx.config.plugins) {
            if (typeof plugin.transform === 'function') {
                try {
                    let pluginTransformResults;
                    const results = plugin.transform(transformResults.code, transformResults.id, pluginCtx);
                    if (results != null) {
                        if (typeof results.then === 'function') {
                            pluginTransformResults = yield results;
                        }
                        else {
                            pluginTransformResults = results;
                        }
                        if (pluginTransformResults != null) {
                            if (typeof pluginTransformResults === 'string') {
                                transformResults.code = pluginTransformResults;
                            }
                            else {
                                if (typeof pluginTransformResults.code === 'string') {
                                    transformResults.code = pluginTransformResults.code;
                                }
                                if (typeof pluginTransformResults.id === 'string') {
                                    transformResults.id = pluginTransformResults.id;
                                }
                            }
                        }
                    }
                }
                catch (e) {
                    catchError(buildCtx.diagnostics, e);
                }
            }
        }
        buildCtx.diagnostics.push(...pluginCtx.diagnostics);
        if (!isRawCssFile) {
            // sass precompiler just ran and converted @import "my.css" into @import url("my.css")
            // because of the ".css" extension. Sass did NOT concat the ".css" files into the output
            // but only updated it to use url() instead. Let's go ahead and concat the url() css
            // files into one file like we did for raw .css files.
            // do this AFTER transformations on non-css files
            const shouldParseCssDocs = (!!moduleFile && config.outputTargets.some(o => o.type === 'docs'));
            if (shouldParseCssDocs && moduleFile.cmpMeta) {
                moduleFile.cmpMeta.styleDocs = moduleFile.cmpMeta.styleDocs || [];
                transformResults.code = yield parseCssImports(config, compilerCtx, buildCtx, id, transformResults.id, transformResults.code, moduleFile.cmpMeta.styleDocs);
            }
            else {
                transformResults.code = yield parseCssImports(config, compilerCtx, buildCtx, id, transformResults.id, transformResults.code);
            }
        }
        return transformResults;
    });
}

var __awaiter$N = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function scopeComponentCss(config, buildCtx, cmpMeta, mode, cssText) {
    return __awaiter$N(this, void 0, void 0, function* () {
        try {
            const scopeId = getScopeId(cmpMeta, mode);
            const hostScopeId = getElementScopeId(scopeId, true);
            const slotScopeId = getElementScopeId(scopeId);
            cssText = yield config.sys.scopeCss(cssText, scopeId, hostScopeId, slotScopeId);
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
        return cssText;
    });
}

var __awaiter$O = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateComponentStylesMode(config, compilerCtx, buildCtx, moduleFile, styleMeta, modeName) {
    return __awaiter$O(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        if (buildCtx.isRebuild) {
            const cachedCompiledStyles = yield getComponentStylesCache(config, compilerCtx, buildCtx, moduleFile, styleMeta, modeName);
            if (cachedCompiledStyles) {
                styleMeta.compiledStyleText = cachedCompiledStyles.compiledStyleText;
                styleMeta.compiledStyleTextScoped = cachedCompiledStyles.compiledStyleTextScoped;
                return;
            }
        }
        // compile each mode style
        const compiledStyles = yield compileStyles(config, compilerCtx, buildCtx, moduleFile, styleMeta);
        // format and set the styles for use later
        const compiledStyleMeta = yield setStyleText(config, compilerCtx, buildCtx, moduleFile.cmpMeta, modeName, styleMeta.externalStyles, compiledStyles);
        styleMeta.compiledStyleText = compiledStyleMeta.compiledStyleText;
        styleMeta.compiledStyleTextScoped = compiledStyleMeta.compiledStyleTextScoped;
        if (config.watch) {
            // since this is a watch and we'll be checking this again
            // let's cache what we've learned today
            setComponentStylesCache(compilerCtx, moduleFile, modeName, styleMeta);
        }
    });
}
function compileStyles(config, compilerCtx, buildCtx, moduleFile, styleMeta) {
    return __awaiter$O(this, void 0, void 0, function* () {
        // get all the absolute paths for each style
        const extStylePaths = styleMeta.externalStyles.map(extStyle => extStyle.absolutePath);
        if (typeof styleMeta.styleStr === 'string') {
            // plain styles just in a string
            // let's put these file in an in-memory file
            const inlineAbsPath = moduleFile.jsFilePath + '.css';
            extStylePaths.push(inlineAbsPath);
            yield compilerCtx.fs.writeFile(inlineAbsPath, styleMeta.styleStr, { inMemoryOnly: true });
        }
        // build an array of style strings
        const compiledStyles = yield Promise.all(extStylePaths.map(extStylePath => {
            return compileExternalStyle(config, compilerCtx, buildCtx, moduleFile, extStylePath);
        }));
        return compiledStyles;
    });
}
function compileExternalStyle(config, compilerCtx, buildCtx, moduleFile, extStylePath) {
    return __awaiter$O(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return '/* build aborted */';
        }
        extStylePath = normalizePath(extStylePath);
        // see if we can used a cached style first
        let styleText;
        if (moduleFile.isCollectionDependency) {
            // if it's a collection dependency and it's a preprocessor file like sass
            // AND we have the correct plugin then let's compile it
            const hasPlugin = hasPluginInstalled(config, extStylePath);
            if (!hasPlugin) {
                // the collection has this style as a preprocessor file, like sass
                // however the user doesn't have this plugin installed, which is file
                // instead of using the preprocessor file (sass) use the vanilla css file
                const parts = extStylePath.split('.');
                parts[parts.length - 1] = 'css';
                extStylePath = parts.join('.');
            }
        }
        else {
            // not a collection dependency
            // check known extensions just for a helpful message
            checkPluginHelpers(config, buildCtx, extStylePath);
        }
        try {
            const transformResults = yield runPluginTransforms(config, compilerCtx, buildCtx, extStylePath, moduleFile);
            if (!moduleFile.isCollectionDependency) {
                const collectionDirs = config.outputTargets.filter(o => o.collectionDir);
                const relPath = config.sys.path.relative(config.srcDir, transformResults.id);
                yield Promise.all(collectionDirs.map((outputTarget) => __awaiter$O(this, void 0, void 0, function* () {
                    const collectionPath = config.sys.path.join(outputTarget.collectionDir, relPath);
                    yield compilerCtx.fs.writeFile(collectionPath, transformResults.code);
                })));
            }
            styleText = transformResults.code;
            buildCtx.styleBuildCount++;
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                const d = buildError(buildCtx.diagnostics);
                const relExtStyle = config.sys.path.relative(config.cwd, extStylePath);
                const relSrc = config.sys.path.relative(config.cwd, moduleFile.sourceFilePath);
                d.messageText = `Unable to load style ${relExtStyle} from ${relSrc}`;
            }
            else {
                catchError(buildCtx.diagnostics, e);
            }
            styleText = '';
        }
        return styleText;
    });
}
function checkPluginHelpers(config, buildCtx, externalStylePath) {
    PLUGIN_HELPERS.forEach(p => {
        checkPluginHelper(config, buildCtx, externalStylePath, p.pluginExts, p.pluginId, p.pluginName);
    });
}
function checkPluginHelper(config, buildCtx, externalStylePath, pluginExts, pluginId, pluginName) {
    if (!hasFileExtension(externalStylePath, pluginExts)) {
        return;
    }
    if (config.plugins.some(p => p.name === pluginId)) {
        return;
    }
    const errorKey = 'styleError' + pluginId;
    if (buildCtx.data[errorKey]) {
        // already added this key
        return;
    }
    buildCtx.data[errorKey] = true;
    const relPath = config.sys.path.relative(config.rootDir, externalStylePath);
    const msg = [
        `Style "${relPath}" is a ${pluginName} file, however the "${pluginId}" `,
        `plugin has not been installed. Please install the "@stencil/${pluginId}" `,
        `plugin and add it to "config.plugins" within the project's stencil.config.js `,
        `file. For more info please see: https://www.npmjs.com/package/@stencil/${pluginId}`
    ].join('');
    const d = buildError(buildCtx.diagnostics);
    d.header = 'style error';
    d.messageText = msg;
}
function hasPluginInstalled(config, filePath) {
    // TODO: don't hard these
    const plugin = PLUGIN_HELPERS.find(p => hasFileExtension(filePath, p.pluginExts));
    if (plugin) {
        return config.plugins.some(p => p.name === plugin.pluginId);
    }
    return false;
}
function setStyleText(config, compilerCtx, buildCtx, cmpMeta, modeName, externalStyles, compiledStyles) {
    return __awaiter$O(this, void 0, void 0, function* () {
        const styleMeta = {};
        // join all the component's styles for this mode together into one line
        styleMeta.compiledStyleText = compiledStyles.join('\n\n').trim();
        let filePath = null;
        const externalStyle = externalStyles && externalStyles.length && externalStyles[0];
        if (externalStyle && externalStyle.absolutePath) {
            filePath = externalStyle.absolutePath;
        }
        // auto add css prefixes
        const autoprefixConfig = config.autoprefixCss;
        if (autoprefixConfig !== false) {
            styleMeta.compiledStyleText = yield autoprefixCssMain(config, compilerCtx, styleMeta.compiledStyleText, autoprefixConfig);
        }
        if (config.minifyCss) {
            // minify css
            styleMeta.compiledStyleText = yield minifyStyle(config, compilerCtx, buildCtx.diagnostics, styleMeta.compiledStyleText, filePath);
        }
        if (requiresScopedStyles(cmpMeta.encapsulationMeta)) {
            // only create scoped styles if we need to
            styleMeta.compiledStyleTextScoped = yield scopeComponentCss(config, buildCtx, cmpMeta, modeName, styleMeta.compiledStyleText);
            if (config.devMode) {
                styleMeta.compiledStyleTextScoped = '\n' + styleMeta.compiledStyleTextScoped + '\n';
            }
        }
        let addStylesUpdate = false;
        let addScopedStylesUpdate = false;
        // test to see if the last styles are different
        const styleId = getStyleId(cmpMeta, modeName, false);
        if (compilerCtx.lastBuildStyles.get(styleId) !== styleMeta.compiledStyleText) {
            compilerCtx.lastBuildStyles.set(styleId, styleMeta.compiledStyleText);
            if (buildCtx.isRebuild) {
                addStylesUpdate = true;
            }
        }
        const scopedStyleId = getStyleId(cmpMeta, modeName, true);
        if (compilerCtx.lastBuildStyles.get(scopedStyleId) !== styleMeta.compiledStyleTextScoped) {
            compilerCtx.lastBuildStyles.set(scopedStyleId, styleMeta.compiledStyleTextScoped);
            if (buildCtx.isRebuild) {
                addScopedStylesUpdate = true;
            }
        }
        styleMeta.compiledStyleText = escapeCssForJs(styleMeta.compiledStyleText);
        if (styleMeta.compiledStyleTextScoped) {
            styleMeta.compiledStyleTextScoped = escapeCssForJs(styleMeta.compiledStyleTextScoped);
        }
        const styleMode = (modeName === DEFAULT_STYLE_MODE ? null : modeName);
        if (addStylesUpdate) {
            buildCtx.stylesUpdated = buildCtx.stylesUpdated || [];
            buildCtx.stylesUpdated.push({
                styleTag: cmpMeta.tagNameMeta,
                styleMode: styleMode,
                styleText: styleMeta.compiledStyleText,
                isScoped: false
            });
        }
        if (addScopedStylesUpdate) {
            buildCtx.stylesUpdated.push({
                styleTag: cmpMeta.tagNameMeta,
                styleMode: styleMode,
                styleText: styleMeta.compiledStyleTextScoped,
                isScoped: true
            });
        }
        return styleMeta;
    });
}
function getStyleId(cmpMeta, modeName, isScopedStyles) {
    return `${cmpMeta.tagNameMeta}${modeName}${isScopedStyles ? '.sc' : ''}`;
}
function escapeCssForJs(style) {
    return style
        .replace(/\\[\D0-7]/g, (v) => '\\' + v)
        .replace(/\r\n|\r|\n/g, `\\n`)
        .replace(/\"/g, `\\"`)
        .replace(/\@/g, `\\@`);
}
function requiresScopedStyles(encapsulation) {
    return (encapsulation === 2 /* ScopedCss */ || encapsulation === 1 /* ShadowDom */);
}
const PLUGIN_HELPERS = [
    {
        pluginName: 'PostCSS',
        pluginId: 'postcss',
        pluginExts: ['pcss']
    },
    {
        pluginName: 'Sass',
        pluginId: 'sass',
        pluginExts: ['scss', 'sass']
    },
    {
        pluginName: 'Stylus',
        pluginId: 'stylus',
        pluginExts: ['styl', 'stylus']
    }, {
        pluginName: 'Less',
        pluginId: 'less',
        pluginExts: ['less']
    }
];

function validateComponentTag(tag) {
    if (typeof tag !== 'string') {
        throw new Error(`Tag "${tag}" must be a string type`);
    }
    tag = tag.trim().toLowerCase();
    if (tag.length === 0) {
        throw new Error(`Received empty tag value`);
    }
    if (tag.indexOf(' ') > -1) {
        throw new Error(`"${tag}" tag cannot contain a space`);
    }
    if (tag.indexOf(',') > -1) {
        throw new Error(`"${tag}" tag cannot be use for multiple tags`);
    }
    const invalidChars = tag.replace(/\w|-/g, '');
    if (invalidChars !== '') {
        throw new Error(`"${tag}" tag contains invalid characters: ${invalidChars}`);
    }
    if (tag.indexOf('-') === -1) {
        throw new Error(`"${tag}" tag must contain a dash (-) to work as a valid web component`);
    }
    if (tag.indexOf('--') > -1) {
        throw new Error(`"${tag}" tag cannot contain multiple dashes (--) next to each other`);
    }
    if (tag.indexOf('-') === 0) {
        throw new Error(`"${tag}" tag cannot start with a dash (-)`);
    }
    if (tag.lastIndexOf('-') === tag.length - 1) {
        throw new Error(`"${tag}" tag cannot end with a dash (-)`);
    }
    return tag;
}

function generateEntryModules(config, compilerCtx, buildCtx) {
    buildCtx.entryModules = [];
    const moduleFiles = Object.keys(compilerCtx.moduleFiles).map(filePath => {
        return compilerCtx.moduleFiles[filePath];
    });
    // figure out how modules and components connect
    calcComponentDependencies(moduleFiles);
    try {
        const allModules = validateComponentEntries(config, compilerCtx, buildCtx);
        const userConfigEntryModulesTags = getUserConfigEntryTags(buildCtx, config.bundles, allModules);
        const appEntryTags = getAppEntryTags(allModules);
        buildCtx.entryPoints = generateComponentEntries(buildCtx, allModules, userConfigEntryModulesTags, appEntryTags);
        const cleanedEntryModules = regroupEntryModules(allModules, buildCtx.entryPoints);
        buildCtx.entryModules = cleanedEntryModules
            .map(createEntryModule(config))
            .filter((entryModule, index, array) => {
            const firstIndex = array.findIndex(e => e.entryKey === entryModule.entryKey);
            return firstIndex === index;
        });
    }
    catch (e) {
        catchError(buildCtx.diagnostics, e);
    }
    buildCtx.debug(`generateEntryModules, ${buildCtx.entryModules.length} entryModules`);
    return buildCtx.entryModules;
}
function getEntryEncapsulations(entryModule) {
    const encapsulations = [];
    entryModule.moduleFiles.forEach(m => {
        const encapsulation = m.cmpMeta.encapsulationMeta || 0 /* NoEncapsulation */;
        if (!encapsulations.includes(encapsulation)) {
            encapsulations.push(encapsulation);
        }
    });
    if (encapsulations.length === 0) {
        encapsulations.push(0 /* NoEncapsulation */);
    }
    else if (encapsulations.includes(1 /* ShadowDom */) && !encapsulations.includes(2 /* ScopedCss */)) {
        encapsulations.push(2 /* ScopedCss */);
    }
    return encapsulations.sort();
}
function getEntryModes(moduleFiles) {
    const styleModeNames = [];
    moduleFiles.forEach(m => {
        const cmpStyleModes = getComponentStyleModes(m.cmpMeta);
        cmpStyleModes.forEach(modeName => {
            if (!styleModeNames.includes(modeName)) {
                styleModeNames.push(modeName);
            }
        });
    });
    if (styleModeNames.length === 0) {
        styleModeNames.push(DEFAULT_STYLE_MODE);
    }
    else if (styleModeNames.length > 1) {
        const index = (styleModeNames.indexOf(DEFAULT_STYLE_MODE));
        if (index > -1) {
            styleModeNames.splice(index, 1);
        }
    }
    return styleModeNames.sort();
}
function getComponentStyleModes(cmpMeta) {
    return (cmpMeta && cmpMeta.stylesMeta) ? Object.keys(cmpMeta.stylesMeta) : [];
}
function entryRequiresScopedStyles(encapsulations) {
    return encapsulations.some(e => requiresScopedStyles(e));
}
function regroupEntryModules(allModules, entryPoints) {
    const outtedNoEncapsulation = [];
    const outtedScopedCss = [];
    const outtedShadowDom = [];
    const cleanedEntryModules = [
        outtedNoEncapsulation,
        outtedScopedCss,
        outtedShadowDom
    ];
    entryPoints.forEach(entryPoint => {
        const entryModules = allModules.filter(m => {
            return entryPoint.some(ep => m.cmpMeta && ep.tag === m.cmpMeta.tagNameMeta);
        });
        const noEncapsulation = entryModules.filter(m => {
            return m.cmpMeta.encapsulationMeta !== 2 /* ScopedCss */ && m.cmpMeta.encapsulationMeta !== 1 /* ShadowDom */;
        });
        const scopedCss = entryModules.filter(m => {
            return m.cmpMeta.encapsulationMeta === 2 /* ScopedCss */;
        });
        const shadowDom = entryModules.filter(m => {
            return m.cmpMeta.encapsulationMeta === 1 /* ShadowDom */;
        });
        if ((noEncapsulation.length > 0 && scopedCss.length === 0 && shadowDom.length === 0) ||
            (noEncapsulation.length === 0 && scopedCss.length > 0 && shadowDom.length === 0) ||
            (noEncapsulation.length === 0 && scopedCss.length === 0 && shadowDom.length > 0)) {
            cleanedEntryModules.push(entryModules);
        }
        else if (noEncapsulation.length >= scopedCss.length && noEncapsulation.length >= shadowDom.length) {
            cleanedEntryModules.push(noEncapsulation);
            outtedScopedCss.push(...scopedCss);
            outtedShadowDom.push(...shadowDom);
        }
        else if (scopedCss.length >= noEncapsulation.length && scopedCss.length >= shadowDom.length) {
            cleanedEntryModules.push(scopedCss);
            outtedNoEncapsulation.push(...noEncapsulation);
            outtedShadowDom.push(...shadowDom);
        }
        else if (shadowDom.length >= noEncapsulation.length && shadowDom.length >= scopedCss.length) {
            cleanedEntryModules.push(shadowDom);
            outtedNoEncapsulation.push(...noEncapsulation);
            outtedScopedCss.push(...scopedCss);
        }
    });
    return cleanedEntryModules
        .filter(m => m.length > 0)
        .sort((a, b) => {
        if (a[0].cmpMeta.tagNameMeta < b[0].cmpMeta.tagNameMeta)
            return -1;
        if (a[0].cmpMeta.tagNameMeta > b[0].cmpMeta.tagNameMeta)
            return 1;
        if (a.length < b.length)
            return -1;
        if (a.length > b.length)
            return 1;
        return 0;
    });
}
function createEntryModule(config) {
    return (moduleFiles) => {
        const entryModule = {
            moduleFiles: moduleFiles
        };
        // generate a unique entry key based on the components within this entry module
        entryModule.entryKey = ENTRY_KEY_PREFIX + entryModule.moduleFiles
            .sort((a, b) => {
            if (a.isCollectionDependency && !b.isCollectionDependency) {
                return 1;
            }
            if (!a.isCollectionDependency && b.isCollectionDependency) {
                return -1;
            }
            if (a.cmpMeta.tagNameMeta < b.cmpMeta.tagNameMeta)
                return -1;
            if (a.cmpMeta.tagNameMeta > b.cmpMeta.tagNameMeta)
                return 1;
            return 0;
        })
            .map(m => m.cmpMeta.tagNameMeta).join('.');
        // generate a unique entry key based on the components within this entry module
        entryModule.filePath = config.sys.path.join(config.srcDir, entryModule.entryKey + '.js');
        // get the modes used in this bundle
        entryModule.modeNames = getEntryModes(entryModule.moduleFiles);
        // get the encapsulations used in this bundle
        const encapsulations = getEntryEncapsulations(entryModule);
        // figure out if we'll need a scoped css build
        entryModule.requiresScopedStyles = entryRequiresScopedStyles(encapsulations);
        return entryModule;
    };
}
const ENTRY_KEY_PREFIX = 'entry.';
function getAppEntryTags(allModules) {
    return allModules
        .filter(m => m.cmpMeta && !m.isCollectionDependency)
        .map(m => m.cmpMeta.tagNameMeta)
        .sort((a, b) => {
        if (a.length < b.length)
            return 1;
        if (a.length > b.length)
            return -1;
        if (a[0] < b[0])
            return -1;
        if (a[0] > b[0])
            return 1;
        return 0;
    });
}
function getUserConfigEntryTags(buildCtx, configBundles, allModules) {
    configBundles = (configBundles || [])
        .filter(b => b.components && b.components.length > 0)
        .sort((a, b) => {
        if (a.components.length < b.components.length)
            return 1;
        if (a.components.length > b.components.length)
            return -1;
        return 0;
    });
    const definedTags = [];
    const entryTags = configBundles
        .map(b => {
        return b.components
            .map(tag => {
            tag = validateComponentTag(tag);
            const moduleFile = allModules.find(m => m.cmpMeta && m.cmpMeta.tagNameMeta === tag);
            if (!moduleFile) {
                const warn = buildWarn(buildCtx.diagnostics);
                warn.header = `Stencil Config`;
                warn.messageText = `Component tag "${tag}" is defined in a bundle but no matching component was found within this app or its collections.`;
            }
            if (definedTags.includes(tag)) {
                const warn = buildWarn(buildCtx.diagnostics);
                warn.header = `Stencil Config`;
                warn.messageText = `Component tag "${tag}" has been defined multiple times in the "bundles" config.`;
            }
            definedTags.push(tag);
            return tag;
        })
            .sort();
    });
    return entryTags;
}
function validateComponentEntries(config, compilerCtx, buildCtx) {
    const definedTags = {};
    const allModules = Object.keys(compilerCtx.moduleFiles).map(filePath => {
        const moduleFile = compilerCtx.moduleFiles[filePath];
        if (moduleFile.cmpMeta) {
            const tag = moduleFile.cmpMeta.tagNameMeta;
            definedTags[tag] = definedTags[tag] || [];
            definedTags[tag].push(moduleFile.sourceFilePath);
        }
        return moduleFile;
    });
    Object.keys(definedTags).forEach(tag => {
        const filePaths = definedTags[tag];
        if (filePaths.length > 1) {
            const error = buildError(buildCtx.diagnostics);
            error.messageText = `Component tag "${tag}" has been defined in multiple files: ${filePaths.map(f => {
                return config.sys.path.relative(config.rootDir, f);
            }).join(', ')}`;
        }
    });
    return allModules;
}

var __awaiter$P = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function inMemoryFsRead(config, compilerCtx, buildCtx, entryModules) {
    const path$$1 = config.sys.path;
    const assetsCache = {};
    let tsFileNames;
    return {
        name: 'inMemoryFsRead',
        resolveId(importee, importer) {
            return __awaiter$P(this, void 0, void 0, function* () {
                // note: node-resolve plugin has already ran
                // we can assume the importee is a file path
                if (!buildCtx.isActiveBuild) {
                    return importee;
                }
                const orgImportee = importee;
                // Entry files live in inMemoryFs
                if (path$$1.basename(importee).startsWith(ENTRY_KEY_PREFIX) && entryModules) {
                    const bundle = entryModules.find(b => b.filePath === importee);
                    if (bundle) {
                        return bundle.filePath;
                    }
                    buildCtx.debug(`bundleEntryFilePlugin resolveId, unable to find entry key: ${importee}`);
                    buildCtx.debug(`entryModules entryKeys: ${entryModules.map(em => em.filePath).join(', ')}`);
                }
                if (!path$$1.isAbsolute(importee)) {
                    importee = path$$1.resolve(importer ? path$$1.dirname(importer) : path$$1.resolve(), importee);
                    if (!importee.endsWith('.js')) {
                        importee += '.js';
                    }
                }
                importee = normalizePath(importee);
                // it's possible the importee is a file pointing directly to the source ts file
                // if it is a ts file path, then we're good to go
                var moduleFile = compilerCtx.moduleFiles[importee];
                if (compilerCtx.moduleFiles[importee]) {
                    return moduleFile.jsFilePath;
                }
                if (!tsFileNames) {
                    // get all the module files as filenames
                    // caching the filenames so we don't have to keep doing this
                    tsFileNames = Object.keys(compilerCtx.moduleFiles);
                }
                for (let i = 0; i < tsFileNames.length; i++) {
                    // see if we can find by importeE
                    moduleFile = compilerCtx.moduleFiles[tsFileNames[i]];
                    const moduleJsFilePath = moduleFile.jsFilePath;
                    if (moduleJsFilePath === importee) {
                        // exact match
                        return importee;
                    }
                    if (!importee.endsWith('.js') && moduleJsFilePath === importee + '.js') {
                        // try by appending .js
                        return `${importee}.js`;
                    }
                    if (!importee.endsWith('/index.js') && moduleJsFilePath === importee + '/index.js') {
                        // try by appending /index.js
                        return `${importee}/index.js`;
                    }
                }
                if (typeof importer === 'string' && !path$$1.isAbsolute(orgImportee)) {
                    // no luck finding the path the importee
                    // try again by using the importers source path and original importee
                    // get the original ts source path importer from this js path importer
                    for (let i = 0; i < tsFileNames.length; i++) {
                        const tsFilePath = tsFileNames[i];
                        moduleFile = compilerCtx.moduleFiles[tsFilePath];
                        if (moduleFile.jsFilePath !== importer) {
                            continue;
                        }
                        // found the importer's module file using importer's jsFilePath
                        // create an importee path using the source of the importers original ts file path
                        const srcImportee = normalizePath(path$$1.resolve(path$$1.dirname(tsFilePath), orgImportee));
                        let accessData = yield compilerCtx.fs.accessData(srcImportee);
                        if (accessData.isFile) {
                            return srcImportee;
                        }
                        if (!srcImportee.endsWith('/index.js')) {
                            accessData = yield compilerCtx.fs.accessData(srcImportee + '/index.js');
                            if (accessData.isFile) {
                                return srcImportee + '/index.js';
                            }
                        }
                        if (!srcImportee.endsWith('.js')) {
                            accessData = yield compilerCtx.fs.accessData(srcImportee + '.js');
                            if (accessData.isFile) {
                                return srcImportee + '.js';
                            }
                        }
                        break;
                    }
                }
                // let's check all of the asset directories for this path
                // think slide's swiper dependency
                for (let i = 0; i < tsFileNames.length; i++) {
                    // see if we can find by importeR
                    moduleFile = compilerCtx.moduleFiles[tsFileNames[i]];
                    if (moduleFile.jsFilePath === importer) {
                        // awesome, there's a module file for this js file via importeR
                        // now let's check if this module has an assets directory
                        if (moduleFile.cmpMeta && moduleFile.cmpMeta.assetsDirsMeta) {
                            for (var j = 0; j < moduleFile.cmpMeta.assetsDirsMeta.length; j++) {
                                const assetsAbsPath = moduleFile.cmpMeta.assetsDirsMeta[j].absolutePath;
                                const importeeFileName = path$$1.basename(importee);
                                const assetsFilePath = normalizePath(path$$1.join(assetsAbsPath, importeeFileName));
                                // ok, we've got a potential absolute path where the file "could" be
                                try {
                                    // let's see if it actually exists, but with readFileSync :(
                                    assetsCache[assetsFilePath] = compilerCtx.fs.readFileSync(assetsFilePath);
                                    if (typeof assetsCache[assetsFilePath] === 'string') {
                                        return assetsFilePath;
                                    }
                                }
                                catch (e) {
                                    buildCtx.debug(`asset ${assetsFilePath} did not exist`);
                                }
                            }
                        }
                    }
                }
                return null;
            });
        },
        load(sourcePath) {
            return __awaiter$P(this, void 0, void 0, function* () {
                if (!buildCtx.isActiveBuild) {
                    return `/* build aborted */`;
                }
                sourcePath = normalizePath(sourcePath);
                if (typeof assetsCache[sourcePath] === 'string') {
                    // awesome, this is one of the cached asset file we already read in resolveId
                    return assetsCache[sourcePath];
                }
                return compilerCtx.fs.readFile(sourcePath);
            });
        }
    };
}

var __awaiter$Q = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function transpileToEs5Main(config, compilerCtx, input) {
    return __awaiter$Q(this, void 0, void 0, function* () {
        const cacheKey = compilerCtx.cache.createKey('transpileToEs5', 'typescript2.9.20', input);
        const cachedContent = yield compilerCtx.cache.get(cacheKey);
        if (cachedContent != null) {
            const results = {
                code: cachedContent,
                diagnostics: []
            };
            return results;
        }
        const results = yield config.sys.transpileToEs5(config.cwd, input);
        if (results.diagnostics.length === 0) {
            yield compilerCtx.cache.put(cacheKey, results.code);
        }
        return results;
    });
}

var __awaiter$R = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateAppGlobalScript(config, compilerCtx, buildCtx, appRegistry, sourceTarget) {
    return __awaiter$R(this, void 0, void 0, function* () {
        const globalJsContents = yield generateAppGlobalContents(config, compilerCtx, buildCtx, sourceTarget);
        if (globalJsContents.length > 0) {
            appRegistry.global = getGlobalFileName(config);
            const globalJsContent = generateGlobalJs(config, globalJsContents);
            const globalEsmContent = generateGlobalEsm(config, globalJsContents);
            compilerCtx.appFiles.global = globalJsContent;
            const promises = [];
            if (sourceTarget !== 'es5') {
                config.outputTargets.filter(o => o.appBuild).forEach(outputTarget => {
                    const appGlobalFilePath = getGlobalJsBuildPath(config, outputTarget);
                    promises.push(compilerCtx.fs.writeFile(appGlobalFilePath, globalJsContent));
                });
            }
            config.outputTargets.filter(o => o.type === 'dist').forEach(outputTarget => {
                const appGlobalFilePath = getGlobalEsmBuildPath(config, outputTarget, 'es5');
                promises.push(compilerCtx.fs.writeFile(appGlobalFilePath, globalEsmContent));
            });
            yield Promise.all(promises);
        }
        return globalJsContents.join('\n').trim();
    });
}
function generateAppGlobalContents(config, compilerCtx, buildCtx, sourceTarget) {
    return __awaiter$R(this, void 0, void 0, function* () {
        const [projectGlobalJsContent, dependentGlobalJsContents] = yield Promise.all([
            bundleProjectGlobal(config, compilerCtx, buildCtx, sourceTarget, config.namespace, config.globalScript),
            loadDependentGlobalJsContents(config, compilerCtx, buildCtx, sourceTarget),
        ]);
        return [
            projectGlobalJsContent,
            ...dependentGlobalJsContents
        ];
    });
}
function loadDependentGlobalJsContents(config, compilerCtx, buildCtx, sourceTarget) {
    return __awaiter$R(this, void 0, void 0, function* () {
        const collections = compilerCtx.collections.filter(m => m.global && m.global.jsFilePath);
        const dependentGlobalJsContents = yield Promise.all(collections.map((collectionManifest) => __awaiter$R(this, void 0, void 0, function* () {
            const dependentGlobalJsContent = yield bundleProjectGlobal(config, compilerCtx, buildCtx, sourceTarget, collectionManifest.collectionName, collectionManifest.global.jsFilePath);
            return dependentGlobalJsContent;
        })));
        return dependentGlobalJsContents;
    });
}
function bundleProjectGlobal(config, compilerCtx, buildCtx, sourceTarget, namespace, entry) {
    return __awaiter$R(this, void 0, void 0, function* () {
        // stencil by itself does not have a global file
        // however, other collections can provide a global js
        // which will bundle whatever is in the global, and then
        // prepend the output content on top of the core js
        // this way external collections can provide a shared global at runtime
        if (!entry) {
            // looks like they never provided an entry file, which is fine, so let's skip this
            return '';
        }
        // ok, so the project also provided an entry file, so let's bundle it up and
        // the output from this can be tacked onto the top of the project's core file
        // start the bundler on our temporary file
        let output = '';
        try {
            const rollup$$1 = yield config.sys.rollup.rollup({
                input: entry,
                plugins: [
                    config.sys.rollup.plugins.nodeResolve({
                        jsnext: true,
                        main: true
                    }),
                    config.sys.rollup.plugins.commonjs({
                        include: 'node_modules/**',
                        sourceMap: false
                    }),
                    inMemoryFsRead(config, compilerCtx, buildCtx),
                    ...config.plugins
                ],
                onwarn: createOnWarnFn(config, buildCtx.diagnostics)
            });
            const results = yield rollup$$1.generate({ format: 'es' });
            // cool, so we balled up all of the globals into one string
            // replace build time expressions, like process.env.NODE_ENV === 'production'
            // with a hard coded boolean
            results.code = buildExpressionReplacer(config, results.code);
            // wrap our globals code with our own iife
            output = yield wrapGlobalJs(config, compilerCtx, buildCtx, sourceTarget, namespace, results.code);
            buildCtx.global = compilerCtx.moduleFiles[config.globalScript];
        }
        catch (e) {
            loadRollupDiagnostics(config, compilerCtx, buildCtx, e);
        }
        return output;
    });
}
function wrapGlobalJs(config, compilerCtx, buildCtx, sourceTarget, globalJsName, jsContent) {
    return __awaiter$R(this, void 0, void 0, function* () {
        jsContent = (jsContent || '').trim();
        // just format it a touch better in dev mode
        jsContent = `\n/** ${globalJsName || ''} global **/\n\n${jsContent}`;
        const lines = jsContent.split(/\r?\n/);
        jsContent = lines.map(line => {
            if (line.length) {
                return '    ' + line;
            }
            return line;
        }).join('\n');
        if (sourceTarget === 'es5') {
            // global could already be in es2017
            // transpile it down to es5
            buildCtx.debug(`transpile global to es5: ${globalJsName}`);
            const transpileResults = yield transpileToEs5Main(config, compilerCtx, jsContent);
            if (transpileResults.diagnostics && transpileResults.diagnostics.length) {
                buildCtx.diagnostics.push(...transpileResults.diagnostics);
            }
            else {
                jsContent = transpileResults.code;
            }
        }
        if (config.minifyJs) {
            const minifyResults = yield minifyJs(config, compilerCtx, jsContent, sourceTarget, false);
            if (minifyResults.diagnostics && minifyResults.diagnostics.length) {
                buildCtx.diagnostics.push(...minifyResults.diagnostics);
            }
            else {
                jsContent = minifyResults.output;
            }
        }
        return `\n(function(resourcesUrl){${jsContent}\n})(resourcesUrl);\n`;
    });
}
function generateGlobalJs(config, globalJsContents) {
    const output = [
        generatePreamble(config) + '\n',
        `(function(namespace,resourcesUrl){`,
        `"use strict";\n`,
        globalJsContents.join('\n').trim(),
        `\n})("${config.namespace}");`
    ].join('');
    return output;
}
function generateGlobalEsm(config, globalJsContents) {
    const output = [
        generatePreamble(config) + '\n',
        `export default function appGlobal(namespace, Context, window, document, resourcesUrl, hydratedCssClass) {`,
        globalJsContents.join('\n').trim(),
        `\n}`
    ].join('');
    return output;
}

/**
 * Properties which must not be property renamed during minification
 */
const RESERVED_PROPERTIES = [
    'addListener',
    'applyPolyfill',
    'attr',
    'color',
    'Context',
    'dom',
    'emit',
    'enableListener',
    'eventNameFn',
    'h',
    'hydratedCssClass',
    'initialized',
    'isClient',
    'isPrerender',
    'isServer',
    'key',
    'loaded',
    'mode',
    'namespace',
    'Promise',
    'publicPath',
    'queue',
    'raf',
    'read',
    'ref',
    'resourcesUrl',
    'tick',
    'write',
    /**
     * App Global - window.App
     * Properties which get added to the app's global
     */
    'components',
    'loadBundle',
    'loadStyles',
    /**
     * Host Element
     * Properties set on the host element
     */
    '$',
    'componentOnReady',
    /**
     * Component Constructor static properties
     */
    'attr',
    'capture',
    'connect',
    'context',
    'disabled',
    'elementRef',
    'encapsulation',
    'events',
    'host',
    'is',
    'listeners',
    'method',
    'mutable',
    'passive',
    'properties',
    'reflectToAttr',
    'scoped',
    'state',
    'style',
    'styleMode',
    'type',
    'watchCallbacks',
    /**
     * Component Instance
     * Methods set on the user's component
     */
    'componentWillLoad',
    'componentDidLoad',
    'componentWillUpdate',
    'componentDidUpdate',
    'componentDidUnload',
    'forceUpdate',
    'hostData',
    'render',
    /**
     * Functional Component Util
     */
    'getTag',
    'getChildren',
    'getText',
    'getAttributes',
    'replaceAttributes',
    /**
     * Web Standards / DOM
     */
    'add',
    'addEventListener',
    'appendChild',
    'async',
    'attachShadow',
    'attributeChangedCallback',
    'body',
    'bubbles',
    'cancelable',
    'capture',
    'characterData',
    'charset',
    'childNodes',
    'children',
    'class',
    'classList',
    'className',
    'cloneNode',
    'closest',
    'composed',
    'connectedCallback',
    'content',
    'createComment',
    'createElement',
    'createElementNS',
    'createEvent',
    'createTextNode',
    'CSS',
    'customElements',
    'CustomEvent',
    'data',
    'defaultView',
    'define',
    'detail',
    'didTimeout',
    'disconnect',
    'disconnectedCallback',
    'dispatchEvent',
    'document',
    'documentElement',
    'Element',
    'error',
    'Event',
    'fetch',
    'firstChild',
    'firstElementChild',
    'getAttribute',
    'getAttributeNS',
    'getRootNode',
    'getStyle',
    'hasAttribute',
    'head',
    'hidden',
    'host',
    'href',
    'id',
    'initCustomEvent',
    'innerHTML',
    'insertBefore',
    'location',
    'log',
    'keyCode',
    'match',
    'matches',
    'matchesSelector',
    'matchMedia',
    'mozMatchesSelector',
    'msMatchesSelector',
    'navigator',
    'nextSibling',
    'nodeName',
    'nodeType',
    'now',
    'observe',
    'observedAttributes',
    'onerror',
    'onload',
    'onmessage',
    'ownerDocument',
    'ownerSVGElement',
    'parentElement',
    'parentNode',
    'passive',
    'pathname',
    'performance',
    'postMessage',
    'previousSibling',
    'querySelector',
    'querySelectorAll',
    'remove',
    'removeAttribute',
    'removeAttributeNS',
    'removeChild',
    'removeEventListener',
    'requestAnimationFrame',
    'requestIdleCallback',
    'search',
    'setAttribute',
    'setAttributeNS',
    'setProperty',
    'shadowRoot',
    'src',
    'style',
    'supports',
    'tagName',
    'text',
    'textContent',
    'timeRemaining',
    'warn',
    'webkitMatchesSelector',
    'window',
    'HTMLElement'
];

var __awaiter$S = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function transpileCoreBuild(config, compilerCtx, coreBuild, input) {
    return __awaiter$S(this, void 0, void 0, function* () {
        const results = {
            code: null,
            diagnostics: null
        };
        let cacheKey;
        if (compilerCtx) {
            cacheKey = compilerCtx.cache.createKey('transpileCoreBuild', 'typescript2.9.20', coreBuild, input);
            const cachedContent = yield compilerCtx.cache.get(cacheKey);
            if (cachedContent != null) {
                results.code = cachedContent;
                results.diagnostics = [];
                return results;
            }
        }
        const diagnostics = [];
        const transpileOpts = {
            compilerOptions: {
                allowJs: true,
                declaration: false,
                target: ts.ScriptTarget.ES5,
                module: ts.ModuleKind.ESNext
            }
        };
        const tsResults = ts.transpileModule(input, transpileOpts);
        loadTypeScriptDiagnostics(config, diagnostics, tsResults.diagnostics);
        if (diagnostics.length) {
            results.diagnostics = diagnostics;
            results.code = input;
            return results;
        }
        results.code = tsResults.outputText;
        if (compilerCtx) {
            yield compilerCtx.cache.put(cacheKey, results.code);
        }
        return results;
    });
}

function replaceBuildString(code, values) {
    function escape(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }
    function longest(a, b) {
        return b.length - a.length;
    }
    const keys = Object.keys(values).sort(longest).map(escape);
    const pattern = new RegExp(`\\b(${keys.join('|')})\\b`, 'g');
    const magicString = new MagicString(code);
    let start;
    let end;
    let replacement;
    let match;
    while ((match = pattern.exec(code))) {
        start = match.index;
        end = start + match[0].length;
        replacement = String(values[match[1]]);
        magicString.overwrite(start, end, replacement);
    }
    return magicString.toString();
}

var __awaiter$T = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function buildCoreContent(config, compilerCtx, buildCtx, coreBuild, coreContent) {
    return __awaiter$T(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return '';
        }
        // Replace all __BUILD_CONDITIONALS__ with the current coreBuild obj
        const replaceObj = Object.keys(coreBuild).reduce((all, key) => {
            all[`__BUILD_CONDITIONALS__.${key}`] = coreBuild[key];
            return all;
        }, {});
        let replacedContent = replaceBuildString(coreContent, replaceObj);
        // If this is an es5 build then transpile the code down to es5 using Typescript.
        if (coreBuild.es5) {
            const transpileResults = yield transpileCoreBuild(config, compilerCtx, coreBuild, replacedContent);
            if (transpileResults.diagnostics && transpileResults.diagnostics.length > 0) {
                buildCtx.diagnostics.push(...transpileResults.diagnostics);
                return replacedContent;
            }
            replacedContent = transpileResults.code;
        }
        const sourceTarget = coreBuild.es5 ? 'es5' : 'es2017';
        const minifyResults = yield minifyCore(config, compilerCtx, sourceTarget, replacedContent);
        if (minifyResults.diagnostics.length > 0) {
            buildCtx.diagnostics.push(...minifyResults.diagnostics);
            return replacedContent;
        }
        return minifyResults.output;
    });
}
function minifyCore(config, compilerCtx, sourceTarget, input) {
    return __awaiter$T(this, void 0, void 0, function* () {
        const opts = Object.assign({}, config.minifyJs ? PROD_MINIFY_OPTS : DEV_MINIFY_OPTS);
        if (sourceTarget === 'es5') {
            opts.ecma = 5;
            opts.output.ecma = 5;
            opts.compress.ecma = 5;
            opts.compress.arrows = false;
        }
        opts.compress.toplevel = true;
        if (config.minifyJs) {
            if (sourceTarget !== 'es5') {
                opts.compress.arrows = true;
            }
            // reserved properties is a list of properties to NOT rename
            // if something works in dev, but a runtime error in prod
            // chances are we need to add a property to this list
            opts.mangle.properties.reserved = RESERVED_PROPERTIES.slice();
            if (config.logLevel === 'debug') {
                // if in debug mode, still mangle the property names
                // but at least make them readable of what the
                // properties originally were named
                opts.mangle.properties.debug = true;
                opts.mangle.keep_fnames = true;
                opts.compress.drop_console = false;
                opts.compress.drop_debugger = false;
                opts.output.beautify = true;
                opts.output.indent_level = 2;
                opts.output.comments = 'all';
            }
        }
        let cacheKey;
        if (compilerCtx) {
            cacheKey = compilerCtx.cache.createKey('minifyCore', '180707005308', opts, input);
            const cachedContent = yield compilerCtx.cache.get(cacheKey);
            if (cachedContent != null) {
                return {
                    output: cachedContent,
                    diagnostics: []
                };
            }
        }
        const results = yield config.sys.minifyJs(input, opts);
        if (results && results.diagnostics.length === 0 && compilerCtx) {
            yield compilerCtx.cache.put(cacheKey, results.output);
        }
        return results;
    });
}
// https://www.npmjs.com/package/terser
const DEV_MINIFY_OPTS = {
    compress: {
        arrows: false,
        booleans: false,
        collapse_vars: false,
        comparisons: false,
        conditionals: true,
        dead_code: true,
        drop_console: false,
        drop_debugger: false,
        evaluate: true,
        expression: false,
        hoist_funs: false,
        hoist_vars: false,
        ie8: false,
        if_return: false,
        inline: false,
        join_vars: false,
        keep_fargs: true,
        keep_fnames: true,
        keep_infinity: true,
        loops: false,
        negate_iife: false,
        passes: 1,
        properties: true,
        pure_funcs: null,
        pure_getters: false,
        reduce_vars: false,
        sequences: false,
        side_effects: false,
        switches: false,
        typeofs: false,
        top_retain: false,
        unsafe: false,
        unsafe_arrows: false,
        unsafe_comps: false,
        unsafe_Function: false,
        unsafe_math: false,
        unsafe_proto: false,
        unsafe_regexp: false,
        unused: true,
        warnings: false
    },
    mangle: false,
    output: {
        ascii_only: false,
        beautify: true,
        comments: 'all',
        ie8: false,
        indent_level: 2,
        indent_start: 0,
        inline_script: true,
        keep_quoted_props: true,
        max_line_len: false,
        preamble: null,
        quote_keys: false,
        quote_style: 1,
        semicolons: true,
        shebang: true,
        source_map: null,
        webkit: false,
        width: 80,
        wrap_iife: false
    }
};
const PROD_MINIFY_OPTS = {
    compress: {
        arrows: false,
        booleans: true,
        collapse_vars: true,
        comparisons: true,
        conditionals: true,
        dead_code: true,
        drop_console: true,
        drop_debugger: true,
        evaluate: true,
        expression: true,
        hoist_funs: true,
        hoist_vars: false,
        ie8: false,
        if_return: true,
        inline: true,
        join_vars: true,
        keep_fargs: true,
        keep_fnames: true,
        keep_infinity: true,
        loops: true,
        negate_iife: false,
        passes: 2,
        properties: true,
        pure_funcs: null,
        pure_getters: false,
        reduce_vars: true,
        sequences: true,
        side_effects: true,
        switches: true,
        typeofs: true,
        unsafe: false,
        unsafe_arrows: false,
        unsafe_comps: false,
        unsafe_Function: false,
        unsafe_math: false,
        unsafe_proto: false,
        unsafe_regexp: false,
        unused: true,
        warnings: false
    },
    mangle: {
        properties: {
            builtins: false,
            debug: false,
            keep_quoted: true
        },
        toplevel: true
    },
    output: {
        ascii_only: false,
        beautify: false,
        comments: false,
        ie8: false,
        indent_level: 0,
        indent_start: 0,
        inline_script: false,
        keep_quoted_props: false,
        max_line_len: false,
        preamble: null,
        quote_keys: false,
        quote_style: 0,
        semicolons: true,
        shebang: true,
        source_map: null,
        webkit: false,
        width: 80,
        wrap_iife: false
    }
};

var __awaiter$U = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateCoreBrowser(config, compilerCtx, buildCtx, outputTarget, globalJsContent, buildConditionals) {
    return __awaiter$U(this, void 0, void 0, function* () {
        const relPath = config.sys.path.relative(config.rootDir, getAppBuildDir(config, outputTarget));
        const timespan = buildCtx.createTimeSpan(`generateCoreBrowser ${buildConditionals.coreId} started, ${relPath}`, true);
        // mega-minify the core w/ property renaming, but not the user's globals
        // hardcode which features should and should not go in the core builds
        // process the transpiled code by removing unused code and minify when configured to do so
        let jsContent = yield config.sys.getClientCoreFile({ staticName: 'core.build.js' });
        jsContent = yield buildCoreContent(config, compilerCtx, buildCtx, buildConditionals, jsContent);
        if (globalJsContent) {
            // we've got global js to put in the core build too
            // concat the global js and transpiled code together
            jsContent = `${globalJsContent}\n${jsContent}`;
        }
        // wrap the core js code together
        jsContent = wrapCoreJs(config, jsContent);
        if (buildConditionals.polyfills) {
            // this build wants polyfills so let's
            // add the polyfills to the top of the core content
            // the polyfilled code is already es5/minified ready to go
            const polyfillsContent = yield getAppBrowserCorePolyfills(config);
            jsContent = polyfillsContent + '\n' + jsContent;
        }
        const coreFilename = getCoreFilename(config, buildConditionals.coreId, jsContent);
        // update the app core filename within the content
        jsContent = jsContent.replace(APP_NAMESPACE_PLACEHOLDER, config.fsNamespace);
        const appCorePath = pathJoin(config, getAppBuildDir(config, outputTarget), coreFilename);
        compilerCtx.appCoreWWWPath = appCorePath;
        yield compilerCtx.fs.writeFile(appCorePath, jsContent);
        timespan.finish(`generateCoreBrowser ${buildConditionals.coreId} finished, ${relPath}`);
        return coreFilename;
    });
}
function wrapCoreJs(config, jsContent) {
    if (typeof jsContent !== 'string') {
        jsContent = '';
    }
    const output = [
        generatePreamble(config) + '\n',
        `(function(Context,namespace,hydratedCssClass,resourcesUrl,s){`,
        `"use strict";\n`,
        `s=document.querySelector("script[data-namespace='${config.fsNamespace}']");`,
        `if(s){resourcesUrl=s.getAttribute('data-resources-url');}\n`,
        jsContent.trim(),
        `\n})({},"${config.namespace}","${config.hydratedCssClass}");`
    ].join('');
    return output;
}
const APP_NAMESPACE_PLACEHOLDER = '__APPNAMESPACE__';

var __awaiter$V = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function setBuildConditionals(config, compilerCtx, coreId, buildCtx, entryModules) {
    return __awaiter$V(this, void 0, void 0, function* () {
        const existingCoreBuild = getLastBuildConditionals(compilerCtx, coreId, buildCtx);
        if (existingCoreBuild) {
            // cool we can use the last build conditionals
            // because it's a rebuild, and was probably only a css or html change
            // if it was a typescript change we need to do a full rebuild again
            return existingCoreBuild;
        }
        // figure out which sections of the core code this build doesn't even need
        const coreBuild = {
            coreId: coreId,
            clientSide: true,
            isDev: !!config.devMode,
            isProd: !config.devMode,
            hasSlot: !!buildCtx.hasSlot,
            hasSvg: !!buildCtx.hasSvg,
            devInspector: config.devInspector,
            hotModuleReplacement: config.devMode,
            verboseError: config.devMode,
            externalModuleLoader: false,
            browserModuleLoader: false,
            polyfills: false,
            es5: false,
            cssVarShim: false,
            ssrServerSide: false,
            shadowDom: false,
            slotPolyfill: false,
            event: false,
            listener: false,
            styles: false,
            hostTheme: false,
            observeAttr: false,
            propConnect: false,
            propContext: false,
            method: false,
            element: false,
            watchCallback: false,
            reflectToAttr: false,
            cmpWillLoad: false,
            cmpDidLoad: false,
            cmpWillUpdate: false,
            cmpDidUpdate: false,
            cmpDidUnload: false,
            hostData: false
        };
        const promises = [];
        entryModules.forEach(bundle => {
            bundle.moduleFiles.forEach(moduleFile => {
                if (moduleFile.cmpMeta) {
                    promises.push(setBuildFromComponent(config, compilerCtx, coreBuild, moduleFile));
                }
            });
        });
        yield Promise.all(promises);
        if (coreId === 'core') {
            coreBuild.browserModuleLoader = true;
            coreBuild.slotPolyfill = !!coreBuild.slotPolyfill;
            if (coreBuild.slotPolyfill) {
                coreBuild.slotPolyfill = !!(buildCtx.hasSlot);
            }
            compilerCtx.lastBuildConditionalsBrowserEsm = coreBuild;
        }
        else if (coreId === 'core.pf') {
            coreBuild.browserModuleLoader = true;
            coreBuild.es5 = true;
            coreBuild.polyfills = true;
            coreBuild.cssVarShim = true;
            coreBuild.slotPolyfill = !!(buildCtx.hasSlot);
            compilerCtx.lastBuildConditionalsBrowserEs5 = coreBuild;
        }
        else if (coreId === 'esm.es5') {
            coreBuild.es5 = true;
            coreBuild.externalModuleLoader = true;
            coreBuild.cssVarShim = true;
            coreBuild.slotPolyfill = true;
            compilerCtx.lastBuildConditionalsEsmEs5 = coreBuild;
        }
        coreBuild.slotPolyfill = true;
        coreBuild.hasSvg = true;
        return coreBuild;
    });
}
function getLastBuildConditionals(compilerCtx, coreId, buildCtx) {
    if (buildCtx.isRebuild && Array.isArray(buildCtx.filesChanged)) {
        // this is a rebuild and we do have lastBuildConditionals already
        const hasChangedTsFile = buildCtx.filesChanged.some(filePath => {
            return isTsFile(filePath);
        });
        if (!hasChangedTsFile) {
            // we didn't have a typescript change
            // so it's ok to use the lastBuildConditionals
            if (coreId === 'core' && compilerCtx.lastBuildConditionalsBrowserEsm) {
                return compilerCtx.lastBuildConditionalsBrowserEsm;
            }
            if (coreId === 'core.pf' && compilerCtx.lastBuildConditionalsBrowserEs5) {
                return compilerCtx.lastBuildConditionalsBrowserEs5;
            }
            if (coreId === 'esm.es5' && compilerCtx.lastBuildConditionalsEsmEs5) {
                return compilerCtx.lastBuildConditionalsEsmEs5;
            }
        }
    }
    // we've gotta do a full rebuild of the build conditionals object again
    return null;
}
function setBuildFromComponent(config, compilerCtx, coreBuild, moduleFile) {
    return __awaiter$V(this, void 0, void 0, function* () {
        setBuildFromComponentMeta(coreBuild, moduleFile.cmpMeta);
        if (moduleFile.jsFilePath) {
            try {
                const jsText = yield compilerCtx.fs.readFile(moduleFile.jsFilePath);
                setBuildFromComponentContent(coreBuild, jsText);
            }
            catch (e) {
                config.logger.debug(`setBuildFromComponent: ${moduleFile.jsFilePath}: ${e}`);
            }
        }
    });
}
function setBuildFromComponentMeta(coreBuild, cmpMeta) {
    if (!cmpMeta) {
        return;
    }
    coreBuild.shadowDom = coreBuild.shadowDom || cmpMeta.encapsulationMeta === 1 /* ShadowDom */;
    coreBuild.slotPolyfill = coreBuild.slotPolyfill || cmpMeta.encapsulationMeta !== 1 /* ShadowDom */;
    coreBuild.event = coreBuild.event || !!(cmpMeta.eventsMeta && cmpMeta.eventsMeta.length > 0);
    coreBuild.listener = coreBuild.listener || !!(cmpMeta.listenersMeta && cmpMeta.listenersMeta.length > 0);
    coreBuild.styles = coreBuild.styles || !!cmpMeta.stylesMeta;
    coreBuild.hostTheme = coreBuild.hostTheme || !!(cmpMeta.hostMeta && cmpMeta.hostMeta.theme);
    if (cmpMeta.membersMeta) {
        const memberNames = Object.keys(cmpMeta.membersMeta);
        memberNames.forEach(memberName => {
            const memberMeta = cmpMeta.membersMeta[memberName];
            const memberType = memberMeta.memberType;
            const propType = memberMeta.propType;
            if (memberType === 1 /* Prop */ || memberType === 2 /* PropMutable */) {
                if (propType === 2 /* String */ || propType === 4 /* Number */ || propType === 3 /* Boolean */ || propType === 1 /* Any */) {
                    coreBuild.observeAttr = true;
                }
            }
            else if (memberType === 4 /* PropConnect */) {
                coreBuild.propConnect = true;
            }
            else if (memberType === 3 /* PropContext */) {
                coreBuild.propContext = true;
            }
            else if (memberType === 6 /* Method */) {
                coreBuild.method = true;
            }
            else if (memberType === 7 /* Element */) {
                coreBuild.element = true;
            }
            if (memberMeta.watchCallbacks && memberMeta.watchCallbacks.length > 0) {
                coreBuild.watchCallback = true;
            }
            if (memberMeta.reflectToAttrib) {
                coreBuild.reflectToAttr = true;
            }
        });
    }
}
function setBuildFromComponentContent(coreBuild, jsText) {
    if (typeof jsText !== 'string') {
        return;
    }
    // hacky to do it this way...yeah
    // but with collections the components may have been
    // built many moons ago, so we don't want to lock ourselves
    // into a very certain way that components can be parsed
    // so here we're just doing raw string checks, and there
    // wouldn't be any harm if a build section was included when it
    // wasn't needed, but these keywords are all pretty unique already
    coreBuild.cmpWillLoad = coreBuild.cmpWillLoad || jsText.includes('componentWillLoad');
    coreBuild.cmpDidLoad = coreBuild.cmpDidLoad || jsText.includes('componentDidLoad');
    coreBuild.cmpWillUpdate = coreBuild.cmpWillLoad || jsText.includes('componentWillUpdate');
    coreBuild.cmpDidUpdate = coreBuild.cmpDidUpdate || jsText.includes('componentDidUpdate');
    coreBuild.cmpDidUnload = coreBuild.cmpDidUnload || jsText.includes('componentDidUnload');
    coreBuild.hostData = coreBuild.hostData || jsText.includes('hostData');
}

var __awaiter$W = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateEsmCore(config, compilerCtx, buildCtx, outputTarget, entryModules, appRegistry) {
    return __awaiter$W(this, void 0, void 0, function* () {
        if (outputTarget.type === 'dist') {
            // mega-minify the core w/ property renaming, but not the user's globals
            // hardcode which features should and should not go in the core builds
            // process the transpiled code by removing unused code and minify when configured to do so
            let jsContent = yield config.sys.getClientCoreFile({ staticName: 'core.esm.js' });
            // browser esm core build
            const globalJsContentsEsm = yield generateAppGlobalScript(config, compilerCtx, buildCtx, appRegistry);
            const hasAppGlobalImport = !!(globalJsContentsEsm && globalJsContentsEsm.length);
            if (hasAppGlobalImport) {
                jsContent = `import appGlobal from './${getGlobalEsmFileName(config)}';\n${jsContent}`;
            }
            else {
                jsContent = `var appGlobal = function(){};\n${jsContent}`;
            }
            // figure out which sections should be included in the core build
            const buildConditionals = yield setBuildConditionals(config, compilerCtx, 'esm.es5', buildCtx, entryModules);
            yield generateEsmCoreEs5(config, compilerCtx, buildCtx, outputTarget, buildConditionals, jsContent);
        }
    });
}
function generateEsmCoreEs5(config, compilerCtx, buildCtx, outputTarget, buildConditionals, jsContent) {
    return __awaiter$W(this, void 0, void 0, function* () {
        const coreEsm = getCoreEsmBuildPath(config, outputTarget, 'es5');
        const relPath = config.sys.path.relative(config.rootDir, coreEsm);
        const timespan = buildCtx.createTimeSpan(`generateEsmCoreEs5 started, ${relPath}`, true);
        buildConditionals.es5 = true;
        jsContent = yield buildCoreContent(config, compilerCtx, buildCtx, buildConditionals, jsContent);
        // fighting with typescript/webpack/es5 builds too much
        // #dealwithit
        jsContent = jsContent.replace('export function applyPolyfills', 'function applyPolyfills');
        jsContent = jsContent.replace('__APP__NAMESPACE__PLACEHOLDER__', config.namespace);
        jsContent = jsContent.replace('__APP__HYDRATED__CSS__PLACEHOLDER__', config.hydratedCssClass);
        jsContent = generatePreamble(config, { prefix: `${config.namespace}: Core, ES5` }) + '\n' + jsContent;
        yield compilerCtx.fs.writeFile(coreEsm, jsContent);
        timespan.finish(`generateEsmCoreEs5 finished, ${relPath}`);
    });
}

var __awaiter$X = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateEs5DisabledMessage(config, compilerCtx, outputTarget) {
    return __awaiter$X(this, void 0, void 0, function* () {
        // not doing an es5 right now
        // but it's possible during development the user
        // tests on a browser that doesn't support es2017
        const fileName = 'es5-build-disabled.js';
        const filePath = pathJoin(config, getAppBuildDir(config, outputTarget), fileName);
        yield compilerCtx.fs.writeFile(filePath, getDisabledMessageScript());
        return fileName;
    });
}
function getDisabledMessageScript() {
    const html = `
  <style>
  body {
    font-family: sans-serif;
    padding: 20px;
    line-height:22px;
  }
  h1 {
    font-size: 18px;
  }
  h2 {
    font-size: 14px;
    margin-top: 40px;
  }
  </style>

  <h1>This Stencil app is disabled for this browser.</h1>

  <h2>Developers:</h2>
  <ul>
    <li>ES5 builds are disabled <strong>during development</strong> to take advantage of 2x faster build times.</li>
    <li>Please see the example below or our <a href="https://stenciljs.com/docs/stencil-config" target="_blank">config docs</a> if you would like to develop on a browser that does not fully support ES2017 and custom elements.</li>
    <li>Note that by default, ES5 builds and polyfills are enabled during production builds.</li>
    <li>When testing browsers it is recommended to always test in production mode, and ES5 builds should always be enabled during production builds.</li>
    <li><em>This is only an experiement and if it slows down app development then we will revert this and enable ES5 builds during dev.</em></li>
  </ul>


  <h2>Enabling ES5 builds during development:</h2>
  <pre>
    <code>npm run dev --es5</code>
  </pre>
  <p>For stencil-component-starter, use:</p>
  <pre>
    <code>npm start --es5</code>
  </pre>


  <h2>Enabling full production builds during development:</h2>
  <pre>
    <code>npm run dev --prod</code>
  </pre>
  <p>For stencil-component-starter, use:</p>
  <pre>
    <code>npm start --prod</code>
  </pre>

  <h2>Current Browser's Support:</h2>
  <ul>
    <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import">ES Module Imports</a>: <span id="es-modules-test"></span></li>
    <li><a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/customElements">Custom Elements</a>: <span id="custom-elements-test"></span></li>
    <li><a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API">fetch</a>: <span id="fetch-test"></span></li>
    <li><a href="https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_variables">CSS Variables</a>: <span id="css-variables-test"></span></li>
  </ul>

  <h2>Current Browser:</h2>
  <pre>
    <code id="current-browser-output"></code>
  </pre>
  `;
    const script = `
    document.body.innerHTML = '${html.replace(/\r\n|\r|\n/g, '').replace(/\'/g, `\\'`).trim()}';

    document.getElementById('current-browser-output').textContent = window.navigator.userAgent;
    document.getElementById('es-modules-test').textContent = !!('noModule' in document.createElement('script'));
    document.getElementById('custom-elements-test').textContent = !!(window.customElements);
    document.getElementById('css-variables-test').textContent = !!(window.CSS && window.CSS.supports && window.CSS.supports('color', 'var(--c)'));
    document.getElementById('fetch-test').textContent = !!(window.fetch);
  `;
    // timeout just to ensure <body> is ready
    return `setTimeout(function(){ ${script} }, 10)`;
}

var __awaiter$Y = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateLoader(config, compilerCtx, buildCtx, outputTarget, appRegistry, cmpRegistry) {
    return __awaiter$Y(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return null;
        }
        const appLoaderPath = getLoaderPath(config, outputTarget);
        const relPath = config.sys.path.relative(config.rootDir, appLoaderPath);
        const timeSpan = buildCtx.createTimeSpan(`generateLoader started, ${relPath}`, true);
        let loaderContent = yield config.sys.getClientCoreFile({ staticName: CLIENT_LOADER_SOURCE });
        loaderContent = injectAppIntoLoader(config, outputTarget, appRegistry.core, appRegistry.corePolyfilled, config.hydratedCssClass, cmpRegistry, loaderContent);
        if (config.minifyJs) {
            // minify the loader which should always be es5
            const minifyJsResults = yield minifyJs(config, compilerCtx, loaderContent, 'es5', true, buildCtx.timestamp);
            if (minifyJsResults.diagnostics.length > 0) {
                buildCtx.diagnostics.push(...minifyJsResults.diagnostics);
            }
            else {
                loaderContent = minifyJsResults.output;
            }
        }
        else {
            // dev
            loaderContent = generatePreamble(config, { suffix: buildCtx.timestamp }) + '\n' + loaderContent;
        }
        yield compilerCtx.fs.writeFile(appLoaderPath, loaderContent);
        timeSpan.finish(`generateLoader finished, ${relPath}`);
        return loaderContent;
    });
}
const CLIENT_LOADER_SOURCE = `loader.js`;
function injectAppIntoLoader(config, outputTarget, appCoreFileName, appCorePolyfilledFileName, hydratedCssClass, cmpRegistry, loaderContent) {
    const cmpLoaderRegistry = formatBrowserLoaderComponentRegistry(cmpRegistry);
    const cmpLoaderRegistryStr = JSON.stringify(cmpLoaderRegistry);
    const resourcesUrl = outputTarget.resourcesUrl ? `"${outputTarget.resourcesUrl}"` : 0;
    const loaderArgs = [
        `"${config.namespace}"`,
        `"${config.fsNamespace}"`,
        `${resourcesUrl}`,
        `"${appCoreFileName}"`,
        `"${appCorePolyfilledFileName}"`,
        `"${hydratedCssClass}"`,
        cmpLoaderRegistryStr,
        'HTMLElement.prototype'
    ].join(',');
    return loaderContent.replace(APP_NAMESPACE_REGEX, loaderArgs);
}

var __awaiter$Z = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateAppFiles(config, compilerCtx, buildCtx, entryModules, cmpRegistry) {
    return __awaiter$Z(this, void 0, void 0, function* () {
        if (canSkipAppFiles(buildCtx, cmpRegistry)) {
            return;
        }
        const outputTargets = config.outputTargets.filter(outputTarget => {
            return outputTarget.appBuild;
        });
        if (outputTargets.length === 0) {
            return;
        }
        const timespan = buildCtx.createTimeSpan(`generate app files started`);
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$Z(this, void 0, void 0, function* () {
            yield generateAppFilesOutputTarget(config, compilerCtx, buildCtx, outputTarget, entryModules, cmpRegistry);
        })));
        timespan.finish(`generate app files finished`);
    });
}
function generateAppFilesOutputTarget(config, compilerCtx, buildCtx, outputTarget, entryModules, cmpRegistry) {
    return __awaiter$Z(this, void 0, void 0, function* () {
        if (!config.buildAppCore) {
            return;
        }
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        try {
            // generate the shared app registry object
            const appRegistry = createAppRegistry(config);
            yield Promise.all([
                // browser core esm build
                generateBrowserCoreEsm(config, compilerCtx, buildCtx, outputTarget, entryModules, appRegistry),
                // browser core es5 build
                generateBrowserCoreEs5(config, compilerCtx, buildCtx, outputTarget, entryModules, appRegistry),
                // core esm
                generateEsmCore(config, compilerCtx, buildCtx, outputTarget, entryModules, appRegistry)
            ]);
            yield Promise.all([
                // create a json file for the app registry
                writeAppRegistry(config, compilerCtx, buildCtx, outputTarget, appRegistry, cmpRegistry),
                // create the loader(s) after creating the loader file name
                generateLoader(config, compilerCtx, buildCtx, outputTarget, appRegistry, cmpRegistry),
                // create the custom elements file
                generateEsmHosts(config, compilerCtx, cmpRegistry, outputTarget)
            ]);
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
    });
}
function generateBrowserCoreEsm(config, compilerCtx, buildCtx, outputTarget, entryModules, appRegistry) {
    return __awaiter$Z(this, void 0, void 0, function* () {
        // browser esm core build
        const globalJsContentsEsm = yield generateAppGlobalScript(config, compilerCtx, buildCtx, appRegistry);
        // figure out which sections should be included in the core build
        const buildConditionals = yield setBuildConditionals(config, compilerCtx, 'core', buildCtx, entryModules);
        const coreFilename = yield generateCoreBrowser(config, compilerCtx, buildCtx, outputTarget, globalJsContentsEsm, buildConditionals);
        appRegistry.core = coreFilename;
    });
}
function generateBrowserCoreEs5(config, compilerCtx, buildCtx, outputTarget, entryModules, appRegistry) {
    return __awaiter$Z(this, void 0, void 0, function* () {
        if (config.buildEs5) {
            // browser core es5 build
            const globalJsContentsEs5 = yield generateAppGlobalScript(config, compilerCtx, buildCtx, appRegistry, 'es5');
            const buildConditionalsEs5 = yield setBuildConditionals(config, compilerCtx, 'core.pf', buildCtx, entryModules);
            const coreFilenameEs5 = yield generateCoreBrowser(config, compilerCtx, buildCtx, outputTarget, globalJsContentsEs5, buildConditionalsEs5);
            appRegistry.corePolyfilled = coreFilenameEs5;
        }
        else {
            // not doing an es5, probably in dev mode
            appRegistry.corePolyfilled = yield generateEs5DisabledMessage(config, compilerCtx, outputTarget);
        }
    });
}
function canSkipAppFiles(buildCtx, cmpRegistry) {
    if (buildCtx.hasError || !cmpRegistry) {
        return true;
    }
    if (buildCtx.requiresFullBuild) {
        return false;
    }
    if (buildCtx.isRebuild) {
        if (buildCtx.hasScriptChanges) {
            return false;
        }
        return true;
    }
    return false;
}

var __awaiter$_ = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateBundles(config, compilerCtx, buildCtx, entryModules, jsModules) {
    return __awaiter$_(this, void 0, void 0, function* () {
        if (canSkipGenerateBundles(buildCtx)) {
            return {};
        }
        // both styles and modules are done bundling
        // combine the styles and modules together
        // generate the actual files to write
        const timeSpan = buildCtx.createTimeSpan(`generate bundles started`);
        const bundleKeys = {};
        yield generateBundleModes(config, compilerCtx, buildCtx, entryModules, jsModules, bundleKeys);
        yield Promise.all([
            genereateBrowserEsm(config, compilerCtx, buildCtx, jsModules, bundleKeys),
            genereateBrowserEs5(config, compilerCtx, buildCtx, jsModules, bundleKeys),
            genereateEsmEs5(config, compilerCtx, buildCtx, jsModules, bundleKeys)
        ]);
        // create the registry of all the components
        const cmpRegistry = createComponentRegistry(entryModules);
        timeSpan.finish(`generate bundles finished`);
        return cmpRegistry;
    });
}
function genereateBrowserEsm(config, compilerCtx, buildCtx, jsModules, bundleKeys) {
    return __awaiter$_(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        const timeSpan = buildCtx.createTimeSpan(`genereateBrowserEsm started`, true);
        const esmModules = jsModules.esm;
        const entryKeys = Object.keys(esmModules);
        buildCtx.bundleBuildCount += entryKeys.length;
        const esmPromises = entryKeys
            .filter(entryKey => !bundleKeys[entryKey])
            .map(entryKey => { return [entryKey, esmModules[entryKey]]; })
            .map(([entryKey, value]) => __awaiter$_(this, void 0, void 0, function* () {
            const fileName = getBrowserFilename(entryKey.replace('.js', ''), false, 'es2017');
            const jsText = replaceBundleIdPlaceholder(value.code, entryKey);
            yield writeBundleJSFile(config, compilerCtx, fileName, jsText);
        }));
        yield Promise.all(esmPromises);
        timeSpan.finish(`genereateBrowserEsm finished`);
    });
}
function genereateBrowserEs5(config, compilerCtx, buildCtx, jsModules, bundleKeys) {
    return __awaiter$_(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        if (config.buildEs5) {
            const timeSpan = buildCtx.createTimeSpan(`genereateBrowserEs5 started`, true);
            const es5Modules = jsModules.es5;
            const entryKeys = Object.keys(es5Modules);
            const es5Promises = entryKeys
                .filter(entryKey => !bundleKeys[entryKey])
                .map(entryKey => { return [entryKey, es5Modules[entryKey]]; })
                .map(([entryKey, value]) => __awaiter$_(this, void 0, void 0, function* () {
                const fileName = getBrowserFilename(entryKey.replace('.js', ''), false, 'es5');
                let jsText = replaceBundleIdPlaceholder(value.code, entryKey);
                jsText = yield transpileEs5Bundle(config, compilerCtx, buildCtx, jsText);
                if (config.minifyJs) {
                    const results = yield minifyJs(config, compilerCtx, jsText, 'es5', true);
                    if (results.diagnostics.length === 0) {
                        jsText = results.output;
                    }
                }
                yield writeBundleJSFile(config, compilerCtx, fileName, jsText);
            }));
            yield Promise.all(es5Promises);
            timeSpan.finish(`genereateBrowserEs5 finished`);
        }
    });
}
function genereateEsmEs5(config, compilerCtx, buildCtx, jsModules, bundleKeys) {
    return __awaiter$_(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        const distOutputs = config.outputTargets.filter(o => o.type === 'dist');
        if (!distOutputs.length) {
            return;
        }
        const timeSpan = buildCtx.createTimeSpan(`genereateEsmEs5 started`, true);
        yield Promise.all(distOutputs.map((distOutput) => __awaiter$_(this, void 0, void 0, function* () {
            const es5Modules = jsModules.esmEs5;
            const es5Promises = Object.keys(es5Modules)
                .filter(key => !bundleKeys[key])
                .map(key => { return [key, es5Modules[key]]; })
                .map(([key, value]) => __awaiter$_(this, void 0, void 0, function* () {
                const fileName = getBrowserFilename(key.replace('.js', ''), false);
                let jsText = replaceBundleIdPlaceholder(value.code, key);
                jsText = yield transpileEs5Bundle(config, compilerCtx, buildCtx, jsText);
                const distBuildPath = pathJoin(config, getDistEsmBuildDir(config, distOutput), 'es5', fileName);
                return compilerCtx.fs.writeFile(distBuildPath, jsText);
            }));
            yield Promise.all(es5Promises);
        })));
        timeSpan.finish(`genereateEsmEs5 finished`);
    });
}
function writeBundleJSFile(config, compilerCtx, fileName, jsText) {
    return __awaiter$_(this, void 0, void 0, function* () {
        const outputTargets = config.outputTargets.filter(outputTarget => outputTarget.appBuild);
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$_(this, void 0, void 0, function* () {
            // get the absolute path to where it'll be saved in www
            const wwwBuildPath = pathJoin(config, getAppBuildDir(config, outputTarget), fileName);
            // write to the www build
            yield compilerCtx.fs.writeFile(wwwBuildPath, jsText);
        })));
    });
}
function generateBundleModes(config, compilerCtx, buildCtx, entryModules, jsModules, bundleKeys) {
    return __awaiter$_(this, void 0, void 0, function* () {
        const timeSpan = buildCtx.createTimeSpan(`generateBundleModes started`, true);
        const promises = entryModules.map((entryModule) => __awaiter$_(this, void 0, void 0, function* () {
            yield generateBundleModesEntryModule(config, compilerCtx, buildCtx, jsModules, bundleKeys, entryModule);
        }));
        yield Promise.all(promises);
        timeSpan.finish(`generateBundleModes finished`);
    });
}
function generateBundleModesEntryModule(config, compilerCtx, buildCtx, jsModules, bundleKeys, entryModule) {
    return __awaiter$_(this, void 0, void 0, function* () {
        const bundleKeyPath = `${entryModule.entryKey}.js`;
        bundleKeys[bundleKeyPath] = entryModule.entryKey;
        entryModule.modeNames = entryModule.modeNames || [];
        const promises = entryModule.modeNames.map((modeName) => __awaiter$_(this, void 0, void 0, function* () {
            yield generateBundleModesEntryModuleMode(config, compilerCtx, buildCtx, jsModules, entryModule, bundleKeyPath, modeName);
        }));
        yield Promise.all(promises);
    });
}
function generateBundleModesEntryModuleMode(config, compilerCtx, buildCtx, jsModules, entryModule, bundleKeyPath, modeName) {
    return __awaiter$_(this, void 0, void 0, function* () {
        const jsCode = Object.keys(jsModules).reduce((all, moduleType) => {
            if (!jsModules[moduleType][bundleKeyPath] || !jsModules[moduleType][bundleKeyPath].code) {
                return all;
            }
            return Object.assign({}, all, { [moduleType]: jsModules[moduleType][bundleKeyPath].code });
        }, {});
        yield generateBundleMode(config, compilerCtx, buildCtx, entryModule, modeName, jsCode);
    });
}
function generateBundleMode(config, compilerCtx, buildCtx, entryModule, modeName, jsCode) {
    return __awaiter$_(this, void 0, void 0, function* () {
        // create js text for: mode, no scoped styles and esm
        let jsText = yield createBundleJsText(config, compilerCtx, buildCtx, entryModule, jsCode.esm, modeName, false);
        // the only bundle id comes from mode, no scoped styles and esm
        const bundleId = getBundleId(config, entryModule, modeName, jsText);
        // assign the bundle id build from the
        // mode, no scoped styles and esm to each of the components
        entryModule.moduleFiles.forEach(moduleFile => {
            moduleFile.cmpMeta.bundleIds = moduleFile.cmpMeta.bundleIds || {};
            if (typeof moduleFile.cmpMeta.bundleIds === 'object') {
                moduleFile.cmpMeta.bundleIds[modeName] = bundleId;
            }
        });
        // generate the bundle build for mode, no scoped styles, and esm
        yield generateBundleBrowserBuild(config, compilerCtx, entryModule, jsText, bundleId, modeName, false);
        if (entryModule.requiresScopedStyles) {
            // create js text for: mode, scoped styles, esm
            jsText = yield createBundleJsText(config, compilerCtx, buildCtx, entryModule, jsCode.esm, modeName, true);
            // generate the bundle build for: mode, esm and scoped styles
            yield generateBundleBrowserBuild(config, compilerCtx, entryModule, jsText, bundleId, modeName, true);
        }
        if (config.buildEs5) {
            // create js text for: mode, no scoped styles, es5
            jsText = yield createBundleJsText(config, compilerCtx, buildCtx, entryModule, jsCode.es5, modeName, false, 'es5');
            // generate the bundle build for: mode, no scoped styles and es5
            yield generateBundleBrowserBuild(config, compilerCtx, entryModule, jsText, bundleId, modeName, false, 'es5');
            if (entryModule.requiresScopedStyles) {
                // create js text for: mode, scoped styles, es5
                jsText = yield createBundleJsText(config, compilerCtx, buildCtx, entryModule, jsCode.es5, modeName, true, 'es5');
                // generate the bundle build for: mode, es5 and scoped styles
                yield generateBundleBrowserBuild(config, compilerCtx, entryModule, jsText, bundleId, modeName, true, 'es5');
            }
        }
        if (config.outputTargets.some(o => o.type === 'dist')) {
            // esm module with es5 target, not scoped
            jsText = yield createBundleJsText(config, compilerCtx, buildCtx, entryModule, jsCode.esmEs5, modeName, false, 'es5');
            yield generateBundleEsmBuild(config, compilerCtx, entryModule, jsText, bundleId, modeName, false, 'es5');
            if (entryModule.requiresScopedStyles) {
                jsText = yield createBundleJsText(config, compilerCtx, buildCtx, entryModule, jsCode.esmEs5, modeName, true, 'es5');
                yield generateBundleEsmBuild(config, compilerCtx, entryModule, jsText, bundleId, modeName, true, 'es5');
            }
        }
    });
}
function createBundleJsText(config, compilerCtx, buildCtx, entryModules, jsText, modeName, isScopedStyles, sourceTarget) {
    return __awaiter$_(this, void 0, void 0, function* () {
        if (sourceTarget === 'es5') {
            // use legacy bundling with commonjs/jsonp modules
            // and transpile the build to es5
            jsText = yield transpileEs5Bundle(config, compilerCtx, buildCtx, jsText);
        }
        if (config.minifyJs) {
            // minify the bundle js text
            const minifyJsResults = yield minifyJs(config, compilerCtx, jsText, sourceTarget, true);
            if (minifyJsResults.diagnostics.length) {
                minifyJsResults.diagnostics.forEach(d => {
                    buildCtx.diagnostics.push(d);
                });
            }
            else {
                jsText = minifyJsResults.output;
            }
        }
        return injectStyleMode(entryModules.moduleFiles, jsText, modeName, isScopedStyles);
    });
}
function generateBundleBrowserBuild(config, compilerCtx, entryModule, jsText, bundleId, modeName, isScopedStyles, sourceTarget) {
    return __awaiter$_(this, void 0, void 0, function* () {
        // create the file name
        const fileName = getBrowserFilename(bundleId, isScopedStyles, sourceTarget);
        // update the bundle id placeholder with the actual bundle id
        // this is used by jsonp callbacks to know which bundle loaded
        jsText = replaceBundleIdPlaceholder(jsText, bundleId);
        const entryBundle = {
            fileName: fileName,
            text: jsText,
            outputs: [],
            modeName: modeName,
            sourceTarget: sourceTarget,
            isScopedStyles: isScopedStyles
        };
        entryModule.entryBundles = entryModule.entryBundles || [];
        entryModule.entryBundles.push(entryBundle);
        const outputTargets = config.outputTargets.filter(outputTarget => {
            return outputTarget.appBuild;
        });
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$_(this, void 0, void 0, function* () {
            // get the absolute path to where it'll be saved
            const wwwBuildPath = pathJoin(config, getAppBuildDir(config, outputTarget), fileName);
            // write to the build
            yield compilerCtx.fs.writeFile(wwwBuildPath, jsText);
            entryBundle.outputs.push(wwwBuildPath);
        })));
    });
}
function generateBundleEsmBuild(config, compilerCtx, entryModule, jsText, bundleId, modeName, isScopedStyles, sourceTarget) {
    return __awaiter$_(this, void 0, void 0, function* () {
        // create the file name
        const fileName = getEsmFilename(bundleId, isScopedStyles);
        // update the bundle id placeholder with the actual bundle id
        // this is used by jsonp callbacks to know which bundle loaded
        jsText = replaceBundleIdPlaceholder(jsText, bundleId);
        const entryBundle = {
            fileName: fileName,
            text: jsText,
            outputs: [],
            modeName: modeName,
            sourceTarget: sourceTarget,
            isScopedStyles: isScopedStyles
        };
        entryModule.entryBundles = entryModule.entryBundles || [];
        entryModule.entryBundles.push(entryBundle);
        const outputTargets = config.outputTargets.filter(o => o.type === 'dist');
        yield Promise.all(outputTargets.map((outputTarget) => __awaiter$_(this, void 0, void 0, function* () {
            // get the absolute path to where it'll be saved
            const esmBuildPath = pathJoin(config, getDistEsmBuildDir(config, outputTarget), 'es5', fileName);
            // write to the build
            yield compilerCtx.fs.writeFile(esmBuildPath, jsText);
            entryBundle.outputs.push(esmBuildPath);
        })));
    });
}
function injectStyleMode(moduleFiles, jsText, modeName, isScopedStyles) {
    moduleFiles.forEach(moduleFile => {
        jsText = injectComponentStyleMode(moduleFile.cmpMeta, modeName, jsText, isScopedStyles);
    });
    return jsText;
}
function injectComponentStyleMode(cmpMeta, modeName, jsText, isScopedStyles) {
    if (typeof jsText !== 'string') {
        return '';
    }
    const stylePlaceholder = getStylePlaceholder(cmpMeta.tagNameMeta);
    const stylePlaceholderId = getStyleIdPlaceholder(cmpMeta.tagNameMeta);
    let styleText = '';
    if (cmpMeta.stylesMeta) {
        let modeStyles = cmpMeta.stylesMeta[modeName];
        if (modeStyles) {
            if (isScopedStyles) {
                // we specifically want scoped css
                styleText = modeStyles.compiledStyleTextScoped;
            }
            if (!styleText) {
                // either we don't want scoped css
                // or we DO want scoped css, but we don't have any
                // use the un-scoped css
                styleText = modeStyles.compiledStyleText || '';
            }
        }
        else {
            modeStyles = cmpMeta.stylesMeta[DEFAULT_STYLE_MODE];
            if (modeStyles) {
                if (isScopedStyles) {
                    // we specifically want scoped css
                    styleText = modeStyles.compiledStyleTextScoped;
                }
                if (!styleText) {
                    // either we don't want scoped css
                    // or we DO want scoped css, but we don't have any
                    // use the un-scoped css
                    styleText = modeStyles.compiledStyleText || '';
                }
            }
        }
    }
    // replace the style placeholder string that's already in the js text
    jsText = jsText.replace(stylePlaceholder, styleText);
    // replace the style id placeholder string that's already in the js text
    jsText = jsText.replace(stylePlaceholderId, modeName);
    // return the js text with the newly inject style
    return jsText;
}
function transpileEs5Bundle(config, compilerCtx, buildCtx, jsText) {
    return __awaiter$_(this, void 0, void 0, function* () {
        // use typescript to convert this js text into es5
        const transpileResults = yield transpileToEs5Main(config, compilerCtx, jsText);
        if (transpileResults.diagnostics && transpileResults.diagnostics.length > 0) {
            buildCtx.diagnostics.push(...transpileResults.diagnostics);
            if (hasError(transpileResults.diagnostics)) {
                return jsText;
            }
        }
        return transpileResults.code;
    });
}
function getBundleId(config, entryModule, modeName, jsText) {
    if (config.hashFileNames) {
        // create style id from hashing the content
        return config.sys.generateContentHash(jsText, config.hashedFileNameLength);
    }
    return getBundleIdDev(entryModule, modeName);
}
function getBundleIdDev(entryModule, modeName) {
    const tags = entryModule.moduleFiles
        .sort((a, b) => {
        if (a.isCollectionDependency && !b.isCollectionDependency) {
            return 1;
        }
        if (!a.isCollectionDependency && b.isCollectionDependency) {
            return -1;
        }
        if (a.cmpMeta.tagNameMeta < b.cmpMeta.tagNameMeta)
            return -1;
        if (a.cmpMeta.tagNameMeta > b.cmpMeta.tagNameMeta)
            return 1;
        return 0;
    })
        .map(m => m.cmpMeta.tagNameMeta);
    if (modeName === DEFAULT_STYLE_MODE || !modeName) {
        return tags[0];
    }
    return `${tags[0]}.${modeName}`;
}
function createComponentRegistry(entryModules) {
    const registryComponents = [];
    const cmpRegistry = {};
    return entryModules
        .reduce((rcs, bundle) => {
        const cmpMetas = bundle.moduleFiles
            .filter(m => m.cmpMeta)
            .map(moduleFile => moduleFile.cmpMeta);
        return rcs.concat(cmpMetas);
    }, registryComponents)
        .sort((a, b) => {
        if (a.tagNameMeta < b.tagNameMeta)
            return -1;
        if (a.tagNameMeta > b.tagNameMeta)
            return 1;
        return 0;
    })
        .reduce((registry, cmpMeta) => {
        return Object.assign({}, registry, { [cmpMeta.tagNameMeta]: cmpMeta });
    }, cmpRegistry);
}
function canSkipGenerateBundles(buildCtx) {
    if (buildCtx.hasError || !buildCtx.isActiveBuild) {
        return true;
    }
    if (buildCtx.requiresFullBuild) {
        return false;
    }
    if (buildCtx.isRebuild) {
        if (buildCtx.hasScriptChanges || buildCtx.hasStyleChanges) {
            return false;
        }
        return true;
    }
    return false;
}
const EXTS = ['tsx', 'ts', 'js', 'css'];
PLUGIN_HELPERS.forEach(p => p.pluginExts.forEach(pe => EXTS.push(pe)));

function generateServiceWorkerUrl(config, outputTarget) {
    let swUrl = normalizePath(config.sys.path.relative(outputTarget.dir, outputTarget.serviceWorker.swDest));
    if (swUrl.charAt(0) !== '/') {
        swUrl = '/' + swUrl;
    }
    swUrl = outputTarget.baseUrl + swUrl.substring(1);
    return swUrl;
}
function appendSwScript(indexHtml, htmlToAppend) {
    const match = indexHtml.match(BODY_CLOSE_REG);
    if (match) {
        indexHtml = indexHtml.replace(match[0], `${htmlToAppend}\n${match[0]}`);
    }
    else {
        indexHtml += '\n' + htmlToAppend;
    }
    return indexHtml;
}
const BODY_CLOSE_REG = /<\/body>/i;

var __awaiter$10 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function updateIndexHtmlServiceWorker(config, buildCtx, outputTarget, indexHtml) {
    return __awaiter$10(this, void 0, void 0, function* () {
        if (!outputTarget.serviceWorker && config.devMode) {
            // if we're not generating a sw, and this is a dev build
            // then let's inject a script that always unregisters any service workers
            indexHtml = injectUnregisterServiceWorker(indexHtml);
        }
        else if (outputTarget.serviceWorker) {
            // we have a valid sw config, so we'll need to inject the register sw script
            indexHtml = yield injectRegisterServiceWorker(config, buildCtx, outputTarget, indexHtml);
        }
        return indexHtml;
    });
}
function injectRegisterServiceWorker(config, buildCtx, outputTarget, indexHtml) {
    return __awaiter$10(this, void 0, void 0, function* () {
        const swUrl = generateServiceWorkerUrl(config, outputTarget);
        const serviceWorker = getRegisterSwScript(swUrl);
        const swHtml = `<script data-build="${buildCtx.timestamp}">${serviceWorker}</script>`;
        return appendSwScript(indexHtml, swHtml);
    });
}
function injectUnregisterServiceWorker(indexHtml) {
    return appendSwScript(indexHtml, UNREGSITER_SW);
}
function getRegisterSwScript(swUrl) {
    return `
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('${swUrl}')
          .then(function(reg) {
            reg.onupdatefound = function() {
              var installingWorker = reg.installing;
              installingWorker.onstatechange = function() {
                if (installingWorker.state === 'installed') {
                  window.dispatchEvent(new Event('swUpdate'))
                }
              }
            }
          })
          .catch(function(err) { console.error('service worker error', err) });
      });
    }
`;
}
const UNREGSITER_SW = `
  <script>
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      // auto-unregister service worker during dev mode
      navigator.serviceWorker.getRegistration().then(function(registration) {
        if (registration) {
          registration.unregister().then(function() { location.reload(true) });
        }
      });
    }
  </script>
`;

var __awaiter$11 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateIndexHtmls(config, compilerCtx, buildCtx) {
    return __awaiter$11(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        const indexHtmlOutputs = config.outputTargets.filter(o => o.indexHtml);
        yield Promise.all(indexHtmlOutputs.map((outputTarget) => __awaiter$11(this, void 0, void 0, function* () {
            yield generateIndexHtml(config, compilerCtx, buildCtx, outputTarget);
        })));
    });
}
function generateIndexHtml(config, compilerCtx, buildCtx, outputTarget) {
    return __awaiter$11(this, void 0, void 0, function* () {
        if (!outputTarget.indexHtml || !config.srcIndexHtml) {
            return;
        }
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        if (compilerCtx.hasSuccessfulBuild && buildCtx.appFileBuildCount === 0 && !buildCtx.hasIndexHtmlChanges) {
            // no need to rebuild index.html if there were no app file changes
            return;
        }
        // get the source index html content
        try {
            let indexSrcHtml = yield compilerCtx.fs.readFile(config.srcIndexHtml);
            try {
                indexSrcHtml = yield updateIndexHtmlServiceWorker(config, buildCtx, outputTarget, indexSrcHtml);
                // add the prerendered html to our list of files to write
                yield compilerCtx.fs.writeFile(outputTarget.indexHtml, indexSrcHtml);
                buildCtx.debug(`optimizeHtml, write: ${config.sys.path.relative(config.rootDir, outputTarget.indexHtml)}`);
            }
            catch (e) {
                catchError(buildCtx.diagnostics, e);
            }
        }
        catch (e) {
            // it's ok if there's no index file
            buildCtx.debug(`no index html: ${config.srcIndexHtml}`);
        }
    });
}

function abortPlugin(buildCtx) {
    // this plugin is only used to ensure we're not trying to bundle
    // when it's no longer the active build. So in a way we're canceling
    // any bundling for previous builds still running since everything is async.
    return {
        name: 'abortPlugin',
        resolveId() {
            if (!buildCtx.isActiveBuild) {
                return `_not_active_build.js`;
            }
            return null;
        },
        load() {
            if (!buildCtx.isActiveBuild) {
                return `/* build aborted */`;
            }
            return null;
        }
    };
}

function bundleJson(config, options = {}) {
    const path$$1 = config.sys.path;
    const filter = rollupPluginutils.createFilter(options.include, options.exclude);
    const collectionDirs = config.outputTargets.filter(o => o.collectionDir).map(o => o.collectionDir);
    return {
        name: 'json',
        resolveId(importee, importer) {
            if (importer && importee.endsWith('.json')) {
                const collectionDir = collectionDirs.find(cd => importer.startsWith(cd));
                if (collectionDir) {
                    return path$$1.resolve(path$$1.dirname(importer).replace(collectionDir, config.srcDir), importee);
                }
            }
            return null;
        },
        transform(json, id) {
            if (id.slice(-5) !== '.json')
                return null;
            if (!filter(id))
                return null;
            const data = JSON.parse(json);
            let code = '';
            const ast = {
                type: 'Program',
                sourceType: 'module',
                start: 0,
                end: null,
                body: []
            };
            if (Object.prototype.toString.call(data) !== '[object Object]') {
                code = `export default ${json};`;
                ast.body.push({
                    type: 'ExportDefaultDeclaration',
                    start: 0,
                    end: code.length,
                    declaration: {
                        type: 'Literal',
                        start: 15,
                        end: code.length - 1,
                        value: null,
                        raw: 'null'
                    }
                });
            }
            else {
                const indent = 'indent' in options ? options.indent : '\t';
                const validKeys = [];
                const invalidKeys = [];
                Object.keys(data).forEach(key => {
                    if (key === rollupPluginutils.makeLegalIdentifier(key)) {
                        validKeys.push(key);
                    }
                    else {
                        invalidKeys.push(key);
                    }
                });
                let char = 0;
                validKeys.forEach(key => {
                    const declarationType = options.preferConst ? 'const' : 'var';
                    const declaration = `export ${declarationType} ${key} = ${JSON.stringify(data[key])};`;
                    const start = char;
                    const end = start + declaration.length;
                    // generate fake AST node while we're here
                    ast.body.push({
                        type: 'ExportNamedDeclaration',
                        start: char,
                        end: char + declaration.length,
                        declaration: {
                            type: 'VariableDeclaration',
                            start: start + 7,
                            end,
                            declarations: [
                                {
                                    type: 'VariableDeclarator',
                                    start: start + 7 + declarationType.length + 1,
                                    end: end - 1,
                                    id: {
                                        type: 'Identifier',
                                        start: start + 7 + declarationType.length + 1,
                                        end: start + 7 + declarationType.length + 1 + key.length,
                                        name: key
                                    },
                                    init: {
                                        type: 'Literal',
                                        start: start +
                                            7 +
                                            declarationType.length +
                                            1 +
                                            key.length +
                                            3,
                                        end: end - 1,
                                        value: null,
                                        raw: 'null'
                                    }
                                }
                            ],
                            kind: declarationType
                        },
                        specifiers: [],
                        source: null
                    });
                    char = end + 1;
                    code += `${declaration}\n`;
                });
                const defaultExportNode = {
                    type: 'ExportDefaultDeclaration',
                    start: char,
                    end: null,
                    declaration: {
                        type: 'ObjectExpression',
                        start: char + 15,
                        end: null,
                        properties: []
                    }
                };
                char += 17 + indent.length; // 'export default {\n\t'.length'
                const defaultExportRows = validKeys
                    .map(key => {
                    const row = `${key}: ${key}`;
                    const start = char;
                    const end = start + row.length;
                    defaultExportNode.declaration.properties.push({
                        type: 'Property',
                        start,
                        end,
                        method: false,
                        shorthand: false,
                        computed: false,
                        key: {
                            type: 'Identifier',
                            start,
                            end: start + key.length,
                            name: key
                        },
                        value: {
                            type: 'Identifier',
                            start: start + key.length + 2,
                            end,
                            name: key
                        },
                        kind: 'init'
                    });
                    char += row.length + (2 + indent.length); // ',\n\t'.length
                    return row;
                })
                    .concat(invalidKeys.map(key => `"${key}": ${JSON.stringify(data[key])}`));
                code += `export default {\n${indent}${defaultExportRows.join(`,\n${indent}`)}\n};`;
                ast.body.push(defaultExportNode);
                const end = code.length;
                defaultExportNode.declaration.end = end - 1;
                defaultExportNode.end = end;
            }
            ast.end = code.length;
            return { ast, code, map: { mappings: '' } };
        }
    };
}

var __awaiter$12 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function localResolution(config, compilerCtx) {
    return {
        name: 'localResolution',
        resolveId(importee, importer) {
            return __awaiter$12(this, void 0, void 0, function* () {
                importee = normalizePath(importee);
                if (importee.indexOf('./') === -1) {
                    return null;
                }
                if (!importer) {
                    return null;
                }
                importer = normalizePath(importer);
                if (importee.endsWith('.js')) {
                    return null;
                }
                const basename = config.sys.path.basename(importer);
                const directory = importer.split(basename)[0];
                const dirIndexFile = config.sys.path.join(directory + importee, 'index.js');
                let stats;
                try {
                    stats = yield compilerCtx.fs.stat(dirIndexFile);
                }
                catch (e) {
                    return null;
                }
                if (stats.isFile) {
                    return dirIndexFile;
                }
                return null;
            });
        }
    };
}

function nodeEnvVars(config) {
    // replace build time expressions, like process.env.NODE_ENV === 'production'
    return {
        name: 'nodeEnvVarsPlugin',
        transform(sourceText) {
            return Promise.resolve({
                code: buildExpressionReplacer(config, sourceText)
            });
        }
    };
}

function pathsResolver(config, compilerCtx, tsCompilerOptions) {
    const extensions = [
        'ts',
        'tsx'
    ];
    return {
        name: 'pathsResolverPlugin',
        resolveId(importee, importer) {
            if (!importer) {
                return null;
            }
            importee = normalizePath(importee);
            importer = normalizePath(importer);
            const paths = tsCompilerOptions.paths || {};
            // Parse each rule from tsconfig
            for (const rule in paths) {
                const normalizedRule = normalizePath(rule);
                // The rule without the wildcard
                const standaloneRule = normalizedRule.replace(/\*$/, '');
                if (importee.indexOf(standaloneRule) === 0) {
                    // Get the wildcard part from importee
                    const wildcard = importee.slice(standaloneRule.length);
                    // Parse each sub-rule of a rule
                    for (const subrule of paths[rule]) {
                        const normalizedSubrule = normalizePath(subrule);
                        // Build the subrule replacing the wildcard with actual path
                        const enrichedSubrule = normalizePath(normalizedSubrule.replace(/\*$/, wildcard));
                        const finalPath = normalizePath(config.sys.path.join(config.rootDir, enrichedSubrule));
                        const moduleFiles = compilerCtx.moduleFiles;
                        for (let i = 0; i < extensions.length; i++) {
                            const moduleFile = moduleFiles[`${finalPath}.${extensions[i]}`];
                            if (moduleFile) {
                                return moduleFile.jsFilePath;
                            }
                        }
                    }
                }
            }
            return null;
        },
    };
}

// Adapted to TS from https://github.com/rollup/rollup-plugin-replace
function escape(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}
function functor(thing) {
    if (typeof thing === 'function')
        return thing;
    return () => thing;
}
function longest(a, b) {
    return b.length - a.length;
}
function replace(options = {}) {
    const { delimiters } = options;
    let values;
    if (options.values) {
        values = options.values;
    }
    else {
        values = Object.assign({}, options);
        delete values.delimiters;
        delete values.include;
        delete values.exclude;
    }
    const keys = Object.keys(values).sort(longest).map(escape);
    const pattern = delimiters ?
        new RegExp(`${escape(delimiters[0])}(${keys.join('|')})${escape(delimiters[1])}`, 'g') :
        new RegExp(`\\b(${keys.join('|')})\\b`, 'g');
    // convert all values to functions
    Object.keys(values).forEach(key => {
        values[key] = functor(values[key]);
    });
    return {
        name: 'replace',
        transform(code, id) {
            const magicString = new MagicString(code);
            let hasReplacements = false;
            let match;
            let start, end, replacement;
            while ((match = pattern.exec(code))) {
                hasReplacements = true;
                start = match.index;
                end = start + match[0].length;
                replacement = String(values[match[1]](id));
                magicString.overwrite(start, end, replacement);
            }
            if (!hasReplacements)
                return null;
            const result = { code: magicString.toString() };
            if (options.sourcemap !== false) {
                result.map = magicString.generateMap({ hires: true });
            }
            return result;
        }
    };
}

var __awaiter$13 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function createBundle(config, compilerCtx, buildCtx, entryModules) {
    return __awaiter$13(this, void 0, void 0, function* () {
        if (!buildCtx.isActiveBuild) {
            buildCtx.debug(`createBundle aborted, not active build`);
        }
        const buildConditionals = {
            isDev: !!config.devMode
        };
        const replaceObj = Object.keys(buildConditionals).reduce((all, key) => {
            all[`Build.${key}`] = buildConditionals[key];
            return all;
        }, {});
        const timeSpan = buildCtx.createTimeSpan(`createBundle started`, true);
        const builtins = require('rollup-plugin-node-builtins');
        const globals = require('rollup-plugin-node-globals');
        let rollupBundle;
        const commonjsConfig = Object.assign({ include: 'node_modules/**', sourceMap: false }, config.commonjs);
        const nodeResolveConfig = Object.assign({ jsnext: true, main: true }, config.nodeResolve);
        const tsCompilerOptions = yield getUserCompilerOptions(config, compilerCtx);
        const rollupConfig = Object.assign({}, config.rollupConfig.inputOptions, { input: entryModules.map(b => b.filePath), experimentalCodeSplitting: true, preserveSymlinks: false, plugins: [
                abortPlugin(buildCtx),
                replace({
                    values: replaceObj
                }),
                config.sys.rollup.plugins.nodeResolve(nodeResolveConfig),
                config.sys.rollup.plugins.commonjs(commonjsConfig),
                bundleJson(config),
                globals(),
                builtins(),
                inMemoryFsRead(config, compilerCtx, buildCtx, entryModules),
                pathsResolver(config, compilerCtx, tsCompilerOptions),
                localResolution(config, compilerCtx),
                nodeEnvVars(config),
                ...config.plugins,
                abortPlugin(buildCtx)
            ], onwarn: createOnWarnFn(config, buildCtx.diagnostics) });
        try {
            rollupBundle = yield rollup.rollup(rollupConfig);
        }
        catch (err) {
            // looks like there was an error bundling!
            if (buildCtx.isActiveBuild) {
                loadRollupDiagnostics(config, compilerCtx, buildCtx, err);
            }
            else {
                buildCtx.debug(`createBundle errors ignored, not active build`);
            }
        }
        timeSpan.finish(`createBundle finished`);
        return rollupBundle;
    });
}

var __awaiter$14 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function writeEntryModules(config, compilerCtx, entryModules) {
    return __awaiter$14(this, void 0, void 0, function* () {
        const path$$1 = config.sys.path;
        yield Promise.all(entryModules.map((entryModule) => __awaiter$14(this, void 0, void 0, function* () {
            const fileContents = entryModule.moduleFiles
                .map(moduleFile => {
                const originalClassName = moduleFile.cmpMeta.componentClass;
                const pascalCasedClassName = dashToPascalCase(moduleFile.cmpMeta.tagNameMeta);
                const filePath = normalizePath(path$$1.relative(path$$1.dirname(entryModule.filePath), moduleFile.jsFilePath));
                return `export { ${originalClassName} as ${pascalCasedClassName} } from './${filePath}';`;
            })
                .join('\n');
            yield compilerCtx.fs.writeFile(entryModule.filePath, fileContents, { inMemoryOnly: true });
        })));
    });
}
function writeEsModules(config, rollupBundle) {
    return __awaiter$14(this, void 0, void 0, function* () {
        const { output } = yield rollupBundle.generate(Object.assign({}, config.rollupConfig.outputOptions, { format: 'es', banner: generatePreamble(config), intro: `const { h } = window.${config.namespace};` }));
        return output;
    });
}
function writeLegacyModules(config, rollupBundle, entryModules) {
    return __awaiter$14(this, void 0, void 0, function* () {
        if (!config.buildEs5) {
            // only create legacy modules when generating es5 fallbacks
            return null;
        }
        rollupBundle.cache.modules.forEach(module => {
            const key = module.id;
            const entryModule = entryModules.find(b => b.entryKey === `./${key}.js`);
            if (entryModule) {
                entryModule.dependencies = module.dependencies.slice();
            }
        });
        const { output } = yield rollupBundle.generate(Object.assign({}, config.rollupConfig.outputOptions, { format: 'amd', amd: {
                id: getBundleIdPlaceholder(),
                define: `${config.namespace}.loadBundle`
            }, banner: generatePreamble(config), intro: `const h = window.${config.namespace}.h;`, strict: false }));
        return output;
    });
}
function writeEsmEs5Modules(config, rollupBundle) {
    return __awaiter$14(this, void 0, void 0, function* () {
        if (config.outputTargets.some(o => o.type === 'dist')) {
            const { output } = yield rollupBundle.generate(Object.assign({}, config.rollupConfig.outputOptions, { format: 'es', banner: generatePreamble(config), intro: `import { h } from './${getHyperScriptFnEsmFileName(config)}';`, strict: false }));
            return output;
        }
        return null;
    });
}

var __awaiter$15 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateBundleModules(config, compilerCtx, buildCtx, entryModules) {
    return __awaiter$15(this, void 0, void 0, function* () {
        const results = {
            esm: {},
            es5: {},
            esmEs5: {}
        };
        if (entryModules.length === 0) {
            // no entry modules, so don't bother
            return results;
        }
        yield writeEntryModules(config, compilerCtx, entryModules);
        try {
            // run rollup, but don't generate yet
            // returned rollup bundle can be reused for es module and legacy
            const rollupBundle = yield createBundle(config, compilerCtx, buildCtx, entryModules);
            if (buildCtx.hasError || !buildCtx.isActiveBuild) {
                // rollup errored, so let's not continue
                return results;
            }
            const asyncResults = yield Promise.all([
                // [0] bundle using only es modules and dynamic imports
                yield writeEsModules(config, rollupBundle),
                // [1] bundle using commonjs using jsonp callback
                yield writeLegacyModules(config, rollupBundle, entryModules),
                // [2] write the esm/es5 version when doing dist builds
                yield writeEsmEs5Modules(config, rollupBundle)
            ]);
            if (buildCtx.hasError || !buildCtx.isActiveBuild) {
                // someone could have errored
                return results;
            }
            if (asyncResults[0]) {
                results.esm = asyncResults[0];
            }
            if (asyncResults[1]) {
                results.es5 = asyncResults[1];
            }
            if (asyncResults[2]) {
                results.esmEs5 = asyncResults[2];
            }
            if (config.minifyJs) {
                yield minifyChunks(config, compilerCtx, buildCtx, results);
            }
        }
        catch (err) {
            catchError(buildCtx.diagnostics, err);
        }
        return results;
    });
}
function minifyChunks(config, compilerCtx, buildCtx, results) {
    return __awaiter$15(this, void 0, void 0, function* () {
        const promises = Object.keys(results).map((moduleType) => __awaiter$15(this, void 0, void 0, function* () {
            const jsModuleList = results[moduleType];
            if (jsModuleList == null) {
                return null;
            }
            const promises = Object.keys(jsModuleList)
                .filter(m => !m.startsWith(ENTRY_KEY_PREFIX))
                .map(chunkKey => jsModuleList[chunkKey])
                .map((chunk) => __awaiter$15(this, void 0, void 0, function* () {
                if (!chunk || !chunk.code) {
                    return;
                }
                const sourceTarget = (moduleType === 'es5' || moduleType === 'esmEs5') ? 'es5' : 'es2017';
                const minifyJsResults = yield minifyJs(config, compilerCtx, chunk.code, sourceTarget, true);
                if (minifyJsResults.diagnostics.length) {
                    minifyJsResults.diagnostics.forEach(d => {
                        buildCtx.diagnostics.push(d);
                    });
                }
                else {
                    chunk.code = minifyJsResults.output;
                }
            }));
            yield Promise.all(promises);
        }));
        yield Promise.all(promises);
    });
}

var __awaiter$16 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateModuleMap(config, compilerCtx, buildCtx, entryModules) {
    return __awaiter$16(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return null;
        }
        if (buildCtx.isRebuild && !buildCtx.requiresFullBuild && !buildCtx.hasScriptChanges && compilerCtx.lastJsModules) {
            // this is a rebuild, it doesn't require a full build
            // there were no script changes, and we've got a good cache of the last js modules
            // let's skip this
            buildCtx.debug(`generateModuleMap, using lastJsModules cache`);
            return compilerCtx.lastJsModules;
        }
        const timeSpan = buildCtx.createTimeSpan(`module map started`);
        let jsModules;
        try {
            jsModules = yield generateBundleModules(config, compilerCtx, buildCtx, entryModules);
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
        // remember for next time incase we change just a css file or something
        compilerCtx.lastJsModules = jsModules;
        timeSpan.finish(`module map finished`);
        return jsModules;
    });
}

var __awaiter$17 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateGlobalStyles(config, compilerCtx, buildCtx, outputTarget) {
    return __awaiter$17(this, void 0, void 0, function* () {
        const canSkip = yield canSkipGlobalStyles(config, compilerCtx, buildCtx, outputTarget);
        if (canSkip) {
            return;
        }
        const timeSpan = buildCtx.createTimeSpan(`compile global style start`);
        try {
            const styleText = yield loadGlobalStyle(config, compilerCtx, buildCtx, config.globalStyle);
            const fileName = getGlobalStyleFilename(config);
            const filePath = pathJoin(config, outputTarget.buildDir, fileName);
            buildCtx.debug(`global style: ${config.sys.path.relative(config.rootDir, filePath)}`);
            yield compilerCtx.fs.writeFile(filePath, styleText);
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
        timeSpan.finish(`compile global style finish`);
    });
}
function loadGlobalStyle(config, compilerCtx, buildCtx, filePath) {
    return __awaiter$17(this, void 0, void 0, function* () {
        let styleText = '';
        try {
            filePath = normalizePath(filePath);
            const transformResults = yield runPluginTransforms(config, compilerCtx, buildCtx, filePath);
            styleText = transformResults.code;
            // auto add css prefixes
            const autoprefixConfig = config.autoprefixCss;
            if (autoprefixConfig !== false) {
                styleText = yield autoprefixCssMain(config, compilerCtx, styleText, autoprefixConfig);
            }
            if (config.minifyCss) {
                styleText = yield minifyStyle(config, compilerCtx, buildCtx.diagnostics, styleText, filePath);
            }
        }
        catch (e) {
            const d = buildError(buildCtx.diagnostics);
            d.messageText = e + '';
            d.absFilePath = normalizePath(filePath);
            d.relFilePath = normalizePath(config.sys.path.relative(config.rootDir, filePath));
        }
        return styleText;
    });
}
function canSkipGlobalStyles(config, compilerCtx, buildCtx, outputTarget) {
    return __awaiter$17(this, void 0, void 0, function* () {
        if (typeof config.globalStyle !== 'string') {
            return true;
        }
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return true;
        }
        if (!outputTarget.buildDir) {
            return true;
        }
        if (buildCtx.requiresFullBuild) {
            return false;
        }
        if (buildCtx.isRebuild && !buildCtx.hasStyleChanges) {
            return true;
        }
        if (buildCtx.filesChanged.includes(config.globalStyle)) {
            // changed file IS the global entry style
            return false;
        }
        const hasChangedImports = yield hasChangedImportFile$1(config, compilerCtx, buildCtx, config.globalStyle, []);
        if (hasChangedImports) {
            return false;
        }
        return true;
    });
}
function hasChangedImportFile$1(config, compilerCtx, buildCtx, filePath, noLoop) {
    return __awaiter$17(this, void 0, void 0, function* () {
        if (noLoop.includes(filePath)) {
            return false;
        }
        noLoop.push(filePath);
        let rtn = false;
        try {
            const content = yield compilerCtx.fs.readFile(filePath);
            rtn = yield hasChangedImportContent$1(config, compilerCtx, buildCtx, filePath, content, noLoop);
        }
        catch (e) { }
        return rtn;
    });
}
function hasChangedImportContent$1(config, compilerCtx, buildCtx, filePath, content, checkedFiles) {
    return __awaiter$17(this, void 0, void 0, function* () {
        const cssImports = getCssImports(config, buildCtx, filePath, content);
        if (cssImports.length === 0) {
            // don't bother
            return false;
        }
        const isChangedImport = buildCtx.filesChanged.some(changedFilePath => {
            return cssImports.some(c => c.filePath === changedFilePath);
        });
        if (isChangedImport) {
            // one of the changed files is an import of this file
            return true;
        }
        // keep diggin'
        const promises = cssImports.map(cssImportData => {
            return hasChangedImportFile$1(config, compilerCtx, buildCtx, cssImportData.filePath, checkedFiles);
        });
        const results = yield Promise.all(promises);
        return results.includes(true);
    });
}

var __awaiter$18 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateStyles(config, compilerCtx, buildCtx, entryModules) {
    return __awaiter$18(this, void 0, void 0, function* () {
        if (canSkipGenerateStyles(buildCtx)) {
            return;
        }
        const timeSpan = buildCtx.createTimeSpan(`generate styles started`);
        const componentStyles = yield Promise.all(entryModules.map((bundle) => __awaiter$18(this, void 0, void 0, function* () {
            yield Promise.all(bundle.moduleFiles.map((moduleFile) => __awaiter$18(this, void 0, void 0, function* () {
                yield generateComponentStyles(config, compilerCtx, buildCtx, moduleFile);
            })));
        })));
        // create the global styles
        const globalStyles = yield Promise.all(config.outputTargets
            .filter(outputTarget => outputTarget.type !== 'stats')
            .map((outputTarget) => __awaiter$18(this, void 0, void 0, function* () {
            yield generateGlobalStyles(config, compilerCtx, buildCtx, outputTarget);
        })));
        yield Promise.all([
            componentStyles,
            globalStyles
        ]);
        timeSpan.finish(`generate styles finished`);
    });
}
function generateComponentStyles(config, compilerCtx, buildCtx, moduleFile) {
    return __awaiter$18(this, void 0, void 0, function* () {
        const stylesMeta = moduleFile.cmpMeta.stylesMeta = moduleFile.cmpMeta.stylesMeta || {};
        yield Promise.all(Object.keys(stylesMeta).map((modeName) => __awaiter$18(this, void 0, void 0, function* () {
            yield generateComponentStylesMode(config, compilerCtx, buildCtx, moduleFile, stylesMeta[modeName], modeName);
        })));
    });
}
function canSkipGenerateStyles(buildCtx) {
    if (buildCtx.hasError || !buildCtx.isActiveBuild) {
        return true;
    }
    if (buildCtx.requiresFullBuild) {
        return false;
    }
    if (buildCtx.isRebuild) {
        if (buildCtx.hasScriptChanges || buildCtx.hasStyleChanges) {
            return false;
        }
        return true;
    }
    return false;
}

function validateCollectinCompatibility(config, collection) {
    if (!collection.compiler) {
        // if there is no compiler data at all then this was probably
        // set on purpose and we should avoid doing any upgrading
        return [];
    }
    // fill in any default data if somehow it's missing entirely
    collection.compiler.name = collection.compiler.name || '@stencil/core';
    collection.compiler.version = collection.compiler.version || '0.0.1';
    collection.compiler.typescriptVersion = collection.compiler.typescriptVersion || '2.5.3';
    // figure out which compiler upgrades, if any, we need to do
    return calculateRequiredUpgrades(config, collection.compiler.version);
}
function calculateRequiredUpgrades(config, collectionVersion) {
    // CUSTOM CHECKS PER KNOWN BREAKING CHANGES
    // UNIT TEST UNIT TEST UNIT TEST
    const upgrades = [];
    if (config.sys.semver.lte(collectionVersion, '0.0.6-10')) {
        // 2017-10-04
        // between 0.0.5 and 0.0.6-11 we no longer have a custom JSX parser
        upgrades.push(0 /* JSX_Upgrade_From_0_0_5 */);
    }
    if (config.sys.semver.lte(collectionVersion, '0.1.0')) {
        // 2017-12-27
        // from 0.1.0 and earlier, metadata was stored separately
        // from the component constructor. Now it puts the metadata
        // as static properties on each component constructor
        upgrades.push(1 /* Metadata_Upgrade_From_0_1_0 */);
    }
    if (config.sys.semver.lte(collectionVersion, '0.2.0')) {
        // 2018-01-19
        // ensure all @stencil/core imports are removed
        upgrades.push(2 /* Remove_Stencil_Imports */);
    }
    if (config.sys.semver.lte(collectionVersion, '0.3.0')) {
        // 2018-01-30
        // add dependencies to component metadata
        upgrades.push(3 /* Add_Component_Dependencies */);
    }
    return upgrades;
}

/* tslint:disable */
function upgradeJsxProps(transformContext) {
    return (tsSourceFile) => {
        return visit(tsSourceFile);
        function visit(node) {
            switch (node.kind) {
                case ts.SyntaxKind.CallExpression:
                    const callNode = node;
                    if (callNode.expression.text === 'h') {
                        const tag = callNode.arguments[0];
                        if (tag && typeof tag.text === 'string') {
                            node = upgradeCall(callNode);
                        }
                    }
                default:
                    return ts.visitEachChild(node, (node) => {
                        return visit(node);
                    }, transformContext);
            }
        }
    };
}
function upgradeCall(callNode) {
    const [tag, props, ...children] = callNode.arguments;
    let newArgs = [];
    newArgs.push(upgradeTagName(tag));
    newArgs.push(upgradeProps(props));
    if (children != null) {
        newArgs = newArgs.concat(upgradeChildren(children));
    }
    return ts.updateCall(callNode, callNode.expression, undefined, newArgs);
}
function upgradeTagName(tagName) {
    if (ts.isNumericLiteral(tagName) &&
        tagName.text === '0') {
        return ts.createLiteral('slot');
    }
    return tagName;
}
function upgradeProps(props) {
    let upgradedProps = {};
    let propHackValue;
    if (!ts.isObjectLiteralExpression(props)) {
        return ts.createNull();
    }
    const objectProps = objectLiteralToObjectMap(props);
    upgradedProps = Object.keys(objectProps).reduce((newProps, propName) => {
        const propValue = objectProps[propName];
        // If the propname is c, s, or k then map to proper name
        if (propName === 'c') {
            return Object.assign({}, newProps, { 'class': propValue });
        }
        if (propName === 's') {
            return Object.assign({}, newProps, { 'style': propValue });
        }
        if (propName === 'k') {
            return Object.assign({}, newProps, { 'key': propValue });
        }
        // If the propname is p or a then spread the value into props
        if (propName === 'a') {
            return Object.assign({}, newProps, propValue);
        }
        if (propName === 'p') {
            if (isInstanceOfObjectMap(propValue)) {
                return Object.assign({}, newProps, propValue);
            }
            else {
                propHackValue = propValue;
            }
        }
        // If the propname is o then we need to update names and then spread into props
        if (propName === 'o') {
            const eventListeners = Object.keys(propValue).reduce((newValue, eventName) => {
                return Object.assign({}, newValue, { [`on${eventName}`]: propValue[eventName] });
            }, {});
            return Object.assign({}, newProps, eventListeners);
        }
        return newProps;
    }, upgradedProps);
    try {
    }
    catch (e) {
        console.log(upgradedProps);
        console.log(objectProps);
        console.log(props);
        throw e;
    }
    const response = objectMapToObjectLiteral(upgradedProps);
    // Looks like someone used the props hack. So we need to create the following code:
    // Object.assign({}, upgradedProps, propHackValue);
    if (propHackValue) {
        const emptyObjectLiteral = ts.createObjectLiteral();
        return ts.createCall(ts.createPropertyAccess(ts.createIdentifier('Object'), ts.createIdentifier('assign')), undefined, [emptyObjectLiteral, response, propHackValue]);
    }
    return response;
}
function upgradeChildren(children) {
    return children.map(upgradeChild);
}
function upgradeChild(child) {
    if (ts.isCallExpression(child) && child.expression.text === 't') {
        return child.arguments[0];
    }
    return child;
}

function upgradeFromMetadata(moduleFiles) {
    const allModuleFiles = Object.keys(moduleFiles).map(filePath => {
        return moduleFiles[filePath];
    });
    return (tsSourceFile) => {
        const tsFilePath = normalizePath(tsSourceFile.fileName);
        let moduleFile = moduleFiles[tsFilePath];
        if (!moduleFile || !moduleFile.cmpMeta) {
            moduleFile = allModuleFiles.find(m => m.jsFilePath === tsFilePath);
        }
        if (moduleFile) {
            tsSourceFile = upgradeModuleFile(tsSourceFile, moduleFile.cmpMeta);
        }
        return tsSourceFile;
    };
}
function upgradeModuleFile(tsSourceFile, cmpMeta) {
    const staticMembers = addStaticMeta(cmpMeta);
    const newStatements = Object.keys(staticMembers).map(memberName => {
        return ts.createBinary(ts.createPropertyAccess(ts.createIdentifier(cmpMeta.componentClass), memberName), ts.createToken(ts.SyntaxKind.EqualsToken), staticMembers[memberName]);
    });
    return ts.updateSourceFileNode(tsSourceFile, [
        ...tsSourceFile.statements,
        ...newStatements
    ]);
}

var __awaiter$19 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function upgradeCollection(config, compilerCtx, buildCtx, collection) {
    return __awaiter$19(this, void 0, void 0, function* () {
        try {
            const upgradeTransforms = validateCollectinCompatibility(config, collection);
            if (upgradeTransforms.length === 0) {
                return;
            }
            const timeSpan = buildCtx.createTimeSpan(`upgrade ${collection.collectionName} started`, true);
            const doUpgrade = createDoUpgrade(compilerCtx, buildCtx);
            yield doUpgrade(collection, upgradeTransforms);
            timeSpan.finish(`upgrade ${collection.collectionName} finished`);
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
    });
}
function createDoUpgrade(compilerCtx, buildCtx) {
    return (collection, upgrades) => __awaiter$19(this, void 0, void 0, function* () {
        const upgradeTransforms = (upgrades.map((upgrade) => {
            switch (upgrade) {
                case 0 /* JSX_Upgrade_From_0_0_5 */:
                    buildCtx.debug(`JSX_Upgrade_From_0_0_5, ${collection.collectionName}, compiled by v${collection.compiler.version}`);
                    return upgradeJsxProps;
                case 1 /* Metadata_Upgrade_From_0_1_0 */:
                    buildCtx.debug(`Metadata_Upgrade_From_0_1_0, ${collection.collectionName}, compiled by v${collection.compiler.version}`);
                    return () => {
                        return upgradeFromMetadata(compilerCtx.moduleFiles);
                    };
                case 2 /* Remove_Stencil_Imports */:
                    buildCtx.debug(`Remove_Stencil_Imports, ${collection.collectionName}, compiled by v${collection.compiler.version}`);
                    return (transformContext) => {
                        return removeStencilImports()(transformContext);
                    };
                case 3 /* Add_Component_Dependencies */:
                    buildCtx.debug(`Add_Component_Dependencies, ${collection.collectionName}, compiled by v${collection.compiler.version}`);
                    return (transformContext) => {
                        return componentDependencies(compilerCtx)(transformContext);
                    };
            }
            return () => (tsSourceFile) => (tsSourceFile);
        }));
        yield Promise.all(collection.moduleFiles.map((moduleFile) => __awaiter$19(this, void 0, void 0, function* () {
            try {
                const source = yield compilerCtx.fs.readFile(moduleFile.jsFilePath);
                const output = yield transformSourceString(moduleFile.jsFilePath, source, upgradeTransforms);
                yield compilerCtx.fs.writeFile(moduleFile.jsFilePath, output, { inMemoryOnly: true });
            }
            catch (e) {
                catchError(buildCtx.diagnostics, e, `error performing compiler upgrade on ${moduleFile.jsFilePath}: ${e}`);
            }
        })));
    });
}

var __awaiter$1a = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function initCollections(config, compilerCtx, buildCtx) {
    return __awaiter$1a(this, void 0, void 0, function* () {
        const uninitialized = compilerCtx.collections.filter(c => !c.isInitialized);
        yield Promise.all(uninitialized.map((collection) => __awaiter$1a(this, void 0, void 0, function* () {
            // Look at all dependent components from outside collections and
            // upgrade the components to be compatible with this version if need be
            yield upgradeCollection(config, compilerCtx, buildCtx, collection);
            collection.isInitialized = true;
        })));
    });
}

var __awaiter$1b = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function initIndexHtmls(config, compilerCtx, buildCtx) {
    return __awaiter$1b(this, void 0, void 0, function* () {
        yield Promise.all(config.outputTargets.map((outputTarget) => __awaiter$1b(this, void 0, void 0, function* () {
            yield initIndexHtml(config, compilerCtx, buildCtx, outputTarget);
        })));
    });
}
function initIndexHtml(config, compilerCtx, buildCtx, outputTarget) {
    return __awaiter$1b(this, void 0, void 0, function* () {
        // if there isn't an index.html yet
        // let's generate a slim one quick so that
        // on the first build the user sees a loading indicator
        // this is synchronous on purpose so that it's saved
        // before the dev server fires up and loads the index.html page
        if (outputTarget.type === 'www') {
            // only worry about this when generating www directory
            // check if there's even a src index.html file
            const hasSrcIndexHtml = yield compilerCtx.fs.access(config.srcIndexHtml);
            if (!hasSrcIndexHtml) {
                // there is no src index.html file in the config, which is fine
                // since there is no src index file at all, don't bother
                // this isn't actually an error, don't worry about it
                return;
            }
            if (compilerCtx.hasSuccessfulBuild) {
                // we've already had a successful build, we're good
                // always recopy index.html (it's all cached if it didn't actually change, all good)
                const srcIndexHtmlContent = yield compilerCtx.fs.readFile(config.srcIndexHtml);
                yield compilerCtx.fs.writeFile(outputTarget.indexHtml, srcIndexHtmlContent);
                return;
            }
            try {
                // ok, so we haven't written an index.html build file yet
                // and we do know they have a src one, so let's write a
                // filler index.html file that shows while the first build is happening
                yield compilerCtx.fs.writeFile(outputTarget.indexHtml, APP_LOADING_HTML);
                yield compilerCtx.fs.commit();
            }
            catch (e) {
                catchError(buildCtx.diagnostics, e);
            }
        }
    });
}
const APP_LOADING_HTML = `
<!DOCTYPE html>
<html dir="ltr" lang="en" data-init="app-dev-first-build-loader">
<head>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(function(registration) {
        registration.unregister();
      });
    }
  </script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="x-ua-compatible" content="IE=Edge">
  <title>Initializing First Build...</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      position: absolute;
      padding: 0;
      margin: 0;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    }
    .toast {
      position: absolute;
      top: 10px;
      right: 10px;
      left: 10px;
      margin: auto;
      max-width: 700px;
      border-radius: 3px;
      background: rgba(0,0,0,.9);
      -webkit-transform: translate3d(0px, -60px, 0px);
      transform: translate3d(0px, -60px, 0px);
      -webkit-transition: -webkit-transform 75ms ease-out;
      transition: transform 75ms ease-out;
      pointer-events: none;
    }

    .active {
      -webkit-transform: translate3d(0px, 0px, 0px);
      transform: translate3d(0px, 0px, 0px);
    }

    .content {
      display: flex;
      -webkit-align-items: center;
      -ms-flex-align: center;
      align-items: center;
      pointer-events: auto;
    }

    .message {
      -webkit-flex: 1;
      -ms-flex: 1;
      flex: 1;
      padding: 15px;
      font-size: 14px;
      color: #fff;
    }

    .spinner {
      position: relative;
      display: inline-block;
      width: 56px;
      height: 28px;
    }

    svg:not(:root) {
      overflow: hidden;
    }

    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      -webkit-animation: rotate 600ms linear infinite;
      animation: rotate 600ms linear infinite;
    }

    @-webkit-keyframes rotate {
      0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg);
      }
      100% {
        -webkit-transform: rotate(360deg);
        transform: rotate(360deg);
      }
    }

    @keyframes rotate {
      0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg);
      }
      100% {
        -webkit-transform: rotate(360deg);
        transform: rotate(360deg);
      }
    }

    svg circle {
      fill: transparent;
      stroke: white;
      stroke-width: 4px;
      stroke-dasharray: 128px;
      stroke-dashoffset: 82px;
    }
  </style>
</head>
<body>

  <div class="toast">
    <div class="content">
      <div class="message">Initializing First Build...</div>
      <div class="spinner">
        <svg viewBox="0 0 64 64"><circle transform="translate(32,32)" r="26"></circle></svg>
      </div>
    </div>
  </div>

  <script>
    setTimeout(function() {
      document.querySelector('.toast').classList.add('active');
    }, 100);

    setInterval(function() {
      try {
        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', function() {
          try {
            if (this.responseText.indexOf('app-dev-first-build-loader') === -1) {
              window.location.reload(true);
            }
          } catch (e) {
            console.error(e);
          }
        });
        var url = window.location.pathname + '?' + Math.random();
        xhr.open('GET', url);
        xhr.send();
      } catch (e) {
        console.error(e);
      }
    }, 1000);
  </script>

</body>
</html>
`;

var __awaiter$1c = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function writeBuildFiles(config, compilerCtx, buildCtx) {
    return __awaiter$1c(this, void 0, void 0, function* () {
        if (buildCtx.hasError || !buildCtx.isActiveBuild) {
            return;
        }
        // serialize and write the manifest file if need be
        yield writeAppCollections(config, compilerCtx, buildCtx);
        const timeSpan = buildCtx.createTimeSpan(`writeBuildFiles started`, true);
        let totalFilesWrote = 0;
        let distributionPromise = null;
        try {
            // copy www/build to dist/ if generateDistribution is enabled
            distributionPromise = generateDistributions(config, compilerCtx, buildCtx);
            if (!buildCtx.isRebuild) {
                // if this is the initial build then we need to wait on
                // the distributions to finish, otherwise we can let it
                // finish when it finishes
                yield distributionPromise;
                distributionPromise = null;
            }
            // commit all the writeFiles, mkdirs, rmdirs and unlinks to disk
            const commitResults = yield compilerCtx.fs.commit();
            // get the results from the write to disk commit
            buildCtx.filesWritten = commitResults.filesWritten;
            buildCtx.filesDeleted = commitResults.filesDeleted;
            buildCtx.dirsDeleted = commitResults.dirsDeleted;
            buildCtx.dirsAdded = commitResults.dirsAdded;
            totalFilesWrote = commitResults.filesWritten.length;
            if (buildCtx.isActiveBuild) {
                // successful write
                // kick off writing the cached file stuff
                yield compilerCtx.cache.commit();
                buildCtx.debug(`in-memory-fs: ${compilerCtx.fs.getMemoryStats()}`);
                buildCtx.debug(`cache: ${compilerCtx.cache.getMemoryStats()}`);
            }
            else {
                buildCtx.debug(`commit cache aborted, not active build`);
            }
        }
        catch (e) {
            catchError(buildCtx.diagnostics, e);
        }
        timeSpan.finish(`writeBuildFiles finished, files wrote: ${totalFilesWrote}`);
        if (distributionPromise != null) {
            // build didn't need to wait on this finishing
            // let it just do its thing and finish when it gets to it
            distributionPromise.then(() => {
                compilerCtx.fs.commit();
                compilerCtx.cache.commit();
            });
        }
    });
}

var __awaiter$1d = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function build(config, compilerCtx, buildCtx) {
    return __awaiter$1d(this, void 0, void 0, function* () {
        try {
            // ensure any existing worker tasks are not running
            // and we've got a clean slate
            config.sys.cancelWorkerTasks();
            if (!config.devServer || !config.flags.serve) {
                // create an initial index.html file if one doesn't already exist
                yield initIndexHtmls(config, compilerCtx, buildCtx);
                if (buildCtx.hasError || !buildCtx.isActiveBuild)
                    return buildCtx.abort();
            }
            // empty the directories on the first build
            yield emptyOutputTargetDirs(config, compilerCtx, buildCtx);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            // async scan the src directory for ts files
            // then transpile them all in one go
            yield transpileApp(config, compilerCtx, buildCtx);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            // initialize all the collections we found when transpiling
            // async copy collection files and upgrade collections as needed
            yield initCollections(config, compilerCtx, buildCtx);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            // we've got the compiler context filled with app modules and collection dependency modules
            // figure out how all these components should be connected
            const entryModules = generateEntryModules(config, compilerCtx, buildCtx);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            // start copy tasks from the config.copy and component assets
            // but don't wait right now (running in worker)
            const copyTaskPromise = copyTasksMain(config, compilerCtx, buildCtx, entryModules);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            // bundle js modules and create each of the components's styles
            // these can run in parallel
            const results = yield Promise.all([
                generateModuleMap(config, compilerCtx, buildCtx, entryModules),
                generateStyles(config, compilerCtx, buildCtx, entryModules)
            ]);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            const jsModules = results[0];
            // both styles and modules are done bundling
            // inject the styles into the modules and
            // generate each of the output bundles
            const cmpRegistry = yield generateBundles(config, compilerCtx, buildCtx, entryModules, jsModules);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            // generate the app files, such as app.js, app.core.js
            yield generateAppFiles(config, compilerCtx, buildCtx, entryModules, cmpRegistry);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            // build index file and service worker
            yield generateIndexHtmls(config, compilerCtx, buildCtx);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            if (buildCtx.isActiveBuild) {
                // await on the validate types build to finish
                // do this before we attempt to write build files
                yield buildCtx.validateTypesBuild();
                // we started the copy tasks long ago
                // i'm sure it's done by now, but let's double check
                // make sure this finishes before the write build files
                // so they're not stepping on each other writing files
                yield copyTaskPromise;
                if (buildCtx.hasError || !buildCtx.isActiveBuild)
                    return buildCtx.abort();
            }
            // write all the files and copy asset files
            yield writeBuildFiles(config, compilerCtx, buildCtx);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
            // await on our other optional stuff like docs, service workers, etc.
            yield buildAuxiliaries(config, compilerCtx, buildCtx, entryModules, cmpRegistry);
            if (buildCtx.hasError || !buildCtx.isActiveBuild)
                return buildCtx.abort();
        }
        catch (e) {
            // ¯\_(ツ)_/¯
            catchError(buildCtx.diagnostics, e);
        }
        // return what we've learned today
        return buildCtx.finish();
    });
}

function configFileReload(config, compilerCtx) {
    try {
        const updatedConfig = config.sys.loadConfigFile(config.configPath);
        configReload(config, updatedConfig);
        // reset the compiler context cache
        resetCompilerCtx(compilerCtx);
    }
    catch (e) {
        config.logger.error(e);
    }
}
function configReload(config, updatedConfig) {
    const keepers = {};
    // empty it out cuz we're gonna use the same object
    // but don't remove our keepers, we still need them
    for (const key in config) {
        if (CONFIG_RELOAD_KEEPER_KEYS.includes(key)) {
            keepers[key] = config[key];
        }
        else {
            delete config[key];
        }
    }
    // fill it up with the newly loaded config
    // but don't touch our "keepers"
    for (const key in updatedConfig) {
        if (!CONFIG_RELOAD_KEEPER_KEYS.includes(key)) {
            config[key] = updatedConfig[key];
        }
    }
    config._isValidated = false;
    // validate our new config data
    validateConfig(config);
    // ensure we're using the correct original config data
    for (const key in keepers) {
        config[key] = keepers[key];
    }
}
// stuff that should be constant between config updates
// implementing the Config interface to make sure we're
// using the correct keys, but the value doesn't matter here
const CONFIG_RELOAD_KEEPERS = {
    flags: null,
    sys: null,
    logger: null,
    cwd: null,
    rootDir: null,
    watch: null
};
const CONFIG_RELOAD_KEEPER_KEYS = Object.keys(CONFIG_RELOAD_KEEPERS);

function generateBuildFromFsWatch(config, compilerCtx, fsWatchResults) {
    const buildCtx = new BuildContext(config, compilerCtx);
    // copy watch results over to build ctx data
    buildCtx.filesUpdated.push(...fsWatchResults.filesUpdated);
    buildCtx.filesAdded.push(...fsWatchResults.filesAdded);
    buildCtx.filesDeleted.push(...fsWatchResults.filesDeleted);
    buildCtx.dirsDeleted.push(...fsWatchResults.dirsDeleted);
    buildCtx.dirsAdded.push(...fsWatchResults.dirsAdded);
    // recursively drill down through any directories added and fill up more data
    buildCtx.dirsAdded.forEach(dirAdded => {
        addDir(config, compilerCtx, buildCtx, dirAdded);
    });
    // files changed include updated, added and deleted
    buildCtx.filesChanged = filesChanged(buildCtx);
    // see if any of the changed files/directories are copy tasks
    buildCtx.hasCopyChanges = hasCopyChanges(config, buildCtx);
    // see if we should rebuild or not
    if (!shouldRebuild(buildCtx)) {
        // nothing actually changed!!!
        if (compilerCtx.events) {
            compilerCtx.events.emit('buildNoChange', { noChange: true });
        }
        return null;
    }
    // collect all the scripts that were added/deleted
    buildCtx.scriptsAdded = scriptsAdded(config, buildCtx);
    buildCtx.scriptsDeleted = scriptsDeleted(config, buildCtx);
    buildCtx.hasScriptChanges = hasScriptChanges(buildCtx);
    // collect all the styles that were added/deleted
    buildCtx.hasStyleChanges = hasStyleChanges(buildCtx);
    // figure out if any changed files were index.html files
    buildCtx.hasIndexHtmlChanges = hasIndexHtmlChanges(config, buildCtx);
    buildCtx.hasServiceWorkerChanges = hasServiceWorkerChanges(config, buildCtx);
    // we've got watch results, which means this is a rebuild!!
    buildCtx.isRebuild = true;
    // always require a full rebuild if we've never had a successful build
    buildCtx.requiresFullBuild = !compilerCtx.hasSuccessfulBuild;
    // figure out if one of the changed files is the config
    checkForConfigUpdates(config, compilerCtx, buildCtx);
    // return our new build context that'll be used for the next build
    return buildCtx;
}
function addDir(config, compilerCtx, buildCtx, dir) {
    dir = normalizePath(dir);
    if (!buildCtx.dirsAdded.includes(dir)) {
        buildCtx.dirsAdded.push(dir);
    }
    const items = compilerCtx.fs.disk.readdirSync(dir);
    items.forEach(dirItem => {
        const itemPath = pathJoin(config, dir, dirItem);
        const stat = compilerCtx.fs.disk.statSync(itemPath);
        if (stat.isDirectory()) {
            addDir(config, compilerCtx, buildCtx, itemPath);
        }
        else if (stat.isFile()) {
            if (!buildCtx.filesAdded.includes(itemPath)) {
                buildCtx.filesAdded.push(itemPath);
            }
        }
    });
}
function filesChanged(buildCtx) {
    // files changed include updated, added and deleted
    return buildCtx.filesUpdated.concat(buildCtx.filesAdded, buildCtx.filesDeleted).reduce((filesChanged, filePath) => {
        if (!filesChanged.includes(filePath)) {
            filesChanged.push(filePath);
        }
        return filesChanged;
    }, []).sort();
}
function hasCopyChanges(config, buildCtx) {
    return buildCtx.filesUpdated.some(f => isCopyTaskFile(config, f)) ||
        buildCtx.filesAdded.some(f => isCopyTaskFile(config, f)) ||
        buildCtx.dirsAdded.some(f => isCopyTaskFile(config, f));
}
function shouldRebuild(buildCtx) {
    return buildCtx.hasCopyChanges ||
        buildCtx.dirsAdded.length > 0 ||
        buildCtx.dirsDeleted.length > 0 ||
        buildCtx.filesAdded.length > 0 ||
        buildCtx.filesDeleted.length > 0 ||
        buildCtx.filesUpdated.length > 0;
}
function scriptsAdded(config, buildCtx) {
    // collect all the scripts that were added
    return buildCtx.filesAdded.filter(f => {
        return SCRIPT_EXT$1.some(ext => f.endsWith(ext.toLowerCase()));
    }).map(f => config.sys.path.basename(f));
}
function scriptsDeleted(config, buildCtx) {
    // collect all the scripts that were deleted
    return buildCtx.filesDeleted.filter(f => {
        return SCRIPT_EXT$1.some(ext => f.endsWith(ext.toLowerCase()));
    }).map(f => config.sys.path.basename(f));
}
function hasScriptChanges(buildCtx) {
    return buildCtx.filesChanged.some(f => {
        const ext = getExt(f);
        return SCRIPT_EXT$1.includes(ext);
    });
}
function hasStyleChanges(buildCtx) {
    return buildCtx.filesChanged.some(f => {
        const ext = getExt(f);
        return STYLE_EXT$1.includes(ext);
    });
}
function getExt(filePath) {
    return filePath.split('.').pop().toLowerCase();
}
const SCRIPT_EXT$1 = ['ts', 'tsx', 'js', 'jsx'];
const STYLE_EXT$1 = ['css', 'scss', 'sass', 'pcss', 'styl', 'stylus', 'less'];
function hasIndexHtmlChanges(config, buildCtx) {
    const anyIndexHtmlChanged = buildCtx.filesChanged.some(fileChanged => config.sys.path.basename(fileChanged).toLowerCase() === 'index.html');
    if (anyIndexHtmlChanged) {
        // any index.html in any directory that changes counts too
        return true;
    }
    const srcIndexHtmlChanged = buildCtx.filesChanged.some(fileChanged => {
        // the src index index.html file has changed
        // this file name could be something other than index.html
        return fileChanged === config.srcIndexHtml;
    });
    return srcIndexHtmlChanged;
}
function checkForConfigUpdates(config, compilerCtx, buildCtx) {
    // figure out if one of the changed files is the config
    if (buildCtx.filesChanged.some(f => f === config.configPath)) {
        buildCtx.debug(`reload config file: ${config.sys.path.relative(config.rootDir, config.configPath)}`);
        configFileReload(config, compilerCtx);
        buildCtx.requiresFullBuild = true;
    }
}
function updateCacheFromRebuild(compilerCtx, buildCtx) {
    buildCtx.filesChanged.forEach(filePath => {
        compilerCtx.fs.clearFileCache(filePath);
    });
    buildCtx.dirsAdded.forEach(dirAdded => {
        compilerCtx.fs.clearDirCache(dirAdded);
    });
    buildCtx.dirsDeleted.forEach(dirDeleted => {
        compilerCtx.fs.clearDirCache(dirDeleted);
    });
}

function logFsWatchMessage(config, buildCtx) {
    const msg = getMessage(config, buildCtx);
    if (msg.length > 0) {
        config.logger.info(config.logger.cyan(msg.join(', ')));
    }
}
function getMessage(config, buildCtx) {
    const msgs = [];
    const filesChanged = buildCtx.filesChanged;
    if (filesChanged.length > MAX_FILE_PRINT) {
        const trimmedChangedFiles = filesChanged.slice(0, MAX_FILE_PRINT - 1);
        const otherFilesTotal = filesChanged.length - trimmedChangedFiles.length;
        let msg = `changed files: ${getBaseName(config, trimmedChangedFiles)}`;
        if (otherFilesTotal > 0) {
            msg += `, +${otherFilesTotal} other${otherFilesTotal > 1 ? 's' : ''}`;
        }
        msgs.push(msg);
    }
    else if (filesChanged.length > 1) {
        msgs.push(`changed files: ${getBaseName(config, filesChanged)}`);
    }
    else if (filesChanged.length > 0) {
        msgs.push(`changed file: ${getBaseName(config, filesChanged)}`);
    }
    if (buildCtx.dirsAdded.length > 1) {
        msgs.push(`added directories: ${getBaseName(config, buildCtx.dirsAdded)}`);
    }
    else if (buildCtx.dirsAdded.length > 0) {
        msgs.push(`added directory: ${getBaseName(config, buildCtx.dirsAdded)}`);
    }
    if (buildCtx.dirsDeleted.length > 1) {
        msgs.push(`deleted directories: ${getBaseName(config, buildCtx.dirsDeleted)}`);
    }
    else if (buildCtx.dirsDeleted.length > 0) {
        msgs.push(`deleted directory: ${getBaseName(config, buildCtx.dirsDeleted)}`);
    }
    return msgs;
}
function getBaseName(config, items) {
    return items.map(f => config.sys.path.basename(f)).join(', ');
}
const MAX_FILE_PRINT = 5;

function sendMsg(process, msg) {
    process.send(msg);
}

/**
 * NODE ONLY!
 * NOTE! this method is still apart of the main bundle
 * it is not apart of the dev-server/index.js bundle
 */
function startDevServerMain(config, compilerCtx) {
    const fork = require('child_process').fork;
    // using the path stuff below because after the the bundles are created
    // then these files are no longer relative to how they are in the src directory
    config.devServer.devServerDir = config.sys.path.join(__dirname, '..', 'dev-server');
    // get the path of the dev server module
    const program = require.resolve(config.sys.path.join(config.devServer.devServerDir, 'index.js'));
    const parameters = [];
    const options = {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    };
    // start a new child process of the CLI process
    // for the http and web socket server
    const serverProcess = fork(program, parameters, options);
    config.sys.addDestroy(() => {
        serverProcess.kill('SIGINT');
    });
    return startServer(config, compilerCtx, serverProcess);
}
function startServer(config, compilerCtx, serverProcess) {
    return new Promise((resolve, reject) => {
        serverProcess.stdout.on('data', (data) => {
            // the child server process has console logged data
            config.logger.debug(`dev server: ${data}`);
        });
        serverProcess.stderr.on('data', (data) => {
            // the child server process has console logged an error
            config.logger.error(`dev server error: ${data}`);
            reject(`dev server error: ${data}`);
        });
        serverProcess.on('message', (msg) => {
            // main process has received a message from the child server process
            mainReceivedMessageFromWorker(config, compilerCtx, serverProcess, msg, resolve);
        });
        compilerCtx.events.subscribe('buildFinish', buildResults => {
            // a compiler build has finished
            // send the build results to the child server process
            const msg = {
                buildResults: Object.assign({}, buildResults)
            };
            delete msg.buildResults.entries;
            delete msg.buildResults.components;
            sendMsg(serverProcess, msg);
        });
        compilerCtx.events.subscribe('buildLog', buildLog => {
            const msg = {
                buildLog: Object.assign({}, buildLog)
            };
            sendMsg(serverProcess, msg);
        });
        // have the main process send a message to the child server process
        // to start the http and web socket server
        sendMsg(serverProcess, {
            startServer: config.devServer
        });
        return config.devServer;
    });
}
function mainReceivedMessageFromWorker(config, compilerCtx, serverProcess, msg, resolve) {
    if (msg.serverStated) {
        // received a message from the child process that the server has successfully started
        if (config.devServer.openBrowser && msg.serverStated.initialLoadUrl) {
            config.sys.open(msg.serverStated.initialLoadUrl);
        }
        // resolve that everything is good to go
        resolve(msg.serverStated);
        return;
    }
    if (msg.requestBuildResults) {
        // we received a request to send up the latest build results
        if (compilerCtx.lastBuildResults) {
            // we do have build results, so let's send them to the child process
            // but don't send any previous live reload data
            const msg = {
                buildResults: Object.assign({}, compilerCtx.lastBuildResults),
                isActivelyBuilding: compilerCtx.isActivelyBuilding
            };
            delete msg.buildResults.hmr;
            delete msg.buildResults.entries;
            delete msg.buildResults.components;
            serverProcess.send(msg);
        }
        else {
            const msg = {
                isActivelyBuilding: compilerCtx.isActivelyBuilding
            };
            serverProcess.send(msg);
        }
        return;
    }
    if (msg.error) {
        // received a message from the child process that is an error
        config.logger.error(msg.error.message);
        config.logger.debug(msg.error);
        return;
    }
}

var __awaiter$1e = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Compiler {
    constructor(rawConfig) {
        [this.isValid, this.config] = isValid(rawConfig);
        const config = this.config;
        if (this.isValid) {
            const details = config.sys.details;
            let startupMsg = `${config.sys.compiler.name} v${config.sys.compiler.version} `;
            if (details.platform !== 'win32') {
                startupMsg += `🎯`;
            }
            config.logger.info(config.logger.cyan(startupMsg));
            config.logger.debug(`${details.platform}, ${details.cpuModel}, cpus: ${details.cpus}`);
            config.logger.debug(`${details.runtime} ${details.runtimeVersion}`);
            config.logger.debug(`compiler runtime: ${config.sys.compiler.runtime}`);
            config.logger.debug(`compiler build: 180707005308`);
            const workerOpts = config.sys.initWorkers(config.maxConcurrentWorkers, config.maxConcurrentTasksPerWorker);
            config.logger.debug(`compiler workers: ${workerOpts.maxConcurrentWorkers}, tasks per worker: ${workerOpts.maxConcurrentTasksPerWorker}`);
            config.logger.debug(`minifyJs: ${config.minifyJs}, minifyCss: ${config.minifyCss}, buildEs5: ${config.buildEs5}`);
            this.ctx = getCompilerCtx(config);
            this.on('fsChange', fsWatchResults => {
                this.rebuild(fsWatchResults);
            });
            if (config.flags.serve) {
                this.startDevServer();
            }
        }
    }
    build() {
        const buildCtx = new BuildContext(this.config, this.ctx);
        buildCtx.start();
        return build(this.config, this.ctx, buildCtx);
    }
    rebuild(fsWatchResults) {
        const buildCtx = generateBuildFromFsWatch(this.config, this.ctx, fsWatchResults);
        if (buildCtx) {
            logFsWatchMessage(this.config, buildCtx);
            buildCtx.start();
            updateCacheFromRebuild(this.ctx, buildCtx);
            build(this.config, this.ctx, buildCtx);
        }
    }
    startDevServer() {
        return __awaiter$1e(this, void 0, void 0, function* () {
            if (this.config.sys.details.runtime !== 'node') {
                throw new Error(`Dev Server only availabe in node`);
            }
            // start up the dev server
            const devServerConfig = yield startDevServerMain(this.config, this.ctx);
            // get the browser url to be logged out at the end of the build
            this.config.devServer.browserUrl = devServerConfig.browserUrl;
            return {
                browserUrl: this.config.devServer.browserUrl
            };
        });
    }
    on(eventName, cb) {
        return this.ctx.events.subscribe(eventName, cb);
    }
    once(eventName) {
        return new Promise(resolve => {
            const off = this.ctx.events.subscribe(eventName, (...args) => {
                off();
                resolve.apply(this, args);
            });
        });
    }
    off(eventName, cb) {
        this.ctx.events.unsubscribe(eventName, cb);
    }
    trigger(eventName, ...args) {
        args.unshift(eventName);
        this.ctx.events.emit.apply(this.ctx.events, args);
    }
    docs() {
        return docs(this.config, this.ctx);
    }
    get fs() {
        return this.ctx.fs;
    }
    get name() {
        return this.config.sys.compiler.name;
    }
    get version() {
        return this.config.sys.compiler.version;
    }
}
function isValid(config) {
    try {
        // validate the build config
        validateConfig(config, true);
        return [true, config];
    }
    catch (e) {
        if (config.logger) {
            const diagnostics = [];
            catchError(diagnostics, e);
            config.logger.printDiagnostics(diagnostics);
        }
        else {
            console.error(e);
        }
        return [false, null];
    }
}

exports.Compiler = Compiler;
