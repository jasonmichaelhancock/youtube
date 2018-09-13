"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const decorator_helpers_1 = require("../helpers/decorator-helpers");
const bearer_1 = require("./bearer");
const constants_1 = require("../constants");
function BearerReferenceIdInjector({} = {}) {
    return transformContext => {
        return tsSourceFile => {
            if (!hasRetrieveOrSaveStateIntent(tsSourceFile)) {
                return tsSourceFile;
            }
            function visit(node) {
                if (ts.isClassDeclaration(node)) {
                    return injectHTMLElementPropery(injectBearerReferenceIdProp(node));
                }
                return ts.visitEachChild(node, visit, transformContext);
            }
            return ts.visitEachChild(bearer_1.ensureElementImported(bearer_1.ensurePropImported(tsSourceFile)), visit, transformContext);
        };
    };
}
exports.default = BearerReferenceIdInjector;
function injectHTMLElementPropery(tsClass) {
    if (decorator_helpers_1.hasPropDecoratedWithName(tsClass, constants_1.Decorators.Element)) {
        const existingProp = decorator_helpers_1.propDecoratedWithName(tsClass, constants_1.Decorators.Element)[0];
        const propertyName = existingProp.name['escapedText'];
        if (propertyName !== constants_1.Properties.Element) {
            return ts.updateClassDeclaration(tsClass, tsClass.decorators, tsClass.modifiers, tsClass.name, tsClass.typeParameters, tsClass.heritageClauses, [
                ...tsClass.members,
                ts.createGetAccessor(undefined, // decorators
                undefined, // modifiers
                constants_1.Properties.Element, // name
                undefined, // questionExclamationToken
                ts.createTypeReferenceNode(constants_1.Types.HTMLElement, undefined), // Type
                ts.createBlock([
                    ts.createReturn(ts.createPropertyAccess(ts.createThis(), propertyName) // initializer
                    )
                ]))
            ]);
        }
        return tsClass;
    }
    return ts.updateClassDeclaration(tsClass, tsClass.decorators, tsClass.modifiers, tsClass.name, tsClass.typeParameters, tsClass.heritageClauses, [
        ...tsClass.members,
        ts.createProperty([bearer_1.elementDecorator()], undefined, constants_1.Properties.Element, undefined, ts.createTypeReferenceNode(constants_1.Types.HTMLElement, undefined), undefined)
    ]);
}
function injectBearerReferenceIdProp(tsClass) {
    return ts.updateClassDeclaration(tsClass, tsClass.decorators, tsClass.modifiers, tsClass.name, tsClass.typeParameters, tsClass.heritageClauses, [
        ...tsClass.members,
        ts.createProperty([bearer_1.propDecorator()], undefined, constants_1.Properties.ReferenceId, undefined, ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)
    ]);
}
function hasRetrieveOrSaveStateIntent(tsSourceFile) {
    return ts.forEachChild(tsSourceFile, (node) => {
        if (ts.isClassDeclaration(node)) {
            return hasDeprecatedStateDecorator(node) || hasIntentWithStateTypeDecorator(node);
        }
        return false;
    });
}
function hasIntentWithStateTypeDecorator(classNode) {
    const properties = decorator_helpers_1.propDecoratedWithName(classNode, constants_1.Decorators.Intent);
    return properties.reduce((has, prop) => {
        const decorator = prop.decorators.find(deco => decorator_helpers_1.decoratorNamed(deco, constants_1.Decorators.Intent));
        if (!decorator || !ts.isCallExpression(decorator.expression)) {
            return has;
        }
        const intentType = decorator.expression.arguments[1];
        const hasWisthState = intentType &&
            intentType.expression.getText() === constants_1.Types.IntentType &&
            (intentType.name.getText() === constants_1.Types.RetrieveState || intentType.name.getText() === constants_1.Types.SaveState);
        return has || hasWisthState;
    }, false);
}
function hasDeprecatedStateDecorator(classNode) {
    return (decorator_helpers_1.hasPropDecoratedWithName(classNode, constants_1.Decorators.RetrieveStateIntent) ||
        decorator_helpers_1.hasPropDecoratedWithName(classNode, constants_1.Decorators.SaveStateIntent));
}
