var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
import { Component, Listen, Method, Prop, State } from '@bearer/core';
import Bearer from '@bearer/core';
export class BearerDropdownButton {
    constructor() {
        this.visible = false;
        this.btnProps = {};
        this.toggleDisplay = e => {
            e.preventDefault();
            this.visible = !this.visible;
        };
    }
    clickOutsideHandler() {
        this.visible = false;
    }
    clickInsideHandler(ev) {
        ev.stopImmediatePropagation();
    }
    toggle(opened) {
        this.visible = opened;
    }
    componentDidLoad() {
        if (this.opened === false) {
            this.visible = false;
        }
        if (this.innerListener) {
            Bearer.emitter.addListener(this.innerListener, () => {
                this.visible = false;
            });
        }
    }
    render() {
        const _a = this.btnProps, { content } = _a, rest = __rest(_a, ["content"]);
        const btnProps = Object.assign({}, rest, { kind: 'primary' });
        return (h("div", { class: "root" },
            h("bearer-button", Object.assign({}, btnProps, { onClick: this.toggleDisplay }),
                content,
                h("span", { class: "symbol" }, "\u25BE")),
            this.visible && (h("div", { class: "dropdown-down" },
                h("slot", null)))));
    }
    static get is() { return "bearer-dropdown-button"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "btnProps": {
            "type": "Any",
            "attr": "btn-props"
        },
        "innerListener": {
            "type": String,
            "attr": "inner-listener"
        },
        "opened": {
            "type": Boolean,
            "attr": "opened"
        },
        "toggle": {
            "method": true
        },
        "visible": {
            "state": true
        }
    }; }
    static get listeners() { return [{
            "name": "body:click",
            "method": "clickOutsideHandler"
        }, {
            "name": "click",
            "method": "clickInsideHandler"
        }]; }
    static get style() { return "/**style-placeholder:bearer-dropdown-button:**/"; }
}
