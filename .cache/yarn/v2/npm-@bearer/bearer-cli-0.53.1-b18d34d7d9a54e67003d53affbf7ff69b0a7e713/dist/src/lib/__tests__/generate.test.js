"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const intents = require("@bearer/intents");
const generateCommand_1 = require("../commands/generateCommand");
const TestingValues = ['spongebob', 'SpongeBob', 'spongeBob', 'sponge_bob', 'sponge-bob'];
const AuthTypes = ['oauth2', 'apiKey', 'noAuth', 'basicAuth'];
describe('Generate command', () => {
    describe('get components variables', () => {
        TestingValues.forEach(value => {
            AuthTypes.forEach(authType => {
                describe(authType, () => {
                    describe(value, () => {
                        it('formats variables correctly', () => {
                            expect(generateCommand_1.getComponentVars(value, { authType })).toMatchSnapshot();
                        });
                    });
                });
            });
        });
    });
    describe('get intents variables', () => {
        Object.keys(intents)
            .filter(i => i !== 'DBClient')
            .forEach(intentType => {
            AuthTypes.forEach(authType => {
                describe(authType, () => {
                    describe(intentType, () => {
                        TestingValues.forEach(value => {
                            describe(value, () => {
                                it('formats variables correctly', () => {
                                    expect(generateCommand_1.getIntentVars(value, intentType, { authType })).toMatchSnapshot();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
