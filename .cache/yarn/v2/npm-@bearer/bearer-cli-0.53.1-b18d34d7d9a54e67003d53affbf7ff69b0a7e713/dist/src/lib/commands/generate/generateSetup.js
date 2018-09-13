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
const rc = require("rc");
const path = require("path");
const del = require("del");
const Case = require("case");
const copy = require("copy-template-dir");
const detect = require("detect-file");
function generateSetup({ emitter, locator, deleteSetup }) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            const authConfig = require(locator.authConfigPath);
            const scenarioConfig = rc('scenario');
            const { scenarioTitle } = scenarioConfig;
            const configKey = 'setupViews';
            const inDir = path.join(__dirname, '../templates/generate/setup');
            const outDir = locator.srcViewsDir;
            if (deleteSetup) {
                yield del(`${outDir}/setup*.tsx`).then(paths => {
                    paths.forEach(path => emitter.emit('generateTemplate:deleteFiles', path));
                });
            }
            if (isSetupExist(locator)) {
                resolve();
            }
            else if (authConfig[configKey] && authConfig[configKey].length) {
                const vars = {
                    componentName: Case.pascal(scenarioTitle),
                    componentTagName: Case.kebab(scenarioTitle),
                    fields: JSON.stringify(authConfig[configKey])
                };
                copy(inDir, outDir, vars, (err, createdFiles) => {
                    if (err)
                        throw err;
                    createdFiles.forEach(filePath => emitter.emit('generateTemplate:fileGenerated', filePath));
                    resolve();
                });
            }
            else {
                emitter.emit('generateTemplate:skipped', configKey);
                resolve();
            }
        }
        catch (error) {
            emitter.emit('generateTemplate:error', error.toString());
            reject(error);
        }
    }));
}
exports.generateSetup = generateSetup;
function isSetupExist(locator) {
    return (detect(path.join(locator.srcViewsDir, 'setup-action.tsx')) &&
        detect(path.join(locator.srcViewsDir, 'setup-display.tsx')));
}
