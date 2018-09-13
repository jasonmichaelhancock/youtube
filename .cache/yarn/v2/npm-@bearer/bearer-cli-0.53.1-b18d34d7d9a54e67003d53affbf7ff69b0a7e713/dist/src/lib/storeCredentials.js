var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require('fs');
const serviceClient = require('./serviceClient');
const readConfig = configFile => new Promise((resolve, reject) => fs.readFile(configFile, (err, data) => {
    if (err)
        reject(err);
    else
        resolve(JSON.parse(data));
}));
module.exports = (configFile, { IntegrationServiceUrl }, emitter) => __awaiter(this, void 0, void 0, function* () {
    try {
        const { clientID, clientSecret } = yield readConfig(configFile);
        const client = serviceClient(IntegrationServiceUrl);
        if (clientID && clientSecret) {
            const { Item: { referenceId } } = yield client.putItem({
                clientID,
                clientSecret
            });
            emitter.emit('storeCredentials:success', referenceId);
        }
        else {
            emitter.emit('storeCredentials:missingCredentials', configFile);
        }
    }
    catch (e) {
        emitter.emit('storeCredentials:failure', e);
    }
});
