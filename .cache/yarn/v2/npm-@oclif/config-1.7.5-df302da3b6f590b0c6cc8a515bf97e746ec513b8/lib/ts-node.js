"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const debug_1 = require("./debug");
const util_1 = require("./util");
const tsconfigs = {};
const rootDirs = [];
const typeRoots = [`${__dirname}/../node_modules/@types`];
const debug = debug_1.default();
function registerTSNode(root) {
    if (tsconfigs[root])
        return;
    const tsconfig = loadTSConfig(root);
    if (!tsconfig)
        return;
    debug('registering ts-node at', root);
    const tsNodePath = require.resolve('ts-node', { paths: [root, __dirname] });
    const tsNode = require(tsNodePath);
    tsconfigs[root] = tsconfig;
    typeRoots.push(`${root}/node_modules/@types`);
    if (tsconfig.compilerOptions.rootDirs) {
        rootDirs.push(...tsconfig.compilerOptions.rootDirs.map(r => path.join(root, r)));
    }
    else {
        rootDirs.push(`${root}/src`);
    }
    const cwd = process.cwd();
    try {
        process.chdir(root);
        tsNode.register({
            skipProject: true,
            transpileOnly: true,
            // cache: false,
            // typeCheck: true,
            compilerOptions: {
                target: tsconfig.compilerOptions.target || 'es2017',
                module: 'commonjs',
                sourceMap: true,
                rootDirs,
                typeRoots,
            }
        });
    }
    finally {
        process.chdir(cwd);
    }
}
function loadTSConfig(root) {
    try {
        // // ignore if no .git as it's likely not in dev mode
        // if (!await fs.pathExists(path.join(this.root, '.git'))) return
        const tsconfigPath = path.join(root, 'tsconfig.json');
        const tsconfig = util_1.loadJSONSync(tsconfigPath);
        if (!tsconfig || !tsconfig.compilerOptions)
            return;
        return tsconfig;
    }
    catch (err) {
        if (err.code !== 'ENOENT')
            throw err;
    }
}
function tsPath(root, orig) {
    if (!orig)
        return orig;
    orig = path.join(root, orig);
    try {
        registerTSNode(root);
        const tsconfig = tsconfigs[root];
        if (!tsconfig)
            return orig;
        const { rootDir, rootDirs, outDir } = tsconfig.compilerOptions;
        const rootDirPath = rootDir || (rootDirs || [])[0];
        if (!rootDirPath || !outDir)
            return orig;
        // rewrite path from ./lib/foo to ./src/foo
        const lib = path.join(root, outDir); // ./lib
        const src = path.join(root, rootDirPath); // ./src
        const relative = path.relative(lib, orig); // ./commands
        const out = path.join(src, relative); // ./src/commands
        // this can be a directory of commands or point to a hook file
        // if it's a directory, we check if the path exists. If so, return the path to the directory.
        // For hooks, it might point to a module, not a file. Something like "./hooks/myhook"
        // That file doesn't exist, and the real file is "./hooks/myhook.ts"
        // In that case we attempt to resolve to the filename. If it fails it will revert back to the lib path
        if (fs.existsSync(out) || fs.existsSync(out + '.ts'))
            return out;
        else
            return orig;
    }
    catch (err) {
        debug(err);
        return orig;
    }
}
exports.tsPath = tsPath;
