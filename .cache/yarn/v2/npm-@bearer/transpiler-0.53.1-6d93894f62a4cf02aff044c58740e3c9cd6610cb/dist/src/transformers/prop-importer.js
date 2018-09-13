"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bearer_1 = require("./bearer");
const constants_1 = require("../constants");
function PropImporter({} = {}) {
    return _transformContext => {
        return tsSourceFile => {
            if (bearer_1.hasImport(tsSourceFile, constants_1.Decorators.Component) && !bearer_1.hasImport(tsSourceFile, constants_1.Decorators.Prop)) {
                return bearer_1.ensurePropImported(tsSourceFile);
            }
            return tsSourceFile;
        };
    };
}
exports.default = PropImporter;
