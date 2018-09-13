"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Checks if class is decorated with @Component decorator
 * and injects the `@Prop() BEARER_ID: string;` into class definition
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
                return ts.visitEachChild(bearer_1.default.addBearerIdProp(node), visit, transformContext);
            }
            return ts.visitEachChild(node, visit, transformContext);
        }
        return tsSourceFile => {
            return visit(tsSourceFile);
        };
    };
}
exports.default = ComponentTransformer;
