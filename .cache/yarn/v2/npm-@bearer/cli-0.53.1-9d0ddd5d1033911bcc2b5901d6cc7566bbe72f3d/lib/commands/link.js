"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const BaseLegacyCommand_1 = require("../BaseLegacyCommand");
class Link extends BaseLegacyCommand_1.default {
    async run() {
        const { args } = this.parse(Link);
        this.runLegacy(['link', args.Scenario_Identifier]);
    }
}
Link.description = 'Link your local scenario to a remote one';
Link.flags = {
    help: command_1.flags.help({ char: 'h' })
};
Link.args = [{ name: 'Scenario_Identifier', required: true }];
exports.default = Link;
