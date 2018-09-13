"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (archive, content, configFilename) => {
    archive.append(content, configFilename);
};
