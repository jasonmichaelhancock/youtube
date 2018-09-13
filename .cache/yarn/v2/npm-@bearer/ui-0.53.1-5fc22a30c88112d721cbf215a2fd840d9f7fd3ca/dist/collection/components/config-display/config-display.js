import { Component, Prop, State } from '@bearer/core';
import Bearer from '@bearer/core';
export class BearerConfigDisplay {
    constructor() {
        this.scenarioId = '';
        this.isConfig = false;
        this.configId = '';
    }
    componentDidLoad() {
        Bearer.emitter.addListener(`config_success:${this.scenarioId}`, data => {
            this.configId = data.referenceID;
            this.isConfig = true;
        });
    }
    render() {
        if (this.isConfig) {
            return (h("p", null,
                "Scenario is currently configure with Config ID:\u00A0",
                h("bearer-badge", { kind: "info" }, this.configId)));
        }
        else {
            return (h("p", null,
                h("p", null, "Scenario hasn't been configured yet")));
        }
    }
    static get is() { return "bearer-config-display"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "configId": {
            "state": true
        },
        "isConfig": {
            "state": true
        },
        "scenarioId": {
            "type": String,
            "attr": "scenario-id"
        }
    }; }
}
