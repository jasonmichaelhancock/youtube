"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const Case = require("case");
const constants_1 = require("../constants");
const decorator_helpers_1 = require("../helpers/decorator-helpers");
function GatherMetadata({ metadata } = {}) {
    return _transformContext => {
        function visit(node) {
            // Found Component
            if (ts.isClassDeclaration(node) && decorator_helpers_1.hasDecoratorNamed(node, constants_1.Decorators.Component)) {
                const component = decorator_helpers_1.getDecoratorNamed(node, constants_1.Decorators.Component);
                const tag = decorator_helpers_1.getExpressionFromDecorator(component, 'tag');
                metadata.components.push({
                    classname: node.name.text,
                    isRoot: false,
                    initialTagName: tag.text,
                    finalTagName: tag.text
                });
                return node;
            }
            // Found RootComponent
            if (ts.isClassDeclaration(node) && decorator_helpers_1.hasDecoratorNamed(node, constants_1.Decorators.RootComponent)) {
                const component = decorator_helpers_1.getDecoratorNamed(node, constants_1.Decorators.RootComponent);
                const nameExpression = decorator_helpers_1.getExpressionFromDecorator(component, 'name');
                const name = nameExpression ? nameExpression.text : '';
                const groupExpression = decorator_helpers_1.getExpressionFromDecorator(component, 'group');
                const group = groupExpression ? groupExpression.text : '';
                const tag = [Case.kebab(group), name].join('-');
                const finalTag = metadata.prefix && metadata.suffix
                    ? [Case.kebab(metadata.prefix), tag, Case.kebab(metadata.suffix)].join('-')
                    : tag;
                metadata.components.push({
                    classname: node.name.text,
                    isRoot: true,
                    initialTagName: tag,
                    finalTagName: finalTag,
                    group: group
                });
                return node;
            }
            return node;
        }
        return tsSourceFile => {
            return ts.visitEachChild(tsSourceFile, visit, _transformContext);
        };
    };
}
exports.default = GatherMetadata;
