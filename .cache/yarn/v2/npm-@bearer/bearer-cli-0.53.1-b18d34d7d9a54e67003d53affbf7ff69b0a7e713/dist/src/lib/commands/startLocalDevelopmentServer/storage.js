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
const Router = require('koa-router');
const knex = require("knex");
const uuidv1 = require("uuid/v1");
exports.default = () => {
    const router = new Router({ prefix: '/api/v1/' });
    const filename = process.env.BEARER_LOCAL_DATABASE || ':memory:';
    const debug = process.env.BEARER_DEBUG === '*';
    const db = knex({
        dialect: 'sqlite3',
        connection: {
            filename
        },
        useNullAsDefault: true,
        debug
    });
    db.schema
        .hasTable('records')
        .then((exists) => __awaiter(this, void 0, void 0, function* () {
        if (!exists) {
            yield db.schema.createTable('records', table => {
                table.index(['referenceId'], 'ref_id_idx');
                table.string('referenceId');
                table.text('data');
            });
        }
    }))
        .catch(() => db.schema.createTable('records', table => {
        table.index(['referenceId'], 'ref_id_idx');
        table.string('referenceId');
        table.text('data');
    }));
    router.get('items/:referenceId', (ctx) => __awaiter(this, void 0, void 0, function* () {
        const referenceId = ctx.params.referenceId;
        try {
            const rows = yield db
                .table('records')
                .select('data')
                .where({ referenceId })
                .limit(1);
            const { data } = rows[0];
            console.log(data);
            ctx.ok({ Item: Object.assign({}, JSON.parse(data), { referenceId }) });
        }
        catch (e) {
            ctx.notFound(e);
        }
    }));
    router.delete('items/:referenceId', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
        const referenceId = ctx.params.referenceId;
        return yield db
            .table('records')
            .where({ referenceId })
            .delete();
    }));
    router.put('items/:referenceId', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
        const referenceId = ctx.params.referenceId;
        console.log(ctx.request);
        console.log('BODY is: ', ctx.request.body);
        yield db
            .table('records')
            .where({ referenceId })
            .delete()
            .then(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield db.table('records').insert({ data: JSON.stringify(ctx.request.body), referenceId });
                ctx.ok({ Item: Object.assign({}, ctx.request.body, { referenceId }) });
            }
            catch (e) {
                ctx.badRequest(e);
            }
        }));
    }));
    router.post('items', (ctx, next) => __awaiter(this, void 0, void 0, function* () {
        const referenceId = uuidv1();
        console.log(ctx.request.body);
        try {
            yield db.table('records').insert({ data: JSON.stringify(ctx.request.body), referenceId });
            ctx.ok({ Item: Object.assign({}, ctx.request.body, { referenceId }) });
        }
        catch (e) {
            ctx.badRequest(e);
        }
    }));
    return router;
};
