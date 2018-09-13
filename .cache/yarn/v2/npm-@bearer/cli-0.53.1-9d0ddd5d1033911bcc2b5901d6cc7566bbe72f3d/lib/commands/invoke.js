"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const BaseLegacyCommand_1 = require("../BaseLegacyCommand");
class Invoke extends BaseLegacyCommand_1.default {
    async run() {
        const { args, flags } = this.parse(Invoke);
        const cmdArgs = [args.Intent_Name];
        if (flags.path) {
            cmdArgs.push(`--path=${flags.path}`);
        }
        this.runLegacy(['invoke', ...cmdArgs]);
    }
}
Invoke.description = 'Invoke Intent locally';
Invoke.flags = {
    help: command_1.flags.help({ char: 'h' }),
    path: command_1.flags.string({ char: 'p' })
};
Invoke.args = [{ name: 'Intent_Name', required: true }];
exports.default = Invoke;
