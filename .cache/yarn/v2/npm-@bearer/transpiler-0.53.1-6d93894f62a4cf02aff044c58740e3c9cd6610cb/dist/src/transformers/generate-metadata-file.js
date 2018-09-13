"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function generateMetadataFile({ metadata, outDir } = { outDir }) {
    if (metadata) {
        fs.writeFileSync(path.join(outDir, 'metadata.json'), JSON.stringify(metadata), 'utf8');
    }
    return _transformContext => {
        return tsSourceFile => {
            return tsSourceFile;
        };
    };
}
exports.default = generateMetadataFile;
