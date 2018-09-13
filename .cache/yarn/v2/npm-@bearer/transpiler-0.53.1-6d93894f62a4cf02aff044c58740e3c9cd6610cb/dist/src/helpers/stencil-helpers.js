"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const constants_1 = require("../constants");
const decorator_helpers_1 = require("./decorator-helpers");
function isWatcherOn(tsMethod, watchedProp) {
    if (!tsMethod.decorators) {
        return false;
    }
    const decorator = tsMethod.decorators.find(d => decorator_helpers_1.decoratorNamed(d, constants_1.Decorators.Watch));
    if (!decorator) {
        return false;
    }
    if (!ts.isCallExpression(decorator.expression)) {
        return false;
    }
    const firstArgument = decorator.expression.arguments[0];
    return ts.isStringLiteral(firstArgument) && firstArgument.text === watchedProp;
}
exports.isWatcherOn = isWatcherOn;
