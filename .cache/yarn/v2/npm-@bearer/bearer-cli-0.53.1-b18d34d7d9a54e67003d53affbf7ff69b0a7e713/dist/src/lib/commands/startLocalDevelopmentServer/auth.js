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
const fs = require("fs");
const router = new Router({ prefix: '/' });
router.get('v1/user/initialize', ctx => {
    // if (!ctx.request.signedCookies || !ctx.request.signedCookies.uuid) {
    //   ctx.cookie = {
    //     uuid: uuidv1(),
    //     maxAge: 2592000000,
    //     signed: true
    //   } //expires in one month
    // }
    ctx.body = '<html><head></head><body><script>';
    ctx.body += fs.readFileSync(__dirname + '/iframe.js');
    ctx.body += '</script></body></html>';
});
router.get('v1/auth/:integration_uuid', (ctx) => __awaiter(this, void 0, void 0, function* () {
    ctx.body = `<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/post-robot@8.0.28/dist/post-robot.min.js"></script>
    <script type="application/javascript">
      localStorage.setItem('${ctx.request.query['setupId']}|${ctx.params.integration_uuid}', true)
      postRobot.send(window.opener, 'BEARER_AUTHORIZED', {
        scenarioId: '${ctx.params.integration_uuid}'
      })
      setTimeout(function() {
        window.close()
      }, 500)
    </script>
  </head>
  <body></body>
</html>`;
}));
exports.default = router;
