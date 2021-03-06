"use strict";
// tslint:disable interface-over-type-literal
Object.defineProperty(exports, "__esModule", { value: true });
function build(defaults) {
    return (options = {}) => {
        return Object.assign({ parse: (i, _) => i }, defaults, options, { input: [], multiple: !!options.multiple, type: 'option' });
    };
}
exports.build = build;
function boolean(options = {}) {
    return Object.assign({ parse: (b, _) => b }, options, { allowNo: !!options.allowNo, type: 'boolean' });
}
exports.boolean = boolean;
exports.integer = build({
    parse: input => {
        if (!/^[0-9]+$/.test(input))
            throw new Error(`Expected an integer but received: ${input}`);
        return parseInt(input, 10);
    },
});
function option(options) {
    return build(options)();
}
exports.option = option;
const stringFlag = build({});
exports.string = stringFlag;
exports.defaultFlags = {
    color: boolean({ allowNo: true }),
};
