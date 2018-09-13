import { Component, Prop, Element, Event } from '@bearer/core';
export class BearerInput {
    // @Watch('value')
    // valueChanged(newValue: boolean, oldValue: boolean) {
    // console.log('a value has changed', newValue, oldValue)
    // const inputEl = this.el.shadowRoot.querySelector('input')
    // if (inputEl.value !== this.value) {
    //   inputEl.value = this.value
    // }
    // }
    inputChanged(event) {
        let val = event.target && event.target.value;
        this.value = val;
        this.valueChange.emit(this.value);
    }
    inputClicked() {
        if (this.type === 'submit') {
            this.submit.emit('submit');
        }
        else {
            this.inputClick.emit('click');
        }
    }
    render() {
        return (h("div", { class: "form-group" },
            this.label ? h("label", null, this.label) : '',
            h("input", { type: this.type, name: this.controlName, value: this.value, placeholder: this.placeholder, class: this.type === 'submit' ? 'btn btn-primary' : 'form-control', onInput: this.inputChanged.bind(this), onClick: this.inputClicked.bind(this), disabled: this.disabled }),
            this.hint ? h("small", { class: "form-text text-muted" }, this.hint) : ''));
    }
    static get is() { return "bearer-input"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "controlName": {
            "type": String,
            "attr": "control-name"
        },
        "disabled": {
            "type": Boolean,
            "attr": "disabled"
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
        "type": {
            "type": String,
            "attr": "type"
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
        }, {
            "name": "submit",
            "method": "submit",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }, {
            "name": "inputClick",
            "method": "inputClick",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get style() { return "/**style-placeholder:bearer-input:**/"; }
}
