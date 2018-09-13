"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Checks if class is decorated with @Component decorator
 * and injects the `@Prop() BEARER_ID: string;` into class definition
 *
 */
const ts = require("typescript");
const constants_1 = require("../constants");
const decorator_helpers_1 = require("../helpers/decorator-helpers");
const bearer_1 = require("./bearer");
function ComponentTransformer({} = {}) {
    return transformContext => {
        const scenarioId = process.env.BEARER_SCENARIO_ID;
        function visit(node) {
            // TODO: filter components which really need it
            if (ts.isClassDeclaration(node) && decorator_helpers_1.hasDecoratorNamed(node, constants_1.Decorators.Component)) {
                return ts.visitEachChild(bearer_1.default.addBearerScenarioIdAccessor(node, scenarioId), visit, transformContext);
            }
            return ts.visitEachChild(node, visit, transformContext);
        }
        if (!scenarioId) {
            console.warn('[BEARER]', 'No scenario ID provided. Skipping scenario ID injection');
        }
        return tsSourceFile => {
            if (!scenarioId) {
                return tsSourceFile;
            }
            return visit(tsSourceFile);
        };
    };
}
exports.default = ComponentTransformer;
