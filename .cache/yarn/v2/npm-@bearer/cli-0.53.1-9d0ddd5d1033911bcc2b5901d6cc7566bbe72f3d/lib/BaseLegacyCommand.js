"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("@bearer/bearer-cli/dist/bin/index");
const command_1 = require("@oclif/command");
class default_1 extends command_1.default {
    runLegacy(cmdArgs) {
        this.debug('Legacy command arguments', JSON.stringify(cmdArgs));
        index_1.default(['null', 'null'].concat(cmdArgs));
    }
}
exports.default = default_1;
