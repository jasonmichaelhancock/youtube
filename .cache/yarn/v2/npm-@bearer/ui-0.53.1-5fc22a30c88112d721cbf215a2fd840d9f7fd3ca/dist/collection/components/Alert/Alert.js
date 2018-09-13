import { Component, Prop, classnames } from '@bearer/core';
export class Alert {
    constructor() {
        this.kind = 'primary';
    }
    render() {
        const classes = classnames({
            alert: true,
            [`alert-${this.kind}`]: true,
            'alert-dismissible': this.onDismiss
        });
        return (h("div", { class: classes },
            this.content || h("slot", null),
            this.onDismiss && (h("button", { type: "button", class: "close", "data-dismiss": "alert", "aria-label": "Close", onClick: this.onDismiss },
                h("span", { "aria-hidden": "true" }, "\u00D7")))));
    }
    static get is() { return "bearer-alert"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "content": {
            "type": "Any",
            "attr": "content"
        },
        "kind": {
            "type": String,
            "attr": "kind"
        },
        "onDismiss": {
            "type": "Any",
            "attr": "on-dismiss"
        }
    }; }
    static get style() { return "/**style-placeholder:bearer-alert:**/"; }
}
