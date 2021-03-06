import { dirname, isAbsolute, resolve, join } from 'path';
import { render } from 'node-sass';

function loadDiagnostic(context, sassError, filePath) {
    if (!sassError || !context) {
        return;
    }
    const diagnostic = {
        level: 'error',
        type: 'sass',
        language: 'scss',
        header: 'sass error',
        code: sassError.status && sassError.status.toString(),
        relFilePath: null,
        absFilePath: null,
        messageText: sassError.message,
        lines: []
    };
    if (filePath) {
        diagnostic.absFilePath = filePath;
        diagnostic.relFilePath = formatFileName(context.config.rootDir, diagnostic.absFilePath);
        diagnostic.header = formatHeader('sass', diagnostic.absFilePath, context.config.rootDir, sassError.line);
        if (sassError.line > -1) {
            try {
                const sourceText = context.fs.readFileSync(diagnostic.absFilePath);
                const srcLines = sourceText.split(/(\r?\n)/);
                const errorLine = {
                    lineIndex: sassError.line - 1,
                    lineNumber: sassError.line,
                    text: srcLines[sassError.line - 1],
                    errorCharStart: sassError.column,
                    errorLength: 0
                };
                for (let i = errorLine.errorCharStart; i >= 0; i--) {
                    if (STOP_CHARS.indexOf(errorLine.text.charAt(i)) > -1) {
                        break;
                    }
                    errorLine.errorCharStart = i;
                }
                for (let j = errorLine.errorCharStart; j <= errorLine.text.length; j++) {
                    if (STOP_CHARS.indexOf(errorLine.text.charAt(j)) > -1) {
                        break;
                    }
                    errorLine.errorLength++;
                }
                if (errorLine.errorLength === 0 && errorLine.errorCharStart > 0) {
                    errorLine.errorLength = 1;
                    errorLine.errorCharStart--;
                }
                diagnostic.lines.push(errorLine);
                if (errorLine.lineIndex > 0) {
                    const previousLine = {
                        lineIndex: errorLine.lineIndex - 1,
                        lineNumber: errorLine.lineNumber - 1,
                        text: srcLines[errorLine.lineIndex - 1],
                        errorCharStart: -1,
                        errorLength: -1
                    };
                    diagnostic.lines.unshift(previousLine);
                }
                if (errorLine.lineIndex + 1 < srcLines.length) {
                    const nextLine = {
                        lineIndex: errorLine.lineIndex + 1,
                        lineNumber: errorLine.lineNumber + 1,
                        text: srcLines[errorLine.lineIndex + 1],
                        errorCharStart: -1,
                        errorLength: -1
                    };
                    diagnostic.lines.push(nextLine);
                }
            }
            catch (e) {
                console.error(`StyleSassPlugin loadDiagnostic, ${e}`);
            }
        }
    }
    context.diagnostics.push(diagnostic);
}
function formatFileName(rootDir, fileName) {
    if (!rootDir || !fileName)
        return '';
    fileName = fileName.replace(rootDir, '');
    if (/\/|\\/.test(fileName.charAt(0))) {
        fileName = fileName.substr(1);
    }
    if (fileName.length > 80) {
        fileName = '...' + fileName.substr(fileName.length - 80);
    }
    return fileName;
}
function formatHeader(type, fileName, rootDir, startLineNumber = null, endLineNumber = null) {
    let header = `${type}: ${formatFileName(rootDir, fileName)}`;
    if (startLineNumber !== null && startLineNumber > 0) {
        if (endLineNumber !== null && endLineNumber > startLineNumber) {
            header += `, lines: ${startLineNumber} - ${endLineNumber}`;
        }
        else {
            header += `, line: ${startLineNumber}`;
        }
    }
    return header;
}
const STOP_CHARS = ['', '\n', '\r', '\t', ' ', ':', ';', ',', '{', '}', '.', '#', '@', '!', '[', ']', '(', ')', '&', '+', '~', '^', '*', '$'];

