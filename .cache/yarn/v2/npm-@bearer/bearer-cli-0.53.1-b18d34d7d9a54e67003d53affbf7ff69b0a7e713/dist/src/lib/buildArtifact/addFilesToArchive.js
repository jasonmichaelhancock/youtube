"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const globby = require("globby");
const fs = require("graceful-fs");
exports.default = (archive, packagePath) => {
    const fullPath = path.resolve(packagePath);
    return globby([`${fullPath}/*.js`])
        .then(files => {
        files.forEach(file => {
            archive.append(fs.createReadStream(file), {
                name: file.replace(path.resolve(packagePath), '')
            });
        });
    })
        .catch(console.error);
};
