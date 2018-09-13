"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Rewrite navigator-screen if they do not use renderFunc
 */
const ts = require("typescript");
const NAVIGATOR_SCREEN_TAG_NAME = 'bearer-navigator-screen';
function PropImporter({} = {}) {
    function moveSlotToRenderFuncProp(jsxNode) {
        return ts.createJsxSelfClosingElement(jsxNode.openingElement.tagName, jsxNode.openingElement.typeArguments, ts.createJsxAttributes([
            ...jsxNode.openingElement.attributes.properties,
            ts.createJsxAttribute(ts.createIdentifier('renderFunc'), ts.createJsxExpression(undefined, ts.createArrowFunction(undefined /* modifiers */, undefined, undefined, undefined, ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken), ts.createArrayLiteral([
                ...jsxNode.children.filter(child => {
                    // string not scoped are not supported because they are transformed into => ()
                    return ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child);
                })
            ]))))
        ]));
    }
    return _transformContext => {
        function visit(tsNode) {
            if (ts.isJsxElement(tsNode)) {
                if (tsNode.openingElement.tagName['escapedText'] === NAVIGATOR_SCREEN_TAG_NAME) {
                    return ts.visitEachChild(moveSlotToRenderFuncProp(tsNode), visit, _transformContext);
                }
            }
            return ts.visitEachChild(tsNode, visit, _transformContext);
        }
        return tsSourceFile => {
            return ts.visitEachChild(tsSourceFile, visit, _transformContext);
        };
    };
}
exports.default = PropImporter;
