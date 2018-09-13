"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chokidar = require("chokidar");
const cosmiconfig = require("cosmiconfig");
const getPort = require("get-port");
const Logger = require("koa-logger");
const Router = require("koa-router");
const buildArtifact_1 = require("../../buildArtifact");
const auth_1 = require("./auth");
const server = require("./server");
const storage_1 = require("./storage");
function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}
function startLocalDevelopmentServer(emitter, config, locator, logs = true) {
    const rootLevel = locator.scenarioRoot;
    const LOCAL_DEV_CONFIGURATION = 'dev';
    const explorer = cosmiconfig(LOCAL_DEV_CONFIGURATION, {
        searchPlaces: [`config.${LOCAL_DEV_CONFIGURATION}.js`]
    });
    const router = new Router({ prefix: '/api/v1/' });
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { config: devIntentsContext = {} } = (yield explorer.search(rootLevel)) || {};
            const distPath = locator.buildIntentsResourcePath('dist');
            // tslint:disable-next-line:no-inner-declarations
            function refreshIntents() {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        emitter.emit('start:localServer:generatingIntents:start');
                        yield buildArtifact_1.transpileIntents(locator.srcIntentsDir, distPath);
                        emitter.emit('start:localServer:generatingIntents:stop');
                    }
                    catch (error) {
                        emitter.emit('start:localServer:generatingIntents:failed', { error });
                    }
                });
            }
            yield refreshIntents();
            chokidar
                .watch('.', {
                ignored: /(^|[\/\\])\../,
                cwd: locator.srcIntentsDir,
                ignoreInitial: true,
                persistent: true,
                followSymlinks: false
            })
                .on('add', refreshIntents)
                .on('change', refreshIntents);
            const port = yield getPort({ port: 3000 });
            // tslint:disable-next-line:no-http-string
            const bearerBaseURL = `http://localhost:${port}/`;
            process.env.bearerBaseURL = bearerBaseURL;
            router.all(`${config.scenarioUuid}/:intentName`, (ctx, next) => new Promise((resolve, reject) => {
                try {
                    const intent = requireUncached(`${distPath}/${ctx.params.intentName}`).default;
                    intent.intentType.intent(intent.action)({
                        context: Object.assign({}, devIntentsContext.global, devIntentsContext[ctx.params.intentName], { bearerBaseURL }),
                        queryStringParameters: ctx.query,
                        body: JSON.stringify(ctx.request.body)
                    }, {}, (_err, datum) => {
                        ctx.intentDatum = datum;
                        next();
                        resolve();
                    });
                }
                catch (e) {
                    reject({ error: e.toString() });
                }
            }), ctx => ctx.ok(ctx.intentDatum));
            const storage = storage_1.default();
            if (logs) {
                server.use(Logger());
            }
            server.use(storage.routes());
            server.use(storage.allowedMethods());
            server.use(auth_1.default.routes());
            server.use(auth_1.default.allowedMethods());
            server.use(router.routes());
            server.use(router.allowedMethods());
            server.listen(port, () => {
                emitter.emit('start:localServer:start', { port });
                emitter.emit('start:localServer:endpoints', {
                    endpoints: [...storage.stack, ...auth_1.default.stack, ...router.stack]
                });
            });
            resolve(bearerBaseURL);
        }
        catch (e) {
            reject(e);
        }
    }));
}
exports.default = startLocalDevelopmentServer;
