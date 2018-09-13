"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
const BaseLegacyCommand_1 = require("../BaseLegacyCommand");
const blankComponent = 'blank-component';
const collectionComponent = 'collection-component';
const rootGroup = 'root-group';
const setup = 'setup';
class Generate extends BaseLegacyCommand_1.default {
    async run() {
        const { args, flags } = this.parse(Generate);
        const cmdArgs = [];
        if (flags[blankComponent]) {
            cmdArgs.push(`--${blankComponent}`);
        }
        else if (flags[collectionComponent]) {
            cmdArgs.push(`--${collectionComponent}`);
        }
        else if (flags[rootGroup]) {
            cmdArgs.push(`--${rootGroup}`);
        }
        else if (flags[setup]) {
            cmdArgs.push(`--${setup}`);
        }
        this.debug('generate args', args);
        this.debug('generate flags', flags);
        if (args.name && !flags[setup]) {
            cmdArgs.push(args.name);
        }
        this.runLegacy(['generate', ...cmdArgs]);
    }
}
Generate.description = 'Generate scenario intents or components';
Generate.flags = {
    help: command_1.flags.help({ char: 'h' }),
    [setup]: command_1.flags.boolean({ exclusive: [collectionComponent, blankComponent, rootGroup] }),
    [blankComponent]: command_1.flags.boolean({ exclusive: [setup, collectionComponent, rootGroup] }),
    [collectionComponent]: command_1.flags.boolean({ exclusive: [setup, blankComponent, rootGroup] }),
    [rootGroup]: command_1.flags.boolean({ exclusive: [setup, collectionComponent, blankComponent] })
};
Generate.args = [{ name: 'name', required: false }];
exports.default = Generate;
