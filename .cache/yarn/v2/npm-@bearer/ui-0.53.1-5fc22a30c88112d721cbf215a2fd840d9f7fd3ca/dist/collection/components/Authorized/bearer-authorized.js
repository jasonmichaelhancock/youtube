var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { State, Component, Prop, Method } from '@bearer/core';
import WithAuthentication, { WithAuthenticationMethods } from '../../decorators/withAuthentication';
// TODO: scope  authenticatePromise per scenario/setup
let BearerAuthorized = class BearerAuthorized extends WithAuthenticationMethods {
    constructor() {
        super(...arguments);
        this.authorized = null;
        this.sessionInitialized = false;
        this.onAuthorized = () => {
            console.log('[BEARER]', 'onAuthorized', !!this.pendingAuthorizationResolve);
            this.authorized = true;
            if (this.pendingAuthorizationResolve) {
                this.pendingAuthorizationResolve(true);
            }
        };
        this.onRevoked = () => {
            this.authorized = false;
            console.log('[BEARER]', 'onRevoked', !!this.pendingAuthorizationReject);
            if (this.pendingAuthorizationReject) {
                this.pendingAuthorizationReject(false);
            }
        };
        this.onSessionInitialized = () => {
            this.sessionInitialized = true;
        };
        this.authenticatePromise = () => {
            const promise = new Promise((resolve, reject) => {
                this.pendingAuthorizationResolve = resolve;
                this.pendingAuthorizationReject = reject;
            });
            this['authorizeProto'].bind(this)();
            return promise;
        };
    }
    authenticate() {
        console.log('[BEARER]', 'bearer-authorized', 'authenticate');
        this.authenticatePromise()
            .then(data => {
            console.log('[BEARER]', 'bearer-authorized', 'authenticated', data);
        })
            .catch(error => {
            console.log('[BEARER]', 'bearer-authenticated', 'error', error);
        });
    }
    revoke() {
        console.log('[BEARER]', 'bearer-authorized', 'revoke');
        this['revokeProto'].bind(this)();
    }
    render() {
        if (!this.sessionInitialized || this.authorized === null) {
            return null;
        }
        if (!this.authorized) {
            return this.renderUnauthorized
                ? this.renderUnauthorized({ authenticate: this.authenticatePromise })
                : 'Unauthorized';
        }
        return this.renderAuthorized ? this.renderAuthorized() : h("slot", null);
    }
    static get is() { return "bearer-authorized"; }
    static get properties() { return {
        "authenticate": {
            "method": true
        },
        "authorized": {
            "state": true
        },
        "bearerContext": {
            "context": "bearer"
        },
        "renderAuthorized": {
            "type": "Any",
            "attr": "render-authorized"
        },
        "renderUnauthorized": {
            "type": "Any",
            "attr": "render-unauthorized"
        },
        "revoke": {
            "method": true
        },
        "sessionInitialized": {
            "state": true
        }
    }; }
};
BearerAuthorized = __decorate([
    WithAuthentication()
], BearerAuthorized);
export { BearerAuthorized };
