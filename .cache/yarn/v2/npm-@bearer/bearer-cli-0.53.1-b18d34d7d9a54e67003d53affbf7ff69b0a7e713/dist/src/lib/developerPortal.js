var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const serviceClient = require('./serviceClient');
module.exports = (emitter, event, { DeploymentUrl, orgId, scenarioId, bearerConfig: { authorization: { AuthenticationResult: { IdToken: token } } } }) => new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
    const client = serviceClient(DeploymentUrl);
    try {
        const res = yield client.deployScenario(token, event, orgId, scenarioId);
        if (res.statusCode === 204 || res.statusCode === 202 || res.statusCode === 200) {
            emitter.emit('developerPortalUpdate:success');
        }
        else {
            emitter.emit('developerPortalUpdate:failed', res.body.errors);
        }
        resolve('done');
    }
    catch (e) {
        emitter.emit('developerPortalUpdate:error', e);
        reject(e);
    }
}));
