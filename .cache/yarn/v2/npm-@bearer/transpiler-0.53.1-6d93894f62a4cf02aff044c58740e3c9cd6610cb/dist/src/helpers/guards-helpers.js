"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const node_helpers_1 = require("./node-helpers");
function ensureMethodExists(classNode, methodName) {
    if (node_helpers_1.hasMethodNamed(classNode, methodName)) {
        return classNode;
    }
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, [
        ...classNode.members,
        ts.createMethod(undefined, undefined, undefined, methodName, undefined, undefined, undefined, undefined, ts.createBlock([]))
    ]);
}
exports.ensureMethodExists = ensureMethodExists;