function usePlugin(fileName) {
    return /(\.scss|\.sass)$/i.test(fileName);
}
function getRenderOptions(opts, sourceText, fileName, context) {
    // create a copy of the original sass config so we don't change it
    const renderOpts = Object.assign({}, opts);
    // always set "data" from the source text
    renderOpts.data = sourceText;
    renderOpts.includePaths = Array.isArray(opts.includePaths) ? opts.includePaths.slice() : [];
    // add the directory of the source file to includePaths
    renderOpts.includePaths.push(dirname(fileName));
    renderOpts.includePaths = renderOpts.includePaths.map(includePath => {
        if (isAbsolute(includePath)) {
            return includePath;
        }
        // if it's a relative path then resolve it with the project's root directory
        return resolve(context.config.rootDir, includePath);
    });
    const injectGlobalPaths = Array.isArray(opts.injectGlobalPaths) ? opts.injectGlobalPaths.slice() : [];
    if (injectGlobalPaths.length > 0) {
        // automatically inject each of these paths into the source text
        const injectText = injectGlobalPaths.map(injectGlobalPath => {
            if (!isAbsolute(injectGlobalPath)) {
                // convert any relative paths to absolute paths relative to the project root
                injectGlobalPath = normalizePath(join(context.config.rootDir, injectGlobalPath));
            }
            return `@import "${injectGlobalPath}";`;
        }).join('');
        renderOpts.data = injectText + renderOpts.data;
    }
    // remove non-standard node-sass option
    delete renderOpts.injectGlobalPaths;
    // the "file" config option is not valid here
    delete renderOpts.file;
    return renderOpts;
}
function createResultsId(fileName) {
    // create what the new path is post transform (.css)
    const pathParts = fileName.split('.');
    pathParts[pathParts.length - 1] = 'css';
    return pathParts.join('.');
}
function normalizePath(str) {
    // Convert Windows backslash paths to slash paths: foo\\bar ➔ foo/bar
    // https://github.com/sindresorhus/slash MIT
    // By Sindre Sorhus
    if (typeof str !== 'string') {
        throw new Error(`invalid path to normalize`);
    }
    str = str.trim();
    if (EXTENDED_PATH_REGEX.test(str) || NON_ASCII_REGEX.test(str)) {
        return str;
    }
    str = str.replace(SLASH_REGEX, '/');
    // always remove the trailing /
    // this makes our file cache look ups consistent
    if (str.charAt(str.length - 1) === '/') {
        const colonIndex = str.indexOf(':');
        if (colonIndex > -1) {
            if (colonIndex < str.length - 2) {
                str = str.substring(0, str.length - 1);
            }
        }
        else if (str.length > 1) {
            str = str.substring(0, str.length - 1);
        }
    }
    return str;
}
const EXTENDED_PATH_REGEX = /^\\\\\?\\/;
const NON_ASCII_REGEX = /[^\x00-\x80]+/;
const SLASH_REGEX = /\\/g;

function sass(opts = {}) {
    return {
        transform: function (sourceText, fileName, context) {
            if (!context || !usePlugin(fileName)) {
                return null;
            }
            const renderOpts = getRenderOptions(opts, sourceText, fileName, context);
            const results = {
                id: createResultsId(fileName)
            };
            if (sourceText.trim() === '') {
                results.code = '';
                return Promise.resolve(results);
            }
            return new Promise(resolve$$1 => {
                render(renderOpts, (err, sassResult) => {
                    if (err) {
                        loadDiagnostic(context, err, fileName);
                        results.code = `/**  sass error${err && err.message ? ': ' + err.message : ''}  **/`;
                        resolve$$1(results);
                    }
                    else {
                        results.code = sassResult.css.toString();
                        // write this css content to memory only so it can be referenced
                        // later by other plugins (autoprefixer)
                        // but no need to actually write to disk
                        context.fs.writeFile(results.id, results.code, { inMemoryOnly: true }).then(() => {
                            resolve$$1(results);
                        });
                    }
                });
            });
        },
        name: 'sass',
    };
}

export default sass;
