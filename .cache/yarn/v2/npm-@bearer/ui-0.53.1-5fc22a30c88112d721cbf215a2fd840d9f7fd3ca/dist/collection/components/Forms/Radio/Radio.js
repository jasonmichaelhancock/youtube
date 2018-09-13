import { Component, Prop, Element, Event } from '@bearer/core';
export class BearerRadio {
    constructor() {
        this.inline = false;
    }
    inputClicked(event) {
        this.valueChange.emit(event.path[0].value);
    }
    render() {
        const css = this.inline ? 'form-check form-check-inline' : 'form-check';
        return (h("div", { class: "form-group" },
            this.label ? h("label", null, this.label) : '',
            this.buttons.map(value => {
                return (h("div", { class: css },
                    h("input", { class: "form-check-input", type: "radio", name: this.controlName, value: value.value, checked: this.value === value.value ? true : false, onClick: this.inputClicked.bind(this) }),
                    h("label", { class: "form-check-label" }, value.label)));
            })));
    }
    static get is() { return "bearer-radio"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "buttons": {
            "type": "Any",
            "attr": "buttons"
        },
        "controlName": {
            "type": String,
            "attr": "control-name"
        },
        "el": {
            "elementRef": true
        },
        "inline": {
            "type": Boolean,
            "attr": "inline"
        },
        "label": {
            "type": String,
            "attr": "label"
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
    static get style() { return "/**style-placeholder:bearer-radio:**/"; }
}
