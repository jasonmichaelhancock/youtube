import { Component, Prop } from '@bearer/core';
export class Typography {
    constructor() {
        this.as = 'p';
        this.kind = '';
    }
    render() {
        const Tag = this.as;
        return (h(Tag, { class: this.kind },
            h("slot", null)));
    }
    static get is() { return "bearer-typography"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "as": {
            "type": String,
            "attr": "as"
        },
        "kind": {
            "type": String,
            "attr": "kind"
        }
    }; }
    static get style() { return "/**style-placeholder:bearer-typography:**/"; }
}
