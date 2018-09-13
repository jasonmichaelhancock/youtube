"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attachConfig_1 = require("./attachConfig");
test('attaching the config', () => {
    const archive = {
        append: jest.fn()
    };
    const content = '{"integration_uuid":"uuid","intents":["get","put"]}';
    const fileName = { name: 'bearer.config.json' };
    attachConfig_1.default(archive, content, fileName);
    expect(archive.append).toHaveBeenCalledWith(content, fileName);
});
