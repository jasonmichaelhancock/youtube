"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
// function appendToStatements(
//   tsMethod: ts.MethodDeclaration,
//   statements: ReadonlyArray<ts.Statement>
// ): ts.MethodDeclaration {
//   return updateMethodStatements(tsMethod, [], statements)
// }
function prependToStatements(tsMethod, statements) {
    return updateMethodStatements(tsMethod, statements, []);
}
exports.prependToStatements = prependToStatements;
function updateMethodStatements(tsMethod, prependStatements, appendStatements) {
    return ts.updateMethod(tsMethod, tsMethod.decorators, tsMethod.modifiers, tsMethod.asteriskToken, tsMethod.name, tsMethod.questionToken, tsMethod.typeParameters, tsMethod.parameters, tsMethod.type, ts.createBlock([...prependStatements, ...tsMethod.body.statements, ...appendStatements]));
}
function updateMethodOfClass(classNode, methodeName, updater) {
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, classNode.members.map(member => {
        if (ts.isMethodDeclaration(member) && member.name['escapedText'] === methodeName) {
            return updater(member);
        }
        return member;
    }));
}
exports.updateMethodOfClass = updateMethodOfClass;
