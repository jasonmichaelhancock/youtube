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
const child_process_1 = require("child_process");
const path = require("path");
const fs = require("fs-extra");
const util_1 = require("util");
const startCommand_1 = require("./commands/startCommand");
const buildArtifact_1 = require("./buildArtifact");
const pushScenario = require("./pushScenario");
const pushViews = require("./pushViews");
const assembly = require("./assemblyScenario");
const refreshToken = require("./refreshToken");
const invalidateCloudFront_1 = require("./invalidateCloudFront");
const developerPortal = require("./developerPortal");
const execPromise = util_1.promisify(child_process_1.exec);
function buildIntents(emitter, config, locator) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const { scenarioUuid } = config;
        const artifactDirectory = locator.intentsArtifactDir;
        const intentsDirectory = locator.srcIntentsDir;
        yield fs.emptyDir(locator.buildIntentsDir);
        if (!fs.existsSync(artifactDirectory)) {
            fs.ensureDirSync(artifactDirectory);
        }
        try {
            emitter.emit('intents:installingDependencies');
            // TODOs: use root node modules
            yield execPromise(`${config.command} install`, { cwd: intentsDirectory });
            const scenarioArtifact = locator.intentsArtifactResourcePath(`${scenarioUuid}.zip`);
            const output = fs.createWriteStream(scenarioArtifact);
            buildArtifact_1.default(output, { scenarioUuid }, emitter, locator)
                .then(() => {
                emitter.emit('intents:buildIntents:succeeded');
                resolve(scenarioArtifact);
            })
                .catch(error => {
                emitter.emit('intents:buildIntents:failed', { error });
                reject(error);
            });
        }
        catch (e) {
            reject(e);
        }
    }));
}
exports.buildIntents = buildIntents;
function deployIntents(emitter, config, locator) {
    return new Promise((resolve, _reject) => __awaiter(this, void 0, void 0, function* () {
        const { rootPathRc } = config;
        if (!rootPathRc) {
            emitter.emit('rootPath:doesntExist');
            process.exit(1);
        }
        try {
            const scenarioArtifact = yield buildIntents(emitter, config, locator);
            yield pushScenario(scenarioArtifact, emitter, config);
            yield assembly(emitter, config);
            resolve();
        }
        catch (e) {
            emitter.emit('deployIntents:error', e);
            resolve();
        }
    }));
}
exports.deployIntents = deployIntents;
function deployViews(emitter, config, locator) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const { orgId, scenarioUuid, scenarioId, CdnHost } = config;
        yield fs.emptyDir(locator.buildViewsDir);
        try {
            const { buildDirectory } = yield startCommand_1.prepare(emitter, config, locator)({
                install: true,
                watchMode: null
            });
            if (!buildDirectory) {
                process.exit(1);
                return false;
            }
            yield transpileStep(emitter, locator, config);
            emitter.emit('views:buildingDist');
            yield execPromise(`${config.command} build`, {
                cwd: buildDirectory,
                env: Object.assign({ BEARER_SCENARIO_ID: scenarioUuid, BEARER_SCENARIO_TAG_NAME: scenarioId, BEARER_INTEGRATION_HOST: config.IntegrationServiceHost, BEARER_AUTHORIZATION_HOST: config.IntegrationServiceHost }, process.env, { CDN_HOST: `${CdnHost}/${orgId}/${scenarioId}/dist/${scenarioId}/` })
            });
            emitter.emit('views:pushingDist');
            yield pushViews(buildDirectory, emitter, config);
            emitter.emit('view:upload:success');
            yield invalidateCloudFront_1.default(emitter, config);
            resolve();
        }
        catch (e) {
            emitter.emit('deployScenario:deployViews:error', e);
            console.error(e);
            reject(e);
        }
    }));
}
exports.deployViews = deployViews;
function transpileStep(emitter, locator, config) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const { scenarioUuid, integrationServiceHost, scenarioId } = config;
        emitter.emit('start:prepare:transpileStep');
        const options = [path.join(__dirname, 'startTranspiler.js'), '--no-watcher', '--prefix-tag', scenarioUuid];
        const bearerTranspiler = child_process_1.spawn('node', options, {
            cwd: locator.scenarioRoot,
            env: Object.assign({}, process.env, { BEARER_SCENARIO_TAG_NAME: scenarioId, BEARER_SCENARIO_ID: scenarioUuid, BEARER_INTEGRATION_HOST: integrationServiceHost, BEARER_AUTHORIZATION_HOST: integrationServiceHost }),
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });
        bearerTranspiler.on('close', (...args) => {
            emitter.emit('start:prepare:transpileStep:close', args);
            resolve(...args);
        });
        bearerTranspiler.stderr.on('data', (...args) => {
            emitter.emit('start:prepare:transpileStep:command:error', args);
            reject(...args);
        });
        bearerTranspiler.on('message', ({ event }) => {
            if (event === 'transpiler:initialized') {
                emitter.emit('start:prepare:transpileStep:done');
                resolve(bearerTranspiler);
            }
            else {
                emitter.emit('start:prepare:transpileStep:error');
                reject(event);
            }
        });
    }));
}
function deployScenario({ noViews = false, noIntents = false }, emitter, config, locator) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        let calculatedConfig = config;
        try {
            const { ExpiresAt } = config.bearerConfig;
            if (ExpiresAt < Date.now()) {
                calculatedConfig = yield refreshToken(config, emitter);
            }
            yield developerPortal(emitter, 'predeploy', calculatedConfig);
            if (!noIntents) {
                yield deployIntents(emitter, calculatedConfig, locator);
            }
            if (!noViews) {
                yield deployViews(emitter, calculatedConfig, locator);
            }
            yield developerPortal(emitter, 'deployed', calculatedConfig);
            resolve();
        }
        catch (e) {
            emitter.emit('deployScenario:error', e);
            yield developerPortal(emitter, 'cancelled', calculatedConfig);
            reject(e);
        }
    }));
}
exports.deployScenario = deployScenario;
