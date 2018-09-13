import { Component, Prop, State, Event, Listen, Method } from '@bearer/core';
export class BearerForm {
    constructor() {
        this.values = [];
    }
    handleSubmit() {
        this.submit.emit(this.fields);
    }
    handleValue(field, value) {
        if (value) {
            this.fields.setValue(field, value.detail);
        }
    }
    updateFieldSet(fields) {
        this.fields = fields;
        this.updateValues(fields);
    }
    handleEnterKey() {
        this.submit.emit(this.fields);
    }
    updateValues(fieldset) {
        this.values = [];
        fieldset.map(el => {
            this.values.push(el.value);
            return el;
        });
    }
    handleInputClicked() {
        if (this.clearOnInput && !this.hasBeenCleared) {
            this.clearValues();
            this.hasBeenCleared = true;
        }
    }
    clearValues() {
        this.fields.map(el => {
            el.value = '';
            el.valueList = [];
            return el;
        });
        this.updateValues(this.fields);
    }
    componentDidLoad() {
        this.updateValues(this.fields);
    }
    // WIP
    isValid() {
        return true;
    }
    renderInputs() {
        return this.fields.map((input, index) => {
            switch (input.type) {
                case 'text':
                case 'password':
                case 'email':
                case 'tel':
                case 'submit':
                    return (h("bearer-input", { type: input.type, label: input.label, controlName: input.controlName, value: this.values[index], hint: input.hint, placeholder: input.placeholder, onValueChange: value => this.handleValue(input.controlName, value), onInputClick: _ => this.handleInputClicked() }));
                case 'textarea':
                    return (h("bearer-textarea", { label: input.label, controlName: input.controlName, value: this.values[index], hint: input.hint, placeholder: input.placeholder, onValueChange: value => this.handleValue(input.controlName, value) }));
                case 'radio':
                    return (h("bearer-radio", { label: input.label, controlName: input.controlName, value: this.values[index], buttons: input.buttons, inline: input.inline, onValueChange: value => this.handleValue(input.controlName, value) }));
                case 'checkbox':
                    return (h("bearer-checkbox", { label: input.label, controlName: input.controlName, value: input.valueList, buttons: input.buttons, inline: input.inline, onValueChange: value => this.handleValue(input.controlName, value) }));
                case 'select':
                    return (h("bearer-select", { label: input.label, controlName: input.controlName, value: this.values[index], options: input.options, onValueChange: value => this.handleValue(input.controlName, value) }));
            }
        });
    }
    render() {
        return (h("form", { onSubmit: () => this.handleSubmit() },
            this.renderInputs(),
            h("bearer-input", { type: "submit", disabled: !this.isValid(), onSubmit: () => this.handleSubmit() })));
    }
    static get is() { return "bearer-form"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "clearOnInput": {
            "type": Boolean,
            "attr": "clear-on-input"
        },
        "fields": {
            "type": "Any",
            "attr": "fields",
            "mutable": true
        },
        "hasBeenCleared": {
            "state": true
        },
        "updateFieldSet": {
            "method": true
        },
        "values": {
            "state": true
        }
    }; }
    static get events() { return [{
            "name": "submit",
            "method": "submit",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get listeners() { return [{
            "name": "keydown.enter",
            "method": "handleEnterKey"
        }]; }
    static get style() { return "/**style-placeholder:bearer-form:**/"; }
}
