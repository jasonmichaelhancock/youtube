import Bearer, { Component, State, Element, Event, Prop, StateManager } from '@bearer/core';
import { FieldSet } from '../Forms/Fieldset';
import { OAuth2SetupType, EmailSetupType, KeySetupType } from './setup-types';
export class BearerSetup {
    constructor() {
        this.fields = [];
        this.error = false;
        this.loading = false;
        this.handleSubmit = (e) => {
            e.preventDefault();
            this.loading = true;
            const formSet = this.fieldSet.map(el => {
                return { key: el.controlName, value: el.value };
            });
            StateManager.storeSetup(formSet.reduce((acc, obj) => (Object.assign({}, acc, { [obj['key']]: obj['value'] })), {}))
                .then((item) => {
                this.loading = false;
                const referenceId = item.Item.referenceId;
                console.log('[BEARER]', 'setup_success', `setup_success:${this.scenarioId}`);
                Bearer.emitter.emit(`setup_success:${this.scenarioId}`, {
                    referenceId
                });
                this.setupSuccess.emit({ referenceId });
            })
                .catch(() => {
                this.error = true;
                this.loading = false;
                Bearer.emitter.emit(`setup_error:${this.scenarioId}`, {});
            });
        };
    }
    componentWillLoad() {
        if (typeof this.fields !== 'string') {
            this.fieldSet = new FieldSet(this.fields);
            return;
        }
        switch (this.fields) {
            case 'email':
                this.fieldSet = new FieldSet(EmailSetupType);
                break;
            case 'type':
                this.fieldSet = new FieldSet(KeySetupType);
                break;
            case 'oauth2':
            default:
                this.fieldSet = new FieldSet(OAuth2SetupType);
        }
    }
    render() {
        return [
            this.error && h("bearer-alert", { kind: "danger" }, "[Error] Unable to store the credentials"),
            this.loading ? (h("bearer-loading", null)) : (h("bearer-form", { fields: this.fieldSet, clearOnInput: true, onSubmit: this.handleSubmit }))
        ];
    }
    static get is() { return "bearer-setup"; }
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
            "name": "setupSuccess",
            "method": "setupSuccess",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get style() { return "/**style-placeholder:bearer-setup:**/"; }
}
