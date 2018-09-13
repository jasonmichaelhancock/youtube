var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const serviceClient = require('./serviceClient');
const fs = require('fs');
module.exports = (packagePath, emitter, { scenarioUuid, 
// DeveloperPortalAPIUrl,
// credentials,
bearerConfig: { authorization: { AuthenticationResult: { IdToken: token } } }, DeploymentUrl }) => new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
    emitter.emit('pushScenario:start', scenarioUuid);
    try {
        const deploymentServiceClient = serviceClient(DeploymentUrl);
        // const devPortalClient = serviceClient(DeveloperPortalAPIUrl)
        // const {
        //   body: {
        //     data: {
        //       findUser: { token: devPortalToken }
        //     }
        //   }
        // } = await devPortalClient.getDevPortalToken(credentials)
        const res = yield deploymentServiceClient.signedUrl(token, scenarioUuid, 'intent');
        if (res.statusCode === 201) {
            const url = res.body;
            const s3Client = serviceClient(url);
            const artifact = fs.readFileSync(packagePath);
            const response = yield s3Client.upload(artifact);
            resolve(response);
        }
        else if (res.statusCode === 401) {
            emitter.emit('pushScenario:unauthorized', res.body);
            reject(new Error('unauthorized'));
        }
        else {
            emitter.emit('pushScenario:httpError', res);
            reject(new Error('httpError'));
        }
    }
    catch (e) {
        emitter.emit('pushScenario:error', e);
        reject(e);
    }
}));
