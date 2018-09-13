import { Component, Prop, Event } from '@bearer/core';
import BackArrow from './back-arrow';
export class BearerNavigatorBack {
    constructor() {
        this.disabled = false;
        this.back = () => {
            this.navigatorGoBack.emit();
        };
    }
    render() {
        return (h("button", { onClick: this.back, disabled: this.disabled },
            h(BackArrow, null)));
    }
    static get is() { return "bearer-navigator-back"; }
    static get properties() { return {
        "disabled": {
            "type": Boolean,
            "attr": "disabled"
        }
    }; }
    static get events() { return [{
            "name": "navigatorGoBack",
            "method": "navigatorGoBack",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get style() { return "/**style-placeholder:bearer-navigator-back:**/"; }
}
