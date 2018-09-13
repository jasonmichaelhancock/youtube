"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ intents }) => {
    return intents
        .map(Object.keys)
        .map(intent => `
const ${intent} = require("./${intent}").default;
module.exports[${intent}.intentName] = ${intent}.intentType.intent(${intent}.action);
`)
        .join('\n');
};
