import { Component, State, Prop, Listen, Method, Event } from '@bearer/core';
export class BearerButtonPopover {
    constructor() {
        this._visible = false;
        this.direction = 'top';
        this.arrow = true;
        this.btnProps = {};
        this.toggleDisplay = e => {
            e.preventDefault();
            console.log('[BEARER]', 'Button popover: toggleDisplay', !this.visible);
            this.visible = !this.visible;
        };
    }
    set visible(newValue) {
        if (this._visible !== newValue) {
            console.log('[BEARER]', 'Button popover: visibilityChangeHandler', newValue);
            this._visible = newValue;
            this.visibilityChange.emit({ visible: this._visible });
        }
    }
    get visible() {
        return this._visible;
    }
    clickOutsideHandler() {
        this.visible = false;
    }
    clickInsideHandler(ev) {
        ev.stopImmediatePropagation();
    }
    toggle(opened) {
        this.visible = opened;
    }
    componentDidLoad() {
        this.visible = this.opened;
    }
    render() {
        return (h("div", { class: "root" },
            h("bearer-button", Object.assign({}, this.btnProps, { onClick: this.toggleDisplay })),
            h("div", { class: `popover fade show bs-popover-${this.direction} direction-${this.direction} ${!this.visible &&
                    'hidden'}` },
                h("h3", { class: "popover-header" },
                    this.backNav && h("bearer-navigator-back", { class: "header-arrow" }),
                    h("span", { class: "header" }, this.header)),
                h("div", { class: "popover-body" },
                    h("slot", null)),
                this.arrow && h("div", { class: "arrow" }))));
    }
    static get is() { return "bearer-button-popover"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "_visible": {
            "state": true
        },
        "arrow": {
            "type": Boolean,
            "attr": "arrow"
        },
        "backNav": {
            "type": Boolean,
            "attr": "back-nav"
        },
        "btnProps": {
            "type": "Any",
            "attr": "btn-props"
        },
        "direction": {
            "type": String,
            "attr": "direction"
        },
        "header": {
            "type": String,
            "attr": "header"
        },
        "opened": {
            "type": Boolean,
            "attr": "opened"
        },
        "toggle": {
            "method": true
        }
    }; }
    static get events() { return [{
            "name": "visibilityChange",
            "method": "visibilityChange",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get listeners() { return [{
            "name": "body:click",
            "method": "clickOutsideHandler"
        }, {
            "name": "click",
            "method": "clickInsideHandler"
        }]; }
    static get style() { return "/**style-placeholder:bearer-button-popover:**/"; }
}
