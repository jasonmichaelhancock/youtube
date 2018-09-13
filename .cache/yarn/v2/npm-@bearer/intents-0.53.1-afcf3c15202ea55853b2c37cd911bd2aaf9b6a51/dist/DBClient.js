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
const axios_1 = require("axios");
class FetchDataError extends Error {
}
class UpdateDataError extends Error {
}
class CreateDataError extends Error {
}
class DBClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        console.log('[BEARER]', 'baseURL', baseURL);
        this.client = axios_1.default.create({
            baseURL,
            timeout: 3000,
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Bearer'
            }
        });
    }
    static instance() {
        return new DBClient(process.env.bearerBaseURL);
    }
    getData(referenceId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!referenceId) {
                return Promise.resolve(null);
            }
            try {
                const data = yield this.client.get(`api/v1/items/${referenceId}`);
                return data.data;
            }
            catch (error) {
                if (error.response && !(error.response.status === 404)) {
                    throw new FetchDataError('Error while retrieving data');
                }
            }
            return Promise.resolve(null);
        });
    }
    updateData(referenceId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.client.put(`api/v1/items/${referenceId}`, Object.assign({}, data, { ReadAllowed: true }));
                return response.data;
            }
            catch (error) {
                throw new UpdateDataError(`Error while updating data: ${error.toString()}`);
            }
        });
    }
    saveData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.client.post(`api/v1/items`, Object.assign({}, data, { ReadAllowed: true }));
                return response.data;
            }
            catch (error) {
                throw new CreateDataError(`Error while creating data: ${error.toString()}`);
            }
        });
    }
}
exports.DBClient = DBClient;
exports.default = (baseURL) => new DBClient(baseURL);
