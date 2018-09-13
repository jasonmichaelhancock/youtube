"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function sendSuccessMessage(callback, json) {
    callback(null, json);
}
exports.sendSuccessMessage = sendSuccessMessage;
function sendErrorMessage(callback, json) {
    callback(null, json);
}
exports.sendErrorMessage = sendErrorMessage;
