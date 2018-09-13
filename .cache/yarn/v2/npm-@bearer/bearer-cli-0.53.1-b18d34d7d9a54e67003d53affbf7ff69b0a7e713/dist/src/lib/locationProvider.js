"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
class LocationProvider {
    constructor(config) {
        this.config = config;
        this.scenarioRc = this.config.scenarioConfig.config;
        if (this.scenarioRc) {
            this.scenarioRoot = path.dirname(this.scenarioRc);
            this.bearerDir = path.join(this.scenarioRoot, '.bearer');
        }
    }
    scenarioRootResourcePath(filename) {
        return path.join(this.scenarioRoot, filename);
    }
    // ~/views
    get srcViewsDir() {
        return path.join(this.scenarioRoot, 'views');
    }
    srcViewsDirResource(name) {
        return path.join(this.srcViewsDir, name);
    }
    // ~/intents
    get srcIntentsDir() {
        return path.join(this.scenarioRoot, 'intents');
    }
    buildViewsResourcePath(resource) {
        return path.join(this.buildViewsDir, resource);
    }
    // ~/.bearer/views
    get buildViewsDir() {
        return path.join(this.bearerDir, 'views');
    }
    // ~/.bearer/views/src
    get buildViewsComponentsDir() {
        return path.join(this.buildViewsDir, 'src');
    }
    // ~/.bearer/tmp
    get buildTmpDir() {
        return path.join(this.bearerDir, 'tmp');
    }
    // ~/.bearer/intents
    get buildIntentsDir() {
        return path.join(this.bearerDir, 'intents');
    }
    buildIntentsResourcePath(resource) {
        return path.join(this.buildIntentsDir, resource);
    }
    get intentsArtifactDir() {
        return path.join(this.bearerDir, 'artifacts');
    }
    intentsArtifactResourcePath(resource) {
        return path.join(this.intentsArtifactDir, resource);
    }
    get authConfigPath() {
        return this.scenarioRootResourcePath('auth.config.json');
    }
}
exports.default = LocationProvider;
