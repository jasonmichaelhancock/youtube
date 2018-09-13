import { Component, Prop } from '@bearer/core';
export class Button {
    constructor() {
        this.kind = 'primary';
        this.size = 'md';
        this.as = 'button';
        this.disabled = false;
    }
    render() {
        const Tag = this.as;
        const classes = ['btn', `btn-${this.kind}`, `btn-${this.size}`];
        return (h(Tag, { class: classes.join(' '), disabled: this.disabled }, this.content || h("slot", null)));
    }
    static get is() { return "bearer-button"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "as": {
            "type": String,
            "attr": "as"
        },
        "content": {
            "type": "Any",
            "attr": "content"
        },
        "disabled": {
            "type": Boolean,
            "attr": "disabled"
        },
        "kind": {
            "type": String,
            "attr": "kind"
        },
        "size": {
            "type": String,
            "attr": "size"
        }
    }; }
    static get style() { return "/**style-placeholder:bearer-button:**/"; }
}
