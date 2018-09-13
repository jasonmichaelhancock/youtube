"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const Case = require("case");
const constants_1 = require("../constants");
const decorator_helpers_1 = require("../helpers/decorator-helpers");
function RootComponentTransformer({ metadata } = {}) {
    return _transformContext => {
        function visit(node) {
            if (ts.isClassDeclaration(node) && decorator_helpers_1.hasDecoratorNamed(node, constants_1.Decorators.RootComponent)) {
                const decorators = node.decorators.map(decorator => {
                    if (decorator_helpers_1.decoratorNamed(decorator, constants_1.Decorators.RootComponent)) {
                        const metadatum = metadata.components.find(component => component.classname === node.name.text);
                        const cssFileName = metadatum.group.charAt(0) + Case.camel(metadatum.group).substr(1);
                        const shadowExp = decorator_helpers_1.getExpressionFromDecorator(decorator, 'shadow');
                        return ts.updateDecorator(decorator, ts.createCall(ts.createIdentifier(constants_1.Decorators.Component), undefined, [
                            ts.createObjectLiteral([
                                ts.createPropertyAssignment('tag', ts.createStringLiteral(metadatum.finalTagName)),
                                ts.createPropertyAssignment('styleUrl', ts.createStringLiteral(cssFileName + '.css')),
                                ts.createPropertyAssignment('shadow', shadowExp || ts.createTrue())
                            ], true)
                        ]));
                    }
                    return decorator;
                });
                return ts.updateClassDeclaration(node, decorators, node.modifiers, node.name, node.typeParameters, node.heritageClauses, node.members);
            }
            return node;
        }
        return tsSourceFile => {
            return ts.visitEachChild(tsSourceFile, visit, _transformContext);
        };
    };
}
exports.default = RootComponentTransformer;
