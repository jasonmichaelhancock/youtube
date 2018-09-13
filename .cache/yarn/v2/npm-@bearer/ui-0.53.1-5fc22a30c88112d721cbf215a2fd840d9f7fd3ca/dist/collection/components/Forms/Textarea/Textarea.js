import { Component, Prop, Element, Event } from '@bearer/core';
export class BearerTextarea {
    // @Watch('value')
    // valueChanged() {
    //   const inputEl = this.el.shadowRoot.querySelector('input')
    //   if (inputEl.value !== this.value) {
    //     inputEl.value = this.value
    //   }
    // }
    inputChanged(event) {
        let val = event.target && event.target.value;
        this.value = val;
        this.valueChange.emit(this.value);
    }
    render() {
        return (h("div", { class: "form-group" },
            this.label ? h("label", null, this.label) : '',
            h("textarea", { name: this.controlName, value: this.value, placeholder: this.placeholder, class: "form-control", onInput: this.inputChanged.bind(this) }, this.value),
            this.hint ? h("small", { class: "form-text text-muted" }, this.hint) : ''));
    }
    static get is() { return "bearer-textarea"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "controlName": {
            "type": String,
            "attr": "control-name"
        },
        "el": {
            "elementRef": true
        },
        "hint": {
            "type": String,
            "attr": "hint",
            "mutable": true
        },
        "label": {
            "type": String,
            "attr": "label"
        },
        "placeholder": {
            "type": String,
            "attr": "placeholder"
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
    static get style() { return "/**style-placeholder:bearer-textarea:**/"; }
}
