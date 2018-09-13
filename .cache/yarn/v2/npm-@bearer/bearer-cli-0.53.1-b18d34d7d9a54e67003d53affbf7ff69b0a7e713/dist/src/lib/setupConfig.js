"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const findUp = require('find-up');
const rc = require('rc');
const os = require('os');
const fs = require('fs');
const ini = require('ini');
const path = require('path');
const { spawnSync } = require('child_process');
const configs = {
    dev: {
        DeploymentUrl: 'https://developer.dev.bearer.sh/v1/',
        IntegrationServiceHost: 'https://int.dev.bearer.sh/',
        IntegrationServiceUrl: 'https://int.dev.bearer.sh/api/v1/',
        DeveloperPortalAPIUrl: 'https://app.staging.bearer.sh/graphql',
        DeveloperPortalUrl: 'https://app.staging.bearer.sh/',
        CdnHost: 'https://static.dev.bearer.sh',
        BearerEnv: 'dev'
    },
    staging: {
        DeploymentUrl: 'https://developer.staging.bearer.sh/v1/',
        IntegrationServiceHost: 'https://int.staging.bearer.sh/',
        IntegrationServiceUrl: 'https://int.staging.bearer.sh/api/v1/',
        DeveloperPortalAPIUrl: 'https://app.staging.bearer.sh/graphql',
        DeveloperPortalUrl: 'https://app.staging.bearer.sh/',
        CdnHost: 'https://static.staging.bearer.sh',
        BearerEnv: 'staging'
    },
    production: {
        DeploymentUrl: 'https://developer.bearer.sh/v1/',
        IntegrationServiceHost: 'https://int.bearer.sh/',
        IntegrationServiceUrl: 'https://int.bearer.sh/api/v1/',
        DeveloperPortalAPIUrl: 'https://app.bearer.sh/graphql',
        DeveloperPortalUrl: 'https://app.bearer.sh/',
        CdnHost: 'https://static.bearer.sh',
        BearerEnv: 'production'
    }
};
exports.default = () => {
    const { BEARER_ENV = 'production' } = process.env;
    const setup = configs[BEARER_ENV];
    const isYarnInstalled = !!spawnSync('yarn', ['bin']).output;
    return Object.assign({}, setup, { isYarnInstalled, command: isYarnInstalled ? 'yarn' : 'npm', get bearerConfig() {
            return rc('bearer');
        },
        get scenarioConfig() {
            return rc('scenario');
        },
        get orgId() {
            return this.scenarioConfig.orgId;
        },
        get scenarioTitle() {
            return this.scenarioConfig.scenarioTitle;
        },
        get scenarioId() {
            return this.scenarioConfig.scenarioId;
        },
        get scenarioUuid() {
            if (!this.orgId || !this.scenarioId) {
                return undefined;
            }
            return `${this.orgId}-${this.scenarioId}`;
        },
        get rootPathRc() {
            return findUp.sync('.scenariorc');
        },
        setScenarioConfig(config) {
            const { scenarioTitle, orgId, scenarioId } = config;
            fs.writeFileSync(this.rootPathRc, ini.stringify({ scenarioTitle, orgId, scenarioId }));
        },
        storeBearerConfig(config) {
            const { Username, ExpiresAt, authorization } = config;
            fs.writeFileSync(this.bearerConfig.config || path.join(os.homedir(), '.bearerrc'), ini.stringify({
                Username,
                ExpiresAt,
                authorization
            }));
        } });
};
