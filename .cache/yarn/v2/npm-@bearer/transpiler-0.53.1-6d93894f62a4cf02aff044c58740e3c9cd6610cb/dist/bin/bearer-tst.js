#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandLineArgs = require("command-line-args");
const src_1 = require("../src");
exports.default = args => {
    const optionsDefinitions = [
        { name: 'no-watcher', type: Boolean, defaultOption: false },
        { name: 'prefix-tag', type: String }
    ];
    const options = commandLineArgs(optionsDefinitions, { camelCase: true, argv: args, partial: true });
    const transpiler = new src_1.default({
        watchFiles: !options.noWatcher,
        tagNamePrefix: options.prefixTag
    });
    process.on('message', message => {
        if (message === 'refresh') {
            transpiler.refresh();
        }
    });
    transpiler.on('STOP', () => {
        process.exit(0);
    });
    transpiler.run();
};
