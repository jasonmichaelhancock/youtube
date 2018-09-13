"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const constants_1 = require("../constants");
// @Prop() BEARER_ID: string;
function addBearerIdProp(classNode) {
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, [
        ...classNode.members,
        ts.createProperty([propDecorator()], undefined, 'BEARER_ID', undefined, ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)
    ]);
}
exports.addBearerIdProp = addBearerIdProp;
// this.BEARER_SCENARIO_ID => replaced during transpilation
function addBearerScenarioIdAccessor(classNode, scenarioId) {
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, [
        ...classNode.members,
        ts.createGetAccessor(undefined, [], 'SCENARIO_ID', undefined, undefined, ts.createBlock([ts.createReturn(ts.createLiteral(scenarioId))]))
    ]);
}
exports.addBearerScenarioIdAccessor = addBearerScenarioIdAccessor;
// @Prop({ context: 'bearer' }) bearerContext: any
function addBearerContextProp(classNode) {
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, [
        ...classNode.members,
        ts.createProperty([
            ts.createDecorator(ts.createCall(ts.createIdentifier(constants_1.Decorators.Prop), undefined, [
                ts.createObjectLiteral([
                    ts.createPropertyAssignment(ts.createLiteral('context'), ts.createLiteral('bearer'))
                ])
            ]))
        ], undefined, constants_1.Component.bearerContext, undefined, ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword), undefined)
    ]);
}
// @Prop() setupId: string
function addSetupIdProp(classNode) {
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, [
        ...classNode.members,
        ts.createProperty([
            ts.createDecorator(ts.createCall(ts.createIdentifier(constants_1.Decorators.Prop), undefined, undefined))
        ], undefined, constants_1.Component.setupId, undefined, ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), undefined)
    ]);
}
exports.addSetupIdProp = addSetupIdProp;
function methodeNamed(name) {
    return (node) => ts.isMethodDeclaration(node) && node.name.getText() === name;
}
// componentDidLoad(){ this.bearer.setupId = this.setupId }
function addComponentDidLoad(classNode) {
    const assignSetupId = ts.createStatement(ts.createAssignment(ts.createPropertyAccess(ts.createThis(), [constants_1.Component.bearerContext, constants_1.Component.setupId].join('.')), ts.createPropertyAccess(ts.createThis(), constants_1.Component.setupId)));
    const ifSetupIdPresent = ts.createIf(ts.createPropertyAccess(ts.createThis(), constants_1.Component.setupId), ts.createBlock([assignSetupId]));
    const predicate = methodeNamed(constants_1.Component.componentDidLoad);
    const members = classNode.members.filter(n => !predicate(n));
    const componentDidLoad = classNode.members.find(predicate) ||
        ts.createMethod(
        /* decorators */ undefined, 
        /* modifiers */ undefined, 
        /* asteriskToken */ undefined, constants_1.Component.componentDidLoad, 
        /* questionToken */ undefined, 
        /* typeParameters */ undefined, 
        /* parameters */ undefined, 
        /* type */ undefined, ts.createBlock([]));
    return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, [
        ...members,
        ts.createMethod(componentDidLoad.decorators, componentDidLoad.modifiers, componentDidLoad.asteriskToken, componentDidLoad.name, componentDidLoad.questionToken, componentDidLoad.typeParameters, componentDidLoad.parameters, componentDidLoad.type, ts.createBlock([ifSetupIdPresent, ...componentDidLoad.body.statements]))
    ]);
}
exports.addComponentDidLoad = addComponentDidLoad;
function inImportClause(node, libName) {
    return (ts.forEachChild(node, (node) => {
        if (ts.isNamedImports(node)) {
            return node.elements.reduce((included, element) => {
                return included || element.name.text === libName;
            }, false);
        }
    }) || false);
}
function hasImport(node, libName) {
    let has = false;
    ts.forEachChild(node, node => {
        if (ts.isImportDeclaration(node) &&
            coreImport(node) &&
            node.importClause &&
            inImportClause(node.importClause, libName)) {
            has = true;
        }
    });
    return has;
}
exports.hasImport = hasImport;
function coreImport(node) {
    return Boolean(node.moduleSpecifier['text'].toString().match(constants_1.Module.BEARER_CORE_MODULE));
}
function ensureHasImportFromCore(tsSourceFile, importName) {
    if (hasImport(tsSourceFile, importName)) {
        return tsSourceFile;
    }
    const predicate = (statement) => ts.isImportDeclaration(statement) && coreImport(statement);
    const importDeclaration = tsSourceFile.statements.find(predicate) ||
        ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamedImports([])), ts.createLiteral(constants_1.Module.BEARER_CORE_MODULE));
    const elements = importDeclaration.importClause.namedBindings.elements;
    const clauseWithNamedImport = ts.updateImportDeclaration(importDeclaration, importDeclaration.decorators, importDeclaration.modifiers, ts.updateImportClause(importDeclaration.importClause, importDeclaration.importClause.name, ts.createNamedImports([...elements, ts.createImportSpecifier(undefined, ts.createIdentifier(importName))])), importDeclaration.moduleSpecifier);
    const statements = [clauseWithNamedImport, ...tsSourceFile.statements.filter(el => !predicate(el))];
    return ts.updateSourceFileNode(tsSourceFile, statements, tsSourceFile.isDeclarationFile, tsSourceFile.referencedFiles, tsSourceFile.typeReferenceDirectives, tsSourceFile.hasNoDefaultLib);
}
function ensureHasNotImportFromCore(tsSourceFile, importName) {
    if (!hasImport(tsSourceFile, importName)) {
        return tsSourceFile;
    }
    const predicate = (statement) => ts.isImportDeclaration(statement) && coreImport(statement);
    const importDeclaration = tsSourceFile.statements.find(predicate) ||
        ts.createImportDeclaration(undefined, undefined, ts.createImportClause(undefined, ts.createNamedImports([])), ts.createLiteral(constants_1.Module.BEARER_CORE_MODULE));
    const elements = importDeclaration.importClause.namedBindings.elements.filter(element => {
        if (element.name.text === importName) {
            return;
        }
        return element;
    });
    const clauseWithNamedImport = ts.updateImportDeclaration(importDeclaration, importDeclaration.decorators, importDeclaration.modifiers, ts.updateImportClause(importDeclaration.importClause, importDeclaration.importClause.name, ts.createNamedImports(elements)), importDeclaration.moduleSpecifier);
    const statements = [clauseWithNamedImport, ...tsSourceFile.statements.filter(el => !predicate(el))];
    return ts.updateSourceFileNode(tsSourceFile, statements, tsSourceFile.isDeclarationFile, tsSourceFile.referencedFiles, tsSourceFile.typeReferenceDirectives, tsSourceFile.hasNoDefaultLib);
}
function ensureBearerContextInjected(classNode) {
    const has = ts.forEachChild(classNode, node => ts.isPropertyDeclaration(node) && node.name['escapedText'] == constants_1.Component.bearerContext);
    return has ? classNode : addBearerContextProp(classNode);
}
exports.ensureBearerContextInjected = ensureBearerContextInjected;
function ensureWatchImported(tsSourceFile) {
    return ensureHasImportFromCore(tsSourceFile, constants_1.Decorators.Watch);
}
exports.ensureWatchImported = ensureWatchImported;
function ensurePropImported(tsSourceFile) {
    return ensureHasImportFromCore(tsSourceFile, constants_1.Decorators.Prop);
}
exports.ensurePropImported = ensurePropImported;
function ensureComponentImported(tsSourceFile) {
    return ensureHasImportFromCore(tsSourceFile, constants_1.Decorators.Component);
}
exports.ensureComponentImported = ensureComponentImported;
function ensureRootComponentNotImported(tsSourceFile) {
    return ensureHasNotImportFromCore(tsSourceFile, constants_1.Decorators.RootComponent);
}
exports.ensureRootComponentNotImported = ensureRootComponentNotImported;
function ensureStateImported(tsSourceFile) {
    return ensureHasImportFromCore(tsSourceFile, constants_1.Decorators.State);
}
exports.ensureStateImported = ensureStateImported;
function ensureElementImported(tsSourceFile) {
    return ensureHasImportFromCore(tsSourceFile, constants_1.Decorators.Element);
}
exports.ensureElementImported = ensureElementImported;
function propDecorator() {
    return ts.createDecorator(ts.createCall(ts.createIdentifier(constants_1.Decorators.Prop), undefined, undefined));
}
exports.propDecorator = propDecorator;
function elementDecorator() {
    return ts.createDecorator(ts.createCall(ts.createIdentifier(constants_1.Decorators.Element), undefined, undefined));
}
exports.elementDecorator = elementDecorator;
exports.default = {
    addBearerScenarioIdAccessor,
    addBearerIdProp,
    addBearerContextProp,
    addSetupIdProp,
    addComponentDidLoad,
    hasImport,
    coreImport,
    ensureBearerContextInjected,
    ensurePropImported
};
