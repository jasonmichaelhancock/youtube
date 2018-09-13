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
const globby = require("globby");
const vm = require("vm");
const fs = require("fs");
const util_1 = require("util");
const readFileAsync = util_1.promisify(fs.readFile);
exports.default = (authConfigFile, distPath, scenarioUuid, nodeModulesPath) => {
    module.paths.push(nodeModulesPath);
    return globby([`${distPath}/*.js`]).then(files => files
        .reduce((acc, f) => __awaiter(this, void 0, void 0, function* () {
        const code = yield readFileAsync(f);
        const context = vm.createContext({ module: {} });
        vm.runInNewContext(code.toString(), context);
        const intent = context['module'].exports.default;
        if (intent && intent.intentName)
            acc.then(config => config.intents.push({
                [intent.intentName]: `index.${intent.intentName}`
            }));
        return acc;
    }), Promise.resolve({ integration_uuid: scenarioUuid, intents: [] }))
        .then((config) => __awaiter(this, void 0, void 0, function* () {
        try {
            const content = yield readFileAsync(authConfigFile, { encoding: 'utf8' });
            config.auth = JSON.parse(content);
            return config;
        }
        catch (e) {
            throw new Error(`Unable to read ${authConfigFile} : ${e.toString()}`);
        }
    })));
};
