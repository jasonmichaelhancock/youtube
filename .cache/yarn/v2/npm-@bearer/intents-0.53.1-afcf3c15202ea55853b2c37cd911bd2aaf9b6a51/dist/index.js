"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DBClient_1 = require("./DBClient");
const lambda_1 = require("./lambda");
exports.DBClient = DBClient_1.DBClient.instance;
// tslint:disable-next-line:no-unnecessary-class
class Intent {
    static fetchData(callback, { data, error }) {
        if (data) {
            lambda_1.sendSuccessMessage(callback, { data });
        }
        else {
            lambda_1.sendErrorMessage(callback, { error: error || 'Unkown error' });
        }
    }
}
exports.Intent = Intent;
// tslint:disable-next-line:no-unnecessary-class
class BaseIntent {
    static get display() {
        throw new Error('Extending class needs to implement `static intent(action)` method');
    }
    static intent(_action) {
        throw new Error('Extending class needs to implement `static intent(action)` method');
    }
}
class GenericIntentBase extends BaseIntent {
    static get isStateIntent() {
        return false;
    }
    static get isGlobalIntent() {
        return true;
    }
}
class StateIntentBase extends BaseIntent {
    static get isStateIntent() {
        return true;
    }
    static get isGlobalIntent() {
        return false;
    }
}
class SaveState extends StateIntentBase {
    static get display() {
        return 'SaveState';
    }
    static intent(action) {
        return (event, _context, lambdaCallback) => {
            const { referenceId } = event.queryStringParameters;
            const dbClient = exports.DBClient();
            try {
                dbClient
                    .getData(referenceId)
                    .then(savedState => {
                    const state = savedState ? savedState.Item : {};
                    try {
                        action(event.context, event.queryStringParameters, bodyFromEvent(event), state, (result) => {
                            if (savedState) {
                                dbClient
                                    .updateData(referenceId, result.state)
                                    .then(() => {
                                    lambdaCallback(null, { meta: { referenceId }, data: result.data });
                                })
                                    .catch(error => lambdaCallback(error.toString(), { error: error.toString() }));
                            }
                            else {
                                dbClient
                                    .saveData(result.state)
                                    .then(data => {
                                    lambdaCallback(null, { meta: { referenceId: data.Item.referenceId }, data: result.data });
                                })
                                    .catch(error => lambdaCallback(error.toString(), { error: error.toString() }));
                            }
                        });
                    }
                    catch (error) {
                        lambdaCallback(error.toString(), { error: error.toString() });
                    }
                })
                    .catch(error => lambdaCallback(error.toString(), { error: error.toString() }));
            }
            catch (error) {
                lambdaCallback(error.toString(), { error: error.toString() });
            }
        };
    }
}
exports.SaveState = SaveState;
class RetrieveState extends StateIntentBase {
    static get display() {
        return 'RetrieveState';
    }
    static intent(action) {
        return (event, _context, lambdaCallback) => {
            const { referenceId } = event.queryStringParameters;
            try {
                exports.DBClient()
                    .getData(referenceId)
                    .then(state => {
                    if (state) {
                        action(event.context, event.queryStringParameters, state.Item, (recoveredState) => {
                            lambdaCallback(null, { meta: { referenceId: state.Item.referenceId }, data: recoveredState.data });
                        });
                    }
                    else {
                        lambdaCallback(null, { statusCode: 404, body: JSON.stringify({ error: 'No data found', referenceId }) });
                    }
                });
            }
            catch (error) {
                lambdaCallback(error.toString(), { error: error.toString() });
            }
        };
    }
}
exports.RetrieveState = RetrieveState;
class FetchData extends GenericIntentBase {
    static get display() {
        return 'FetchData';
    }
    static intent(action) {
        return (event, _context, lambdaCallback) => {
            action(event.context, event.queryStringParameters, bodyFromEvent(event), result => {
                Intent.fetchData(lambdaCallback, result);
            });
        };
    }
}
exports.FetchData = FetchData;
function bodyFromEvent(event) {
    const { body } = event;
    if (!body) {
        return {};
    }
    if (typeof body === 'string') {
        return JSON.parse(body);
    }
    return body;
}
