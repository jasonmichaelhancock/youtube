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
exports.link = (emitter, config, _locator) => (scenarioUuid) => __awaiter(this, void 0, void 0, function* () {
    emitter.emit('link:start');
    const { scenarioTitle } = config;
    const [orgId, scenarioId] = scenarioUuid.replace(/\-/, '|').split('|');
    const scenarioRc = { orgId, scenarioId, scenarioTitle };
    config.setScenarioConfig(scenarioRc);
    emitter.emit('link:success', scenarioRc);
});
function useWith(program, emitter, config, locator) {
    program
        .command('link')
        .description(`Link the scenario with developer portal
  $ bearer link 4l1c3-scenario-name
`)
        .action(exports.link(emitter, config, locator));
}
exports.useWith = useWith;
