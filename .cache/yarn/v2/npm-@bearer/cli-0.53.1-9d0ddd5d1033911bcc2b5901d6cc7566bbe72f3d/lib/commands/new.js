"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const BaseLegacyCommand_1 = require("../BaseLegacyCommand");
class New extends BaseLegacyCommand_1.default {
    async run() {
        const { args } = this.parse(New);
        this.runLegacy(['new', args.ScenarioName]);
    }
}
New.description = 'Generate a new scenario';
New.flags = {
    help: command_1.flags.help({ char: 'h' })
};
New.args = [{ name: 'ScenarioName', required: true }];
exports.default = New;
