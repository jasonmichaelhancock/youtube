import { Component, Prop, Element, Event } from '@bearer/core';
export class BearerSelect {
    constructor() {
        this.options = [];
        this.onSelectChange = event => {
            this.valueChange.emit(event.path[0].value);
        };
    }
    componentDidLoad() {
        this.options = [{ label: '--- choose an option ---', value: '' }, ...this.options];
    }
    render() {
        return (h("div", { class: "form-group" },
            this.label ? h("label", null, this.label) : '',
            h("select", { class: "form-control", onChange: this.onSelectChange }, this.options.map(value => {
                return (h("option", { value: value.value, selected: this.value === value.value ? true : false }, value.label));
            }))));
    }
    static get is() { return "bearer-select"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "controlName": {
            "type": String,
            "attr": "control-name"
        },
        "el": {
            "elementRef": true
        },
        "label": {
            "type": String,
            "attr": "label"
        },
        "options": {
            "type": "Any",
            "attr": "options",
            "mutable": true
        },
        "value": {
            "type": String,
            "attr": "value",
            "mutable": true
        }
    }; }
    static get events() { return [{
            "name": "valueChange",
            "method": "valueChange",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get style() { return "/**style-placeholder:bearer-select:**/"; }
}
