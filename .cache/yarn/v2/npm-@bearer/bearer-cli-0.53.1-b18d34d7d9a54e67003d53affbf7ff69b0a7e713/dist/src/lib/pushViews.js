var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require('fs'); // from node.js
const path = require('path'); // from node.js
const globby = require('globby');
const mime = require('mime-types');
const serviceClient = require('./serviceClient');
const DIST_DIRECTORY = 'dist';
const WWW_DIRECTORY = 'www';
function uploadToS3(urls, paths, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = paths[key];
        const fileContent = fs.readFileSync(filePath);
        const s3Client = serviceClient(urls[key]);
        yield s3Client.upload(fileContent.toString(), {
            'Content-Type': mime.lookup(filePath)
        });
    });
}
const pushViews = (viewsDirectory, emitter, { DeploymentUrl, scenarioId, orgId, 
// DeveloperPortalAPIUrl,
// credentials,
bearerConfig: { authorization: { AuthenticationResult: { IdToken: token } } } }) => {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        const configuration = {
            distPath: path.join(viewsDirectory, DIST_DIRECTORY),
            wwwPath: path.join(viewsDirectory, WWW_DIRECTORY)
        };
        const integrationsClient = serviceClient(DeploymentUrl);
        // const devPortalClient = serviceClient(DeveloperPortalAPIUrl)
        // const {
        //   body: {
        //     data: {
        //       findUser: { token: devPortalToken }
        //     }
        //   }
        // } = await devPortalClient.getDevPortalToken(credentials)
        try {
            emitter.emit('view:upload:start');
            const files = yield globby([configuration.distPath, configuration.wwwPath]);
            const paths = files.reduce((acc, filePath) => {
                const relativePath = filePath.replace(viewsDirectory + path.sep, '');
                acc[`${orgId}/${scenarioId}/${relativePath}`] = filePath;
                return acc;
            }, {});
            const urls = (yield integrationsClient.signedUrls(token, Object.keys(paths), 'screen')).body;
            yield Promise.all(Object.keys(paths).map(key => (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield uploadToS3(urls, paths, key);
                }
                catch (e) {
                    try {
                        // Sometimes, S3 fails but can be retried.
                        yield uploadToS3(urls, paths, key);
                    }
                    catch (e) {
                        emitter.emit('view:fileUpload:error', { e, key });
                        reject(e);
                    }
                }
            }))()));
            resolve('done');
        }
        catch (e) {
            emitter.emit('view:upload:error', e);
            reject(e);
        }
    }));
};
module.exports = pushViews;
