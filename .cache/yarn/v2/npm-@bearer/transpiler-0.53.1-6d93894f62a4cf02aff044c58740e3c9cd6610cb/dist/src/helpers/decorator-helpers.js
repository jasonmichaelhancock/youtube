"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
function hasPropDecoratedWithName(classNode, decoratorName) {
    return Boolean(propDecoratedWithName(classNode, decoratorName).length);
}
exports.hasPropDecoratedWithName = hasPropDecoratedWithName;
function propDecoratedWithName(node, decoratorName) {
    const props = [];
    ts.forEachChild(node, node => {
        if (ts.isPropertyDeclaration(node) && hasDecoratorNamed(node, decoratorName)) {
            props.push(node);
        }
    });
    return props;
}
exports.propDecoratedWithName = propDecoratedWithName;
function hasDecoratorNamed(decoratedNode, name) {
    return ts.forEachChild(decoratedNode, anode => {
        return ts.isDecorator(anode) && decoratorNamed(anode, name);
    });
}
exports.hasDecoratorNamed = hasDecoratorNamed;
function decoratorNamed(tsDecorator, name) {
    return ts.forEachChild(tsDecorator, node => {
        return ts.isCallExpression(node) && node.expression['escapedText'] === name;
    });
}
exports.decoratorNamed = decoratorNamed;
function getDecoratorProperties(tsDecorator, index = 0) {
    if (!ts.isCallExpression(tsDecorator.expression)) {
        return ts.createObjectLiteral([]);
    }
    const expression = tsDecorator.expression;
    const argument = expression.arguments[index];
    if (!ts.isObjectLiteralExpression(argument)) {
        return ts.createObjectLiteral([]);
    }
    return ts.createObjectLiteral(argument.properties);
}
exports.getDecoratorProperties = getDecoratorProperties;
function getExpressionFromLiteralObject(tsLiteral, key) {
    const found = tsLiteral.properties.find(property => property.name.getText().trim() === key);
    if (found) {
        return found.initializer;
    }
    return null;
}
exports.getExpressionFromLiteralObject = getExpressionFromLiteralObject;
function getExpressionFromDecorator(tsDecorator, key, index = 0) {
    return getExpressionFromLiteralObject(getDecoratorProperties(tsDecorator, index), key);
}
exports.getExpressionFromDecorator = getExpressionFromDecorator;
function getDecoratorNamed(tsClassNode, name) {
    return tsClassNode.decorators.find(decorator => decoratorNamed(decorator, name));
}
exports.getDecoratorNamed = getDecoratorNamed;
