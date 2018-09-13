import { Component } from '@bearer/core';
import Bearer from '@bearer/core';
export class Button {
    render() {
        const { loadingComponent } = Bearer.config;
        if (loadingComponent) {
            const Tag = loadingComponent;
            return h(Tag, null);
        }
        return (h("div", { id: "root" },
            h("div", { id: "loader" },
                h("div", { id: "d1" }),
                h("div", { id: "d2" }),
                h("div", { id: "d3" }),
                h("div", { id: "d4" }),
                h("div", { id: "d5" }))));
    }
    static get is() { return "bearer-loading"; }
    static get encapsulation() { return "shadow"; }
    static get style() { return "/**style-placeholder:bearer-loading:**/"; }
}
