"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * @Component()
 * class StarWarsMovies {}
 *
 * becomes
 *
 * @Component()
 * class StarWarsMovies {
 *
 *  @Prop({ context: 'bearer' }) bearerContext: string;
 *  @Prop() setupId: string;
 *
 *  componentDidLoad() {
 *    if(this.setupId) {
 *      this.bearerContext.setupId = this.setupId
 *    }
 *  }
 * }
 *
 */
const ts = require("typescript");
const decorator_helpers_1 = require("../helpers/decorator-helpers");
const bearer_1 = require("./bearer");
const constants_1 = require("../constants");
function ComponentTransformer({} = {}) {
    return transformContext => {
        function visit(node) {
            if (ts.isClassDeclaration(node) && decorator_helpers_1.hasDecoratorNamed(node, constants_1.Decorators.Component)) {
                return ts.visitEachChild(injectContext(node), visit, transformContext);
            }
            return ts.visitEachChild(node, visit, transformContext);
        }
        return tsSourceFile => {
            if (hasComponentDecorator(tsSourceFile)) {
                return visit(bearer_1.default.ensurePropImported(tsSourceFile));
            }
            return tsSourceFile;
        };
    };
}
exports.default = ComponentTransformer;
function injectContext(node) {
    const withContextProp = bearer_1.default.ensureBearerContextInjected(node);
    const withSetupProp = bearer_1.default.addSetupIdProp(withContextProp);
    return bearer_1.default.addComponentDidLoad(withSetupProp);
}
function hasComponentDecorator(sourceFile) {
    if (sourceFile.isDeclarationFile) {
        return false;
    }
    return ts.forEachChild(sourceFile, node => ts.isClassDeclaration(node) && decorator_helpers_1.hasDecoratorNamed(node, constants_1.Decorators.Component));
}
