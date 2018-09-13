"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const deployScenario = require("../deployScenario");
const fs = require("fs-extra");
test('deployIntents is defined', () => {
    expect(deployScenario.deployIntents).toBeDefined();
});
let emit = jest.fn((...args) => console.log(...args));
beforeEach(() => {
    fs.ensureDirSync('./tmp/views');
    fs.ensureDirSync('./tmp/intents');
});
afterEach(() => {
    fs.removeSync('./tmp');
});
describe('deployViews', () => {
    test.skip('Is not hanging in the end', () => __awaiter(this, void 0, void 0, function* () {
        expect.assertions(1);
        const locator = {};
        yield expect(deployScenario.deployViews({ emit }, {
            scenarioConfig: { scenarioTitle: 'test' },
            bearerConfig: { OrgId: '4l1c3' },
            rootPathRc: './tmp/.test'
        }, locator)).resolves.toEqual({});
    }), 1000);
});
