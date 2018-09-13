import { Component, Element, Listen, Prop, State } from '@bearer/core';
const NAVIGATOR_AUTH_SCREEN_NAME = 'BEARER-NAVIGATOR-AUTH-SCREEN';
export class BearerPopoverNavigator {
    constructor() {
        this.screens = [];
        this.screenData = {};
        this._isVisible = false;
        this.direction = 'right';
        this.btnProps = { content: 'Activate' };
        this.display = 'popover';
        this.next = e => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            console.log('[BEARER]', 'Navigator: next', this.hasNext());
            if (this.hasNext()) {
                this.visibleScreen = Math.min(this._visibleScreenIndex + 1, this.screens.length - 1);
            }
            else if (this.complete) {
                this.complete({ complete: this.scenarioCompletedHandler.bind(this), data: this.screenData });
            }
        };
        this.onVisibilityChange = ({ detail: { visible } }) => {
            console.log('[BEARER]', 'Navigator:onVisibilityChange', visible);
            this.isVisible = visible;
        };
        this.showScreen = screen => {
            console.log('[BEARER]', 'showScreen', screen, this.isVisible);
            if (screen && this.isVisible) {
                screen.willAppear(this.screenData);
                this.navigationTitle = screen.getTitle();
                screen.classList.add('in');
            }
        };
        this.hideScreen = screen => {
            if (screen) {
                screen.willDisappear();
                screen.classList.remove('in');
            }
        };
        this.hasNext = () => this._visibleScreenIndex < this.screens.length - 1;
        this.hasPrevious = () => this._visibleScreenIndex > 0;
        this.hasAuthScreen = () => this.screenNodes.filter(node => node['tagName'] === NAVIGATOR_AUTH_SCREEN_NAME).length;
    }
    scenarioCompletedHandler() {
        this.screenData = {};
        this.isVisible = false;
        this.visibleScreen = this.hasAuthScreen() ? 1 : 0;
        this.el.shadowRoot.querySelector('#button')['toggle'](false);
    }
    stepCompletedHandler(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.screenData = Object.assign({}, this.screenData, event.detail);
        this.next(null);
    }
    prev(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (this.hasPrevious()) {
            this.visibleScreen = Math.max(this._visibleScreenIndex - 1, 0);
        }
    }
    set isVisible(newValue) {
        if (this._isVisible !== newValue) {
            console.log('[BEARER]', 'Navigator:isVisibleChanged', newValue);
            this._isVisible = newValue;
            if (newValue) {
                this.showScreen(this.visibleScreen);
            }
            else {
                // this.hideScreen(this.visibleScreen)
            }
        }
    }
    get isVisible() {
        return this._isVisible;
    }
    set visibleScreen(index) {
        if (this._visibleScreenIndex >= 0) {
            this.hideScreen(this.visibleScreen);
        }
        this._visibleScreenIndex = index;
        this.showScreen(this.visibleScreen);
    }
    get visibleScreen() {
        return this.screens[this._visibleScreenIndex];
    }
    get screenNodes() {
        return this.el.shadowRoot
            ? this.el.shadowRoot
                .querySelector('slot:not([name])')['assignedNodes']()
                .filter(node => node.willAppear)
            : [];
    }
    componentDidLoad() {
        console.log('[BEARER]', 'Navigator: componentDidLoad ');
        this.screens = this.screenNodes;
        this._visibleScreenIndex = 0;
    }
    render() {
        return (h("bearer-button-popover", { btnProps: this.btnProps, id: "button", direction: this.direction, header: this.navigationTitle, backNav: this.hasPrevious(), onVisibilityChange: this.onVisibilityChange },
            h("slot", null)));
    }
    static get is() { return "bearer-navigator"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "_isVisible": {
            "state": true
        },
        "_visibleScreenIndex": {
            "state": true
        },
        "btnProps": {
            "type": "Any",
            "attr": "btn-props"
        },
        "complete": {
            "type": "Any",
            "attr": "complete"
        },
        "direction": {
            "type": String,
            "attr": "direction"
        },
        "display": {
            "type": String,
            "attr": "display"
        },
        "el": {
            "elementRef": true
        },
        "navigationTitle": {
            "state": true
        },
        "screenData": {
            "state": true
        },
        "screens": {
            "state": true
        }
    }; }
    static get listeners() { return [{
            "name": "scenarioCompleted",
            "method": "scenarioCompletedHandler"
        }, {
            "name": "stepCompleted",
            "method": "stepCompletedHandler"
        }, {
            "name": "navigatorGoBack",
            "method": "prev"
        }]; }
}
