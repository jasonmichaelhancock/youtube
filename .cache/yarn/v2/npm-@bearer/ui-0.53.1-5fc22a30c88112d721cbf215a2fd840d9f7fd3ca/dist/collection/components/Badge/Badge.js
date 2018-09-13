import { Component, Prop } from '@bearer/core';
export class BearerBadge {
    render() {
        return h("span", { class: `badge badge-${this.kind}` }, this.content || h("slot", null));
    }
    static get is() { return "bearer-badge"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "content": {
            "type": "Any",
            "attr": "content"
        },
        "kind": {
            "type": String,
            "attr": "kind"
        }
    }; }
    static get style() { return "/**style-placeholder:bearer-badge:**/"; }
}
