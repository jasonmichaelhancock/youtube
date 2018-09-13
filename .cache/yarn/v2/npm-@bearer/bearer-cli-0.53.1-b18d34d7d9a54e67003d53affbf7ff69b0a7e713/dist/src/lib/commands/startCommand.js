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
const path = require('path');
const fs = require('fs-extra');
const copy = require('copy-template-dir');
const Case = require('case');
const chokidar = require('chokidar');
const { spawn, execSync } = require('child_process');
const startLocalDevelopmentServer_1 = require("./startLocalDevelopmentServer");
const generate_1 = require("./generate");
function watchNonTSFiles(watchedPath, destPath) {
    return new Promise((resolve, _reject) => {
        function callback(error) {
            if (error) {
                console.log('error', error);
            }
        }
        const watcher = chokidar.watch(watchedPath + '/**', {
            ignored: /\.tsx?$/,
            persistent: true,
            followSymlinks: false
        });
        watcher.on('ready', () => {
            resolve(watcher);
        });
        watcher.on('all', (event, filePath) => {
            const relativePath = filePath.replace(watchedPath, '');
            const targetPath = path.join(destPath, relativePath);
            // Creating symlink
            if (event == 'add') {
                console.log('creating symlink', filePath, targetPath);
                fs.ensureSymlink(filePath, targetPath, callback);
            }
            // // Deleting symlink
            if (event == 'unlink') {
                console.log('deleting symlink');
                fs.unlink(targetPath, err => {
                    if (err)
                        throw err;
                    console.log(targetPath + ' was deleted');
                });
            }
        });
    });
}
function prepare(emitter, config, locator) {
    return ({ install = true, watchMode = true } = {
        install: true,
        watchMode: true
    }) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { scenarioConfig: { scenarioTitle } } = config;
            const { buildViewsDir, buildViewsComponentsDir, srcViewsDir, scenarioRoot } = locator;
            // Create hidden folder
            emitter.emit('start:prepare:buildFolder');
            if (!fs.existsSync(buildViewsDir)) {
                fs.mkdirpSync(buildViewsDir);
            }
            fs.emptyDirSync(buildViewsDir);
            if (!fs.existsSync(buildViewsComponentsDir)) {
                fs.mkdirpSync(buildViewsComponentsDir);
            }
            // Symlink node_modules
            emitter.emit('start:symlinkNodeModules');
            createEvenIfItExists(locator.scenarioRootResourcePath('node_modules'), locator.buildViewsResourcePath('node_modules'));
            // symlink package.json
            emitter.emit('start:symlinkPackage');
            createEvenIfItExists(locator.scenarioRootResourcePath('package.json'), locator.buildViewsResourcePath('package.json'));
            // Copy stencil.config.json
            emitter.emit('start:prepare:stencilConfig');
            const vars = {
                componentTagName: Case.kebab(scenarioTitle)
            };
            const inDir = path.join(__dirname, 'templates', 'start');
            yield new Promise((resolve, reject) => {
                copy(inDir, buildViewsDir, vars, (err, createdFiles) => {
                    if (err)
                        reject(err);
                    createdFiles && createdFiles.forEach(filePath => emitter.emit('start:prepare:copyFile', filePath));
                    resolve();
                });
            });
            createEvenIfItExists(locator.buildViewsResourcePath('global'), path.join(locator.buildViewsComponentsDir, 'global'));
            yield generate_1.generateSetup({ emitter, locator });
            // Link non TS files
            const watcher = yield watchNonTSFiles(srcViewsDir, buildViewsComponentsDir);
            if (!watchMode) {
                watcher.close();
            }
            if (install) {
                emitter.emit('start:prepare:installingDependencies');
                execSync(`${config.command} install`, { cwd: scenarioRoot });
            }
            return {
                rootLevel: scenarioRoot,
                buildDirectory: buildViewsDir,
                viewsDirectory: srcViewsDir
            };
        }
        catch (error) {
            emitter.emit('start:prepare:failed', { error });
            throw error;
        }
    });
}
exports.prepare = prepare;
const ensureSetupComponents = (emitter, locator) => {
    generate_1.generateSetup({ emitter, locator });
};
exports.start = (emitter, config, locator) => ({ open, install, watcher }) => __awaiter(this, void 0, void 0, function* () {
    const { scenarioUuid } = config;
    try {
        yield prepare(emitter, config, locator)({
            install,
            watchMode: watcher
        });
        const { scenarioRoot, buildViewsDir } = locator;
        /* start local development server */
        const integrationHost = yield startLocalDevelopmentServer_1.default(emitter, config, locator);
        ensureSetupComponents(emitter, locator);
        emitter.emit('start:watchers');
        if (watcher) {
            fs.watchFile(locator.authConfigPath, { persistent: true, interval: 250 }, () => ensureSetupComponents(emitter, locator));
        }
        /* Start bearer transpiler phase */
        const BEARER = 'bearer-transpiler';
        const options = [watcher ? null : '--no-watcher'];
        // Build env for sub commands
        const envVariables = Object.assign({}, process.env, { BEARER_SCENARIO_TAG_NAME: 'localhost', BEARER_SCENARIO_ID: scenarioUuid, BEARER_INTEGRATION_HOST: integrationHost, BEARER_AUTHORIZATION_HOST: integrationHost });
        const bearerTranspiler = spawn('node', [path.join(__dirname, '..', 'startTranspiler.js'), options].filter(el => el), {
            cwd: scenarioRoot,
            env: envVariables,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        bearerTranspiler.stdout.on('data', childProcessStdout(emitter, BEARER));
        bearerTranspiler.stderr.on('data', childProcessStderr(emitter, BEARER));
        bearerTranspiler.on('close', childProcessClose(emitter, BEARER));
        if (watcher) {
            const tsxWatcher = chokidar.watch('**/*.tsx', {
                ignored: /(^|[\/\\])\../,
                cwd: locator.srcViewsDir,
                ignoreInitial: true,
                persistent: true,
                followSymlinks: false
            });
            tsxWatcher.on('add', () => bearerTranspiler.send('refresh'));
            tsxWatcher.on('unlink', () => bearerTranspiler.send('refresh'));
            tsxWatcher.on('error', error => emitter.emit('start:watchers:componentError', { error }));
            bearerTranspiler.on('message', ({ event }) => {
                if (event === 'transpiler:initialized') {
                    /* Start stencil */
                    const args = config.isYarnInstalled ? ['start'] : ['run', 'start'];
                    if (!open) {
                        args.push('--no-open');
                    }
                    const stencil = spawn(config.command, args, {
                        cwd: buildViewsDir,
                        env: envVariables
                    });
                    const STENCIL = 'stencil';
                    stencil.stdout.on('data', childProcessStdout(emitter, STENCIL));
                    stencil.stderr.on('data', childProcessStderr(emitter, STENCIL));
                    stencil.on('close', childProcessClose(emitter, STENCIL));
                }
            });
        }
    }
    catch (e) {
        emitter.emit('start:failed', { error: e });
    }
});
function useWith(program, emitter, config, locator) {
    program
        .command('start')
        .description(`Start local development server.
  $ bearer start
`)
        .option('--no-open', 'Do not open web browser')
        .option('--no-install', 'Do not run yarn|npm install')
        .option('--no-watcher', 'Run transpiler only once')
        .action(exports.start(emitter, config, locator));
}
exports.useWith = useWith;
/**
 * Logger helpers
 */
function childProcessStdout(emitter, name) {
    return data => {
        emitter.emit('start:watchers:stdout', { name, data });
    };
}
function childProcessStderr(emitter, name) {
    return data => {
        emitter.emit('start:watchers:stderr', { name, data });
    };
}
function childProcessClose(emitter, name) {
    return code => {
        emitter.emit('start:watchers:close', { name, code });
    };
}
function createEvenIfItExists(target, sourcePath) {
    try {
        fs.symlinkSync(target, sourcePath);
    }
    catch (e) {
        if (e.code !== 'EEXIST') {
            throw e;
        }
    }
}
