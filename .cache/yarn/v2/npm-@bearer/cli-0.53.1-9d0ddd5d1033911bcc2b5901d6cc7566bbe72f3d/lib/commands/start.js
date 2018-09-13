"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const BaseLegacyCommand_1 = require("../BaseLegacyCommand");
const noOpen = 'no-open';
const noInstall = 'no-install';
const noWatcher = 'no-watcher';
class Start extends BaseLegacyCommand_1.default {
    async run() {
        const { flags } = this.parse(Start);
        const cmdArgs = [];
        if (flags[noOpen]) {
            cmdArgs.push(`--${noOpen}`);
        }
        if (flags[noInstall]) {
            cmdArgs.push(`--${noInstall}`);
        }
        if (flags[noWatcher]) {
            cmdArgs.push(`--${noWatcher}`);
        }
        this.runLegacy(['start', ...cmdArgs]);
    }
}
Start.description = 'Start local development environment';
Start.flags = {
    help: command_1.flags.help({ char: 'h' }),
    [noOpen]: command_1.flags.boolean({}),
    [noInstall]: command_1.flags.boolean({}),
    [noWatcher]: command_1.flags.boolean({ hidden: true })
};
Start.args = [];
exports.default = Start;
