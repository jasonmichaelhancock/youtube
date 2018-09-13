"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
function hasMethodNamed(classNode, methodName) {
    return ts.forEachChild(classNode, node => isMethodNamed(node, methodName));
}
exports.hasMethodNamed = hasMethodNamed;
function isMethodNamed(tsNode, name) {
    return ts.isMethodDeclaration(tsNode) && tsNode.name['escapedText'] === name;
}
exports.isMethodNamed = isMethodNamed;
