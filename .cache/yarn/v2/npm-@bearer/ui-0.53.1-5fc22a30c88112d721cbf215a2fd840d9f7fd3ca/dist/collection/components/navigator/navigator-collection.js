import { Component, Event, Prop, State, Watch } from '@bearer/core';
export class BearerNavigatorCollection {
    constructor() {
        this.displayMemberProp = 'name';
        this.collection = [];
        this.select = (member) => () => this.completeScreen.emit(member);
        this.defaultRender = (member) => member[this.displayMemberProp];
    }
    dataWatcher(newValue) {
        if (newValue) {
            if (typeof newValue === 'string') {
                this.collection = JSON.parse(newValue);
            }
            else {
                this.collection = newValue;
            }
        }
        else {
            this.collection = [];
        }
    }
    componentDidLoad() {
        this.dataWatcher(this.data);
    }
    render() {
        if (this.collection.length === 0) {
            return (h("slot", { name: "empty" },
                h("div", { class: "empty" }, "No results")));
        }
        const renderer = this.renderFunc || this.defaultRender;
        return (h("ul", { class: "list-group" }, this.collection.map((member) => (h("li", { onClick: !member._isDisabled && this.select(member), class: `list-group-item ${member._isDisabled && 'disabled'}`, role: "button" }, renderer(member))))));
    }
    static get is() { return "bearer-navigator-collection"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "collection": {
            "state": true
        },
        "data": {
            "type": "Any",
            "attr": "data",
            "watchCallbacks": ["dataWatcher"]
        },
        "displayMemberProp": {
            "type": String,
            "attr": "display-member-prop"
        },
        "renderFunc": {
            "type": "Any",
            "attr": "render-func"
        }
    }; }
    static get events() { return [{
            "name": "completeScreen",
            "method": "completeScreen",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get style() { return "/**style-placeholder:bearer-navigator-collection:**/"; }
}
