import { Component, Prop, Element, Event } from '@bearer/core';
export class BearerCheckbox {
    constructor() {
        this.inline = false;
        this.value = [];
    }
    inputClicked(event) {
        const index = this.value ? this.value.indexOf(event.path[0].value) : -1;
        if (index >= 0) {
            this.value.splice(index, 1);
            this.valueChange.emit(this.value);
        }
        else {
            this.value.push(event.path[0].value);
            this.valueChange.emit(this.value);
        }
    }
    render() {
        const css = this.inline ? 'form-check form-check-inline' : 'form-check';
        return (h("div", { class: "form-group" },
            this.label ? h("label", null, this.label) : '',
            this.buttons.map(value => {
                return (h("div", { class: css },
                    h("input", { class: "form-check-input", type: "checkbox", name: this.controlName, value: value.value, checked: this.value && this.value.indexOf(value.value) >= 0 ? true : false, onClick: this.inputClicked.bind(this) }),
                    h("label", { class: "form-check-label" }, value.label)));
            })));
    }
    static get is() { return "bearer-checkbox"; }
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
            "type": "Any",
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
    static get style() { return "/**style-placeholder:bearer-checkbox:**/"; }
}
