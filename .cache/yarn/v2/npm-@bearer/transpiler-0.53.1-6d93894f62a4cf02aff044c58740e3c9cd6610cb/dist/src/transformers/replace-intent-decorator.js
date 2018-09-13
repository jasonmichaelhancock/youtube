"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * From this:
 * class AComponent {
 *  @Intent('aName') fetcher: BearerFetch
 * }
 *
 * to this:
 *
 * class AComponent {
 *  private fetcher: BearerFetch
 *
 *  constructor() {
 *    Intent('aName')(this, fetcher)
 *  }
 * }
 *
 * why:
 *  By doing this we allow our Decorator to have access to the component instance instead of the prototype
 */
const ts = require("typescript");
const decorator_helpers_1 = require("../helpers/decorator-helpers");
const constants_1 = require("../constants");
function appendConstructor(node) {
    if (classHasConstructor(node)) {
        return node;
    }
    return ts.updateClassDeclaration(node, node.decorators, node.modifiers, node.name, node.typeParameters, node.heritageClauses, [
        ...node.members,
        ts.createConstructor(
        /* constructors */ undefined, 
        /* modifiers */ undefined, 
        /* parameters */ undefined, ts.createBlock([]))
    ]);
}
function classHasConstructor(classNode) {
    return ts.forEachChild(classNode, aNode => {
        return ts.isConstructorDeclaration(aNode);
    });
}
function ComponentTransformer({} = {}) {
    return transformContext => {
        // create constructor if it does not exist
        // append Intent call within constructor
        // remove @Intent decorator from the sourcefile
        return tsSourceFile => {
            const registeredIntents = [];
            const withDecoratorReplaced = visitRemoveIntentDecorators(tsSourceFile, registeredIntents);
            const withConstructor = visitEnsureConstructor(withDecoratorReplaced);
            return visitConstructor(withConstructor, registeredIntents);
        };
        // Remove decorators and replace them with a property access
        function visitRemoveIntentDecorators(node, registeredIntents) {
            if (ts.isPropertyDeclaration(node)) {
                return replaceIfIntentDecorated(node, registeredIntents);
            }
            return ts.visitEachChild(node, node => visitRemoveIntentDecorators(node, registeredIntents), transformContext);
        }
        function replaceIfIntentDecorated(node, registeredIntents) {
            if (decorator_helpers_1.hasDecoratorNamed(node, constants_1.Decorators.Intent)) {
                registeredIntents.push(node);
                return ts.createProperty(
                /* decorators */ undefined, 
                /* modifiers */ [ts.createToken(ts.SyntaxKind.PrivateKeyword)], node.name, node.questionToken, node.type, node.initializer);
            }
            return node;
        }
        // Create a constructor if none is present
        function visitEnsureConstructor(node) {
            if (ts.isClassDeclaration(node)) {
                return ts.visitEachChild(appendConstructor(node), visitEnsureConstructor, transformContext);
            }
            return ts.visitEachChild(node, visitEnsureConstructor, transformContext);
        }
        // Call Intent function
        function visitConstructor(node, registeredIntents) {
            if (ts.isConstructorDeclaration(node)) {
                return addIntentCallToConstructor(node, registeredIntents);
            }
            return ts.visitEachChild(node, node => visitConstructor(node, registeredIntents), transformContext);
        }
        function addIntentCallToConstructor(node, registeredIntents) {
            const intentCalls = registeredIntents.map((intent) => {
                const call = intent.decorators[0].getChildAt(1);
                return ts.createStatement(ts.createCall(ts.createCall(ts.createIdentifier(constants_1.Decorators.Intent), undefined, call.arguments), undefined, [ts.createThis(), ts.createLiteral(intent.name.getText())]));
            });
            return ts.updateConstructor(node, node.decorators, node.modifiers, node.parameters, ts.updateBlock(node.body, [...node.body.statements, ...intentCalls]));
        }
    };
}
exports.default = ComponentTransformer;
