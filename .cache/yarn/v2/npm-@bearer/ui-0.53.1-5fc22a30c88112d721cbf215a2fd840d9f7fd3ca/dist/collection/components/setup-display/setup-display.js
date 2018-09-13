import Bearer, { Component, Prop, State } from '@bearer/core';
export class BearerSetupDisplay {
    constructor() {
        this.scenarioId = '';
        this.isSetup = false;
        this.setupId = '';
    }
    componentDidLoad() {
        Bearer.emitter.addListener(`setup_success:${this.scenarioId}`, data => {
            this.setupId = data.referenceId;
            this.isSetup = true;
        });
    }
    render() {
        if (this.isSetup || this.setupId) {
            return (h("p", null,
                "Scenario is currently setup with Setup ID:\u00A0",
                h("bearer-badge", { kind: "info" }, this.setupId)));
        }
        else {
            return (h("p", null,
                h("p", null, "Scenario hasn't been setup yet")));
        }
    }
    static get is() { return "bearer-setup-display"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "isSetup": {
            "state": true
        },
        "scenarioId": {
            "type": String,
            "attr": "scenario-id"
        },
        "setupId": {
            "type": String,
            "attr": "setup-id",
            "mutable": true
        }
    }; }
}
