"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const deps_1 = tslib_1.__importDefault(require("./deps"));
const m = deps_1.default()
    .add('chalk', () => require('chalk'))
    .add('util', () => require('./util'));
function flagUsage(flag, options = {}) {
    const label = [];
    if (flag.char)
        label.push(`-${flag.char}`);
    if (flag.name)
        label.push(` --${flag.name}`);
    const usage = flag.type === 'option' ? ` ${flag.name.toUpperCase()}` : '';
    let description = flag.description || '';
    if (options.displayRequired && flag.required)
        description = `(required) ${description}`;
    description = description ? m.chalk.dim(description) : undefined;
    return [` ${label.join(',').trim()}${usage}`, description];
}
exports.flagUsage = flagUsage;
function flagUsages(flags, options = {}) {
    if (!flags.length)
        return [];
    const { sortBy } = m.util;
    return sortBy(flags, f => [f.char ? -1 : 1, f.char, f.name])
        .map(f => flagUsage(f, options));
}
exports.flagUsages = flagUsages;
