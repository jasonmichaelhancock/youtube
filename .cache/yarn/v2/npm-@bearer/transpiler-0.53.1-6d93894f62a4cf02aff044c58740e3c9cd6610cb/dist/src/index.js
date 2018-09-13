"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const fs = require("fs-extra");
const path = require("path");
const utils_1 = require("./utils");
const replace_intent_decorator_1 = require("./transformers/replace-intent-decorator");
const scenario_id_accessor_injector_1 = require("./transformers/scenario-id-accessor-injector");
const prop_injector_1 = require("./transformers/prop-injector");
const prop_bearer_context_injector_1 = require("./transformers/prop-bearer-context-injector");
const prop_importer_1 = require("./transformers/prop-importer");
const bearer_state_injector_1 = require("./transformers/bearer-state-injector");
const reference_id_injector_1 = require("./transformers/reference-id-injector");
const root_component_transformer_1 = require("./transformers/root-component-transformer");
const navigator_screen_transformer_1 = require("./transformers/navigator-screen-transformer");
const imports_transformer_1 = require("./transformers/imports-transformer");
const generate_metadata_file_1 = require("./transformers/generate-metadata-file");
const gather_metadata_1 = require("./transformers/gather-metadata");
class Transpiler {
    constructor(options) {
        this.rootFileNames = [];
        this.subscribers = {};
        this.watchFiles = true;
        this.buildFolder = '.bearer/views';
        this.srcFolder = 'views';
        this.verbose = true;
        this.files = {};
        this.metadata = {
            components: []
        };
        this.compilerOptionsts = {
            module: ts.ModuleKind.CommonJS
        };
        this.emitFiles = () => {
            // Now let's watch the files
            this.rootFileNames.forEach(fileName => {
                this.files[fileName] = { version: 0 };
                // First time around, emit all files
                this.emitFile(fileName);
                if (this.watchFiles) {
                    // Add a watch on the file to handle next change
                    fs.watchFile(fileName, { persistent: true, interval: 250 }, (curr, prev) => {
                        // Check timestamp
                        if (+curr.mtime <= +prev.mtime) {
                            return;
                        }
                        // Update the version to signal a change in the file
                        this.files[fileName].version++;
                        // write the changes to disk
                        this.emitFile(fileName);
                    });
                }
            });
        };
        this.trigger = (eventName) => {
            ;
            (this.subscribers[eventName] || []).forEach(callback => {
                callback();
            });
        };
        this.emitFile = (fileName) => {
            const output = this.service.getEmitOutput(fileName);
            if (!output.emitSkipped) {
                if (this.verbose) {
                    console.log(`Emitting ${fileName}`);
                }
            }
            else {
                console.log(`Emitting ${fileName} failed`);
                this.logErrors(fileName);
            }
        };
        Object.assign(this, options);
        this.ROOT_DIRECTORY = this.ROOT_DIRECTORY || process.cwd();
        if (options.tagNamePrefix) {
            const [orgId, scenarioId] = options.tagNamePrefix.replace(/\-/, '|').split('|');
            this.metadata.prefix = scenarioId;
            this.metadata.suffix = orgId;
        }
    }
    run() {
        this.refresh();
        if (!this.watchFiles) {
            this.stop();
        }
    }
    refresh() {
        this.clearWatchers();
        const config = ts.readConfigFile(path.join(this.BUILD_DIRECTORY, 'tsconfig.json'), ts.sys.readFile);
        if (config.error) {
            throw new Error(config.error.messageText);
        }
        const parsed = ts.parseJsonConfigFileContent(config, ts.sys, this.VIEWS_DIRECTORY);
        this.rootFileNames = parsed.fileNames;
        if (!this.rootFileNames.length) {
            console.warn('[BEARER]', 'No file to transpile');
        }
        const servicesHost = {
            getScriptFileNames: () => this.rootFileNames,
            getScriptVersion: fileName => this.files[fileName] && this.files[fileName].version.toString(),
            getScriptSnapshot: fileName => {
                if (!fs.existsSync(fileName)) {
                    return undefined;
                }
                return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
            },
            getCurrentDirectory: () => process.cwd(),
            getCompilationSettings: () => this.compilerOptionsts,
            getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
            getCustomTransformers: () => this.transformers,
            fileExists: ts.sys.fileExists,
            readFile: ts.sys.readFile,
            readDirectory: ts.sys.readDirectory
        };
        // Create the language service files
        this.service = ts.createLanguageService(servicesHost, ts.createDocumentRegistry());
        this.emitFiles();
    }
    stop() {
        this.clearWatchers();
        this.trigger('STOP');
    }
    clearWatchers() {
        this.rootFileNames.forEach(fileName => {
            fs.unwatchFile(fileName);
        });
    }
    on(event, callback) {
        this.subscribers[event] = this.subscribers[event] || [];
        this.subscribers[event].push(callback);
    }
    get transformers() {
        const verbose = true;
        return {
            before: [
                gather_metadata_1.default({ verbose, metadata: this.metadata }),
                root_component_transformer_1.default({ verbose, metadata: this.metadata }),
                reference_id_injector_1.default({ verbose, metadata: this.metadata }),
                replace_intent_decorator_1.default({ verbose, metadata: this.metadata }),
                scenario_id_accessor_injector_1.default({ verbose, metadata: this.metadata }),
                prop_importer_1.default({ verbose, metadata: this.metadata }),
                prop_injector_1.default({ verbose, metadata: this.metadata }),
                prop_bearer_context_injector_1.default({ verbose, metadata: this.metadata }),
                bearer_state_injector_1.default({ verbose, metadata: this.metadata }),
                navigator_screen_transformer_1.default({ verbose, metadata: this.metadata }),
                imports_transformer_1.default({ verbose, metadata: this.metadata }),
                dumpSourceCode({
                    verbose: true,
                    srcDirectory: this.VIEWS_DIRECTORY,
                    buildDirectory: this.BUILD_SCR_DIRECTORY
                }),
                generate_metadata_file_1.default({ verbose: verbose, metadata: this.metadata, outDir: this.BUILD_SCR_DIRECTORY })
            ],
            after: []
        };
    }
    logErrors(fileName) {
        let allDiagnostics = this.service
            .getCompilerOptionsDiagnostics()
            .concat(this.service.getSyntacticDiagnostics(fileName))
            .concat(this.service.getSemanticDiagnostics(fileName));
        allDiagnostics.forEach(diagnostic => {
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            if (diagnostic.file) {
                let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                console.log(`  Error ${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
            }
            else {
                console.log(`  Error: ${message}`);
            }
        });
    }
    get BUILD_DIRECTORY() {
        return path.join(this.ROOT_DIRECTORY, this.buildFolder);
    }
    get BUILD_SCR_DIRECTORY() {
        return path.join(this.BUILD_DIRECTORY, 'src');
    }
    get VIEWS_DIRECTORY() {
        return path.join(this.ROOT_DIRECTORY, this.srcFolder);
    }
}
exports.default = Transpiler;
function dumpSourceCode({ srcDirectory, buildDirectory } = { srcDirectory, buildDirectory }) {
    return _transformContext => {
        return tsSourceFile => {
            let outPath = tsSourceFile.fileName
                .replace(srcDirectory, buildDirectory)
                .replace(/js$/, 'ts')
                .replace(/jsx$/, 'tsx');
            fs.ensureFileSync(outPath);
            fs.writeFileSync(outPath, utils_1.getSourceCode(tsSourceFile));
            return tsSourceFile;
        };
    };
}
