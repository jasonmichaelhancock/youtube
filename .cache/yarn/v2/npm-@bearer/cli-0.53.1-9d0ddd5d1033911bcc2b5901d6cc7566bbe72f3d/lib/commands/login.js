"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const BaseLegacyCommand_1 = require("../BaseLegacyCommand");
class Login extends BaseLegacyCommand_1.default {
    async run() {
        const { flags } = this.parse(Login);
        const cmdArgs = [];
        if (flags.email) {
            cmdArgs.push(`--email=${flags.email}`);
        }
        this.runLegacy(['login', ...cmdArgs]);
    }
}
Login.description = 'Login to Bearer platform';
Login.flags = {
    help: command_1.flags.help({ char: 'h' }),
    email: command_1.flags.string({ char: 'e', required: true })
};
Login.args = [];
exports.default = Login;
