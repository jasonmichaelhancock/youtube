"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bearer_1 = require("./bearer");
const constants_1 = require("../constants");
function ImportsImporter({} = {}) {
    return _transformContext => {
        return tsSourceFile => {
            if (bearer_1.hasImport(tsSourceFile, constants_1.Decorators.RootComponent)) {
                return bearer_1.ensureRootComponentNotImported(bearer_1.ensureComponentImported(tsSourceFile));
            }
            return tsSourceFile;
        };
    };
}
exports.default = ImportsImporter;
