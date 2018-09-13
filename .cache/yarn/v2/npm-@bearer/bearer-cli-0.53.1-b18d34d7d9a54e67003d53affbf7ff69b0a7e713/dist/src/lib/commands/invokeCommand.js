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
const axios_1 = require("axios");
const cosmiconfig = require("cosmiconfig");
const startLocalDevelopmentServer_1 = require("./startLocalDevelopmentServer");
exports.invoke = (emitter, config, locator) => (intent, cmd) => __awaiter(this, void 0, void 0, function* () {
    const { path } = cmd;
    const { scenarioUuid } = config;
    let fileData = {};
    if (path) {
        const explorer = cosmiconfig(path, {
            searchPlaces: [path]
        });
        const { config = {} } = (yield explorer.search(locator.scenarioRootResourcePath.toString())) || {};
        fileData = config;
    }
    const { params = {}, body = {} } = fileData;
    try {
        const integrationHostURL = yield startLocalDevelopmentServer_1.default(emitter, config, locator);
        const client = axios_1.default.create({ baseURL: `${integrationHostURL}api/v1`, timeout: 5000 });
        const { data } = yield client.post(`${scenarioUuid}/${intent}`, body, { params });
        console.log(JSON.stringify(data, null, 2));
        process.exit(0);
    }
    catch (e) {
        console.log(e);
        process.exit(1);
    }
});
function useWith(program, emitter, config, locator) {
    program
        .command('invoke <intent>')
        .option('-p, --path <path>')
        .description(`invoke Intent locally.
  $ bearer invoke <IntentName>
  $ bearer invoke <IntentName> -p tests/intent.json
`)
        .action(exports.invoke(emitter, config, locator));
}
exports.useWith = useWith;
