"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
function getSourceCode(node) {
    const resultFile = ts.createSourceFile('tmp.ts', '', ts.ScriptTarget.Latest, 
    /*setParentNodes*/ false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed
    });
    return printer.printNode(ts.EmitHint.Unspecified, node, resultFile);
}
exports.getSourceCode = getSourceCode;
