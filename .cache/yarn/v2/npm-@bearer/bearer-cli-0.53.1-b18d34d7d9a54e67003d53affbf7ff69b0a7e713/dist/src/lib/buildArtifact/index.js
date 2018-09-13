"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const archiver = require("archiver");
const globby = require("globby");
const pathJs = require("path");
const webpack = require("webpack");
const prepareConfig_1 = require("./prepareConfig");
const attachConfig_1 = require("./attachConfig");
const addFilesToArchive_1 = require("./addFilesToArchive");
const generateHandler_1 = require("./generateHandler");
const CONFIG_FILE = 'bearer.config.json';
const HANDLER_NAME = 'index.js';
const archive = archiver('zip', {
    zlib: { level: 9 }
});
exports.default = (output, { scenarioUuid }, emitter, locator) => {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            output.on('close', () => {
                emitter.emit('buildArtifact:output:close', pathJs.resolve(output.path));
            });
            output.on('end', () => {
                emitter.emit('buildArtifact:output:end');
            });
            output.on('close', () => {
                resolve(archive);
            });
            archive.on('error', reject);
            archive.on('warning', err => {
                if (err.code === 'ENOENT') {
                    emitter.emit('buildArtifact:archive:warning:ENOENT', err);
                }
                else {
                    throw err;
                }
            });
            archive.pipe(output);
            emitter.emit('buildArtifact:start', { scenarioUuid });
            // generate javascript files
            // copy package.json
            // create config
            // zip
            const distPath = locator.buildIntentsResourcePath('dist');
            yield transpileIntents(locator.srcIntentsDir, distPath);
            emitter.emit('buildArtifact:intentsTranspiled');
            yield prepareConfig_1.default(locator.authConfigPath, distPath, scenarioUuid, locator.scenarioRootResourcePath('node_modules'))
                .then((config) => __awaiter(this, void 0, void 0, function* () {
                emitter.emit('buildArtifact:configured', { intents: config.intents });
                yield attachConfig_1.default(archive, JSON.stringify(config, null, 2), {
                    name: CONFIG_FILE
                });
                archive.append(generateHandler_1.default(config), { name: HANDLER_NAME });
                yield addFilesToArchive_1.default(archive, distPath);
            }))
                .then(() => {
                archive.finalize();
            })
                .catch(error => {
                emitter.emit('buildArtifact:failed', { error: error.toString() });
            });
        }
        catch (error) {
            emitter.emit('buildArtifact:error', error);
            reject(error);
        }
    }));
};
function transpileIntents(entriesPath, distPath) {
    return new Promise((resolve, reject) => {
        // Note: it works because we have client.ts present
        globby([`${entriesPath}/*.ts`])
            .then(files => {
            if (files.length) {
                const entries = files.reduceRight((entriesAcc, file) => (Object.assign({}, entriesAcc, { [pathJs.basename(file).split('.')[0]]: file })), {});
                webpack({
                    mode: 'production',
                    // optimization: {
                    //   minimize: false
                    // },
                    entry: entries,
                    module: {
                        rules: [
                            {
                                test: /\.tsx?$/,
                                loader: 'ts-loader',
                                exclude: /node_modules/,
                                options: {
                                    compilerOptions: {
                                        allowUnreachableCode: false,
                                        declaration: false,
                                        lib: ['es2017'],
                                        noUnusedLocals: false,
                                        noUnusedParameters: false,
                                        allowSyntheticDefaultImports: true,
                                        experimentalDecorators: true,
                                        moduleResolution: 'node',
                                        module: 'es6',
                                        target: 'es2017'
                                    }
                                }
                            }
                        ]
                    },
                    resolve: {
                        extensions: ['.tsx', '.ts', '.js']
                    },
                    target: 'node',
                    output: {
                        libraryTarget: 'commonjs2',
                        filename: '[name].js',
                        path: distPath
                    }
                    // TODO: check if it is necessary
                    // context: pathJs.resolve(path)
                }, (err, stats) => {
                    if (err || stats.hasErrors()) {
                        reject(stats);
                    }
                    else {
                        resolve(true);
                    }
                });
            }
            else {
                reject([{ error: 'No intents to process' }]);
            }
        })
            .catch(error => {
            reject([{ error }]);
        });
    });
}
exports.transpileIntents = transpileIntents;
