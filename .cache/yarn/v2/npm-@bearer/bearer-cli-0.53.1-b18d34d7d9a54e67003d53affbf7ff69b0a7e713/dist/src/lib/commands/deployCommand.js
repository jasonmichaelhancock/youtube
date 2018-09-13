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
const deployScenario_1 = require("../deployScenario");
const deploy = (emitter, config, locator) => ({ viewsOnly = false, intentsOnly = false }) => __awaiter(this, void 0, void 0, function* () {
    emitter.emit('deploy:started');
    // Always true?
    if (!locator.scenarioRoot) {
        emitter.emit('rootPath:doesntExist');
        process.exit(1);
    }
    const { scenarioUuid, scenarioId } = config;
    if (!scenarioUuid) {
        emitter.emit('scenarioUuid:missing');
        process.exit(1);
    }
    if (!(config.bearerConfig &&
        config.bearerConfig.authorization &&
        config.bearerConfig.authorization.AuthenticationResult &&
        config.bearerConfig.authorization.AuthenticationResult.IdToken)) {
        emitter.emit('user:notAuthenticated');
        process.exit(1);
    }
    const deployOptions = { noViews: intentsOnly, noIntents: viewsOnly };
    try {
        yield deployScenario_1.deployScenario(deployOptions, emitter, config, locator);
        const setupUrl = `${config.DeveloperPortalUrl}scenarios/${config.scenarioUuid}/preview`;
        emitter.emit('deploy:finished', {
            scenarioId,
            setupUrl
        });
    }
    catch (error) {
        emitter.emit('deploy:failed', {
            error
        });
    }
});
function useWith(program, emitter, config, locator) {
    program
        .command('deploy')
        .description(`Build a scenario package.
$ bearer deploy
`)
        .option('-v, --views-only', 'Deploy views only')
        .option('-i, --intents-only', 'Deploy intents only')
        .action(deploy(emitter, config, locator));
}
exports.useWith = useWith;
