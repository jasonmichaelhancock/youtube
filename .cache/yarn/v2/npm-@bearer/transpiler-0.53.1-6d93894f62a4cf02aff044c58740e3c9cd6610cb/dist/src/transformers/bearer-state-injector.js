"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 *
 */
const ts = require("typescript");
const decorator_helpers_1 = require("../helpers/decorator-helpers");
const bearer_1 = require("./bearer");
const constants_1 = require("../constants");
const guards_helpers_1 = require("../helpers/guards-helpers");
const method_updaters_1 = require("../helpers/method-updaters");
const stencil_helpers_1 = require("../helpers/stencil-helpers");
const state = ts.createIdentifier('state');
function BearerStateInjector({} = {}) {
    return transformContext => {
        return tsSourceFile => {
            if (!hasBearerStateDecorator(tsSourceFile)) {
                return tsSourceFile;
            }
            const propsDecorator = extractDecoratedPropertyInformation(tsSourceFile);
            // Inject Imports if needed: Watch
            const preparedSourceFile = bearer_1.ensureStateImported(bearer_1.ensureWatchImported(tsSourceFile));
            function visit(node) {
                if (ts.isClassDeclaration(node)) {
                    // Ensures we have context available
                    const withInjectedContext = bearer_1.ensureBearerContextInjected(node);
                    // Append @Prop() decorator to before @BearerState
                    const withPropDecoratorToDeclaration = addPropDecoratorToPropDeclaration(withInjectedContext);
                    // Inject prop watcher
                    const withInjectedWatcher = injectPropertyWatcher(withPropDecoratorToDeclaration, propsDecorator);
                    // Append logic to componentWillLoad/componentDidUnload
                    const withComponentLifecyleHooked = updateComponentLifecycle(withInjectedWatcher);
                    // Add update logic method
                    const bearerStateReadyComponent = injectStateUpdateLogic(withComponentLifecyleHooked, propsDecorator);
                    return bearerStateReadyComponent;
                }
                return ts.visitEachChild(node, visit, transformContext);
            }
            return visit(preparedSourceFile);
        };
    };
}
exports.default = BearerStateInjector;
/**
 * Inject methods to auto update component
 */
function injectStateUpdateLogic(classNode, propsDecoratedMeta) {
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, [
        ...classNode.members,
        ts.createProperty(undefined, undefined, 'bearerUpdateFromState', undefined, undefined, ts.createArrowFunction(undefined, undefined, [ts.createParameter(undefined, undefined, undefined, state)], undefined, undefined, ts.createBlock(propsDecoratedMeta.map(meta => ts.createStatement(ts.createAssignment(ts.createPropertyAccess(ts.createThis(), meta.componentPropName), ts.createElementAccess(state, ts.createLiteral(meta.statePropName))))))))
    ]);
}
/**
 * Add subscription methods to component lifecycle
 */
function updateComponentLifecycle(aClassNode) {
    const classNode = guards_helpers_1.ensureMethodExists(guards_helpers_1.ensureMethodExists(aClassNode, constants_1.Component.componentWillLoad), constants_1.Component.componentDidUnload);
    const withSubscribe = method_updaters_1.updateMethodOfClass(classNode, constants_1.Component.componentWillLoad, method => method_updaters_1.prependToStatements(method, [
        ts.createStatement(ts.createCall(ts.createPropertyAccess(ts.createThis(), `${constants_1.Component.bearerContext}.subscribe`), undefined, [
            ts.createThis()
        ]))
    ]));
    return method_updaters_1.updateMethodOfClass(withSubscribe, constants_1.Component.componentDidUnload, method => method_updaters_1.prependToStatements(method, [
        ts.createStatement(ts.createCall(ts.createPropertyAccess(ts.createThis(), `${constants_1.Component.bearerContext}.unsubscribe`), undefined, [
            ts.createThis()
        ]))
    ]));
}
function createWatcher(meta) {
    return ts.createMethod([
        ts.createDecorator(ts.createCall(ts.createIdentifier(constants_1.Decorators.Watch), undefined, [
            ts.createLiteral(meta.componentPropName)
        ]))
    ], undefined, undefined, ts.createIdentifier(`_notifyBearerStateHandler_${meta.componentPropName}`), undefined, undefined, [
        ts.createParameter(undefined, undefined, undefined, 'newValue', undefined, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword), undefined)
    ], undefined, ts.createBlock([createUpdateStatement(meta.statePropName, 'newValue')]));
}
function createUpdateStatement(stateName, parameterName) {
    return ts.createStatement(ts.createCall(ts.createPropertyAccess(ts.createThis(), `${constants_1.Component.bearerContext}.update`), undefined, [
        ts.createLiteral(stateName),
        ts.createIdentifier(parameterName)
    ]));
}
/**
 * Add or update State Watcher
 */
function injectPropertyWatcher(classNode, propsDecoratedMeta) {
    const members = propsDecoratedMeta.reduce((members, meta) => {
        const predicate = node => ts.isMethodDeclaration(node) && stencil_helpers_1.isWatcherOn(node, meta.componentPropName);
        const watcherHandler = members.find(predicate);
        if (watcherHandler) {
            const newValueParameterName = watcherHandler.parameters[0].name['escapedText'];
            return [
                ...members.filter(node => !predicate(node)),
                method_updaters_1.prependToStatements(watcherHandler, [createUpdateStatement(meta.componentPropName, newValueParameterName)])
            ];
        }
        return ts.createNodeArray([...members, createWatcher(meta)]);
    }, classNode.members);
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, members);
}
/**
 * Add @Prop() before @BearerState
 * withPropDecoratorToDeclaration
 */
function addPropDecoratorToPropDeclaration(classNode) {
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, classNode.members.map(appendStateDecoratorIfNeeded));
}
function appendStateDecoratorIfNeeded(element) {
    if (ts.isPropertyDeclaration(element) &&
        decorator_helpers_1.hasDecoratorNamed(element, constants_1.Decorators.BearerState)) {
        return ts.updateProperty(element, [
            ...element.decorators,
            ts.createDecorator(ts.createCall(ts.createIdentifier(constants_1.Decorators.State), undefined, undefined))
        ], element.modifiers, element.name, element.questionToken, element.type, element.initializer);
    }
    return element;
}
/**
 *  Not a declaration file and contains a @BearerState propertyDecorator
 */
function hasBearerStateDecorator(sourceFile) {
    if (sourceFile.isDeclarationFile) {
        return false;
    }
    return ts.forEachChild(sourceFile, node => ts.isClassDeclaration(node) && decorator_helpers_1.hasPropDecoratedWithName(node, constants_1.Decorators.BearerState));
}
function extractDecoratedPropertyInformation(tsSourceFile) {
    return (ts.forEachChild(tsSourceFile, node => ts.isClassDeclaration(node) && decorator_helpers_1.propDecoratedWithName(node, constants_1.Decorators.BearerState)) || []).map(prop => {
        const decoratorOptions = prop.decorators[0].expression.arguments[0];
        const componentPropName = prop.name['escapedText'];
        let statePropName = componentPropName;
        if (decoratorOptions && ts.isObjectLiteralExpression(decoratorOptions)) {
            const stateNameOption = decoratorOptions.properties.find(prop => prop.name['escapedText'] == 'statePropName');
            if (stateNameOption) {
                statePropName = stateNameOption['initializer'];
            }
        }
        return {
            componentPropName,
            statePropName
        };
    });
}
