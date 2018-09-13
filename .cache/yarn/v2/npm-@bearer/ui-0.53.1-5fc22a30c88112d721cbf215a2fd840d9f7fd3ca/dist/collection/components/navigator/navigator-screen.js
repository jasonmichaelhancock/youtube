import { Component, Method, State, Prop, Event, Listen } from '@bearer/core';
export class BearerNavigatorScreen {
    constructor() {
        this.visible = false;
        this.next = data => {
            const payload = this.name ? { [this.name]: data } : data;
            this.stepCompleted.emit(payload);
        };
        this.prev = () => {
            this.navigatorGoBack.emit();
        };
        this.complete = () => {
            this.scenarioCompleted.emit();
        };
    }
    willAppear(data) {
        this.data = data;
        this.visible = true;
    }
    willDisappear() {
        this.visible = false;
    }
    getTitle() {
        if (typeof this.navigationTitle === 'function') {
            return this.navigationTitle(this.data);
        }
        return this.navigationTitle;
    }
    completeScreenHandler({ detail }) {
        this.next(detail);
    }
    render() {
        if (!this.visible) {
            return false;
        }
        return (h("div", { class: "screen" }, this.renderFunc ? (this.renderFunc({
            data: this.data,
            next: this.next,
            prev: this.prev,
            complete: this.complete
        })) : (h("slot", null))));
    }
    static get is() { return "bearer-navigator-screen"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "data": {
            "state": true
        },
        "getTitle": {
            "method": true
        },
        "name": {
            "type": String,
            "attr": "name"
        },
        "navigationTitle": {
            "type": String,
            "attr": "navigation-title"
        },
        "renderFunc": {
            "type": "Any",
            "attr": "render-func"
        },
        "visible": {
            "state": true
        },
        "willAppear": {
            "method": true
        },
        "willDisappear": {
            "method": true
        }
    }; }
    static get events() { return [{
            "name": "stepCompleted",
            "method": "stepCompleted",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }, {
            "name": "scenarioCompleted",
            "method": "scenarioCompleted",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }, {
            "name": "navigatorGoBack",
            "method": "navigatorGoBack",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get listeners() { return [{
            "name": "completeScreen",
            "method": "completeScreenHandler"
        }]; }
    static get style() { return "/**style-placeholder:bearer-navigator-screen:**/"; }
}
