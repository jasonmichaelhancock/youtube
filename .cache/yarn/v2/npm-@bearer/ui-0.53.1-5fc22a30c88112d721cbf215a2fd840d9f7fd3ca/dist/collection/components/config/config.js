import Bearer, { Component, State, Element, Event, Prop, StateManager } from '@bearer/core';
import { FieldSet } from '../Forms/Fieldset';
export class BearerConfig {
    constructor() {
        this.fields = [];
        this.error = false;
        this.loading = false;
        this.handleSubmit = (e) => {
            e.preventDefault();
            this.loading = true;
            const formSet = this.fieldSet.map(el => ({
                key: el.controlName,
                value: el.value
            }));
            StateManager.storeSetup(formSet.reduce((acc, obj) => (Object.assign({}, acc, { [obj['key']]: obj['value'] })), {}))
                .then((item) => {
                this.loading = false;
                console.log(`${this.scenarioId}`);
                Bearer.emitter.emit(`config_success:${this.scenarioId}`, {
                    referenceID: item.Item.referenceId
                });
            })
                .catch(() => {
                this.error = true;
                this.loading = false;
                Bearer.emitter.emit(`config_error:${this.scenarioId}`, {});
            });
        };
    }
    componentWillLoad() {
        this.fieldSet = new FieldSet(this.fields);
    }
    render() {
        return [
            this.error && h("bearer-alert", { kind: "danger" }, "[Error] Unable to store the credentials"),
            this.loading ? (h("bearer-loading", null)) : (h("bearer-form", { fields: this.fieldSet, clearOnInput: true, onSubmit: this.handleSubmit }))
        ];
    }
    static get is() { return "bearer-config"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "element": {
            "elementRef": true
        },
        "error": {
            "state": true
        },
        "fields": {
            "type": String,
            "attr": "fields"
        },
        "fieldSet": {
            "state": true
        },
        "loading": {
            "state": true
        },
        "referenceId": {
            "type": String,
            "attr": "reference-id"
        },
        "scenarioId": {
            "type": String,
            "attr": "scenario-id"
        }
    }; }
    static get events() { return [{
            "name": "stepCompleted",
            "method": "stepCompleted",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get style() { return "/**style-placeholder:bearer-config:**/"; }
}
