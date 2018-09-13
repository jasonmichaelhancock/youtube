var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const inquirer = require('inquirer');
const serviceClient = require('../serviceClient');
const login = (emitter, config) => ({ email }) => __awaiter(this, void 0, void 0, function* () {
    let { bearerConfig: { Username } } = config;
    if (!Username && !email) {
        emitter.emit('username:missing');
        process.exit(1);
    }
    if (email)
        Username = email;
    emitter.emit('login:userFound', Username);
    try {
        const client = serviceClient(config.IntegrationServiceUrl);
        const { AccessToken } = yield inquirer.prompt([
            {
                message: `Please enter your access token:`,
                type: 'password',
                name: 'AccessToken'
            }
        ]);
        const res = yield client.login({ Username, Password: AccessToken });
        let ExpiresAt;
        switch (res.statusCode) {
            case 200:
                ExpiresAt = res.body.authorization.AuthenticationResult.ExpiresIn + Date.now();
                config.storeBearerConfig(Object.assign({}, res.body.user, { ExpiresAt, authorization: res.body.authorization }));
                emitter.emit('login:success', res.body);
                break;
            case 401:
                emitter.emit('login:failure', res.body);
                break;
            default:
                emitter.emit('login:error', { code: res.statusCode, body: res.body });
        }
    }
    catch (e) {
        emitter.emit('login:error', e);
    }
});
module.exports = {
    useWith: (program, emitter, config) => {
        program
            .command('login')
            .description(`Login to Bearer.
    $ bearer login
`)
            .option('-e, --email <email>', 'User email.')
            .action(login(emitter, config));
    }
};
