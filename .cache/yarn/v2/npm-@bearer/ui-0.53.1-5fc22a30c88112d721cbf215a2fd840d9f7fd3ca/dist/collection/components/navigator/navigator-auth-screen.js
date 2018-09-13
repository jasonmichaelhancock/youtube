var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Component, Method, State, Event, Element } from '@bearer/core';
import WithAuthentication, { WithAuthenticationMethods } from '../../decorators/withAuthentication';
let BearerNavigatorAuthScreen = class BearerNavigatorAuthScreen extends WithAuthenticationMethods {
    constructor() {
        super(...arguments);
        this.scenarioAuthorized = null;
        this.onAuthorized = () => {
            console.log('[BEARER]', 'onAuthorized');
            this.goNext();
        };
        this.onRevoked = () => {
            this.scenarioAuthorized = false;
        };
        this.authenticate = () => {
            this.el.shadowRoot.querySelector('#authorizer')['authenticate']();
        };
        this.revoke = () => {
            this.el.shadowRoot.querySelector('#authorizer')['revoke']();
        };
    }
    willAppear() {
        console.log('[BEARER]', 'Auth screen willAppear');
        this.el.shadowRoot.querySelector('#screen')['willAppear']();
    }
    willDisappear() {
        console.log('[BEARER]', 'Auth screen willAppear');
        this.el.shadowRoot.querySelector('#screen')['willDisappear']();
    }
    getTitle() {
        return 'Authentication';
    }
    goNext() {
        console.log('[BEARER]', 'go to next screen');
        this.scenarioAuthenticate.emit();
        this.stepCompleted.emit();
        this.scenarioAuthorized = true;
    }
    render() {
        return (h("bearer-navigator-screen", { id: "screen", navigationTitle: "Authentication", class: "in" },
            h("bearer-authorized", { id: "authorizer", renderUnauthorized: () => (h("bearer-button", { kind: "primary", onClick: this.authenticate },
                    ' ',
                    "Login",
                    ' ')), renderAuthorized: () => (h("bearer-button", { kind: "warning", onClick: this.revoke },
                    ' ',
                    "Logout",
                    ' ')) })));
    }
    static get is() { return "bearer-navigator-auth-screen"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "el": {
            "elementRef": true
        },
        "getTitle": {
            "method": true
        },
        "scenarioAuthorized": {
            "state": true
        },
        "willAppear": {
            "method": true
        },
        "willDisappear": {
            "method": true
        }
    }; }
    static get events() { return [{
            "name": "scenarioAuthenticate",
            "method": "scenarioAuthenticate",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }, {
            "name": "stepCompleted",
            "method": "stepCompleted",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get style() { return "/**style-placeholder:bearer-navigator-auth-screen:**/"; }
};
BearerNavigatorAuthScreen = __decorate([
    WithAuthentication()
], BearerNavigatorAuthScreen);
export { BearerNavigatorAuthScreen };
