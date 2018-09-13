"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const BaseLegacyCommand_1 = require("../BaseLegacyCommand");
const viewsOnly = 'views-only';
const intentsOnly = 'intents-only';
class Deploy extends BaseLegacyCommand_1.default {
    async run() {
        const { flags } = this.parse(Deploy);
        const cmdArgs = [];
        if (flags[viewsOnly]) {
            cmdArgs.push(`--${viewsOnly}`);
        }
        else if (flags[intentsOnly]) {
            cmdArgs.push(`--${intentsOnly}`);
        }
        this.runLegacy(['deploy', ...cmdArgs]);
    }
}
Deploy.description = 'Deploy a scenario';
Deploy.flags = {
    help: command_1.flags.help({ char: 'h' }),
    [viewsOnly]: command_1.flags.boolean({ char: 's', exclusive: [intentsOnly], description: 'Deploy views only' }),
    [intentsOnly]: command_1.flags.boolean({ char: 'i', exclusive: [viewsOnly], description: 'Deploy intents only' })
};
Deploy.args = [];
exports.default = Deploy;
