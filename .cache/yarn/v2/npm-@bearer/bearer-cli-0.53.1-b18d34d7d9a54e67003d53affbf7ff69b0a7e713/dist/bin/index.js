#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require('commander');
// Done at OCLIF level
// require('../scripts/check-version')
const { version } = require('../../package.json');
const { CLI } = require('../src/lib/cli');
const Emitter = require('../src/lib/emitter');
const setupConfig_1 = require("../src/lib/setupConfig");
const emitter = new Emitter();
const config = setupConfig_1.default();
const deployCmd = require('../src/lib/commands/deployCommand');
const generateCmd = require('../src/lib/commands/generateCommand');
const initCmd = require('../src/lib/commands/initCommand');
const loginCmd = require('../src/lib/commands/loginCommand');
const startCmd = require('../src/lib/commands/startCommand');
const linkCmd = require('../src/lib/commands/linkCommand');
const invokeCmd = require('../src/lib/commands/invokeCommand');
const cliOutput = require('../src/lib/cliOutput.js');
const cli = new CLI(program, emitter, config);
cliOutput(emitter, config);
program.version(version, '-v, --version');
cli.use(initCmd);
cli.use(generateCmd);
cli.use(deployCmd);
cli.use(loginCmd);
cli.use(startCmd);
cli.use(linkCmd);
cli.use(invokeCmd);
exports.default = args => {
    cli.parse(args);
};
