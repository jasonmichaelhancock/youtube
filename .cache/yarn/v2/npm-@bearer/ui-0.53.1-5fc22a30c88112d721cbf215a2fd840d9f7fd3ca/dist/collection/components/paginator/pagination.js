import { Component, Prop, Event } from '@bearer/core';
import logic from './logic';
export class BearerPagination {
    constructor() {
        this.displayNextPrev = true;
        this.displayPages = true;
        this.currentPage = 1;
        this.hasNext = true;
        this.pageCount = 0;
        this.window = 2;
        this.renderPrevious = () => {
            if (this.displayNextPrev) {
                return (h("li", { class: `page-item ${this.currentPage === 1 && 'disabled'}` },
                    h("a", { class: "page-link", href: "#", onClick: () => this.prev.emit() },
                        h("slot", { name: "prevText" }, "Previous"))));
            }
        };
        this.renderNext = () => {
            if (this.displayNextPrev) {
                return (h("li", { class: `page-item ${!this.hasNext && 'disabled'}` },
                    h("a", { class: "page-link", href: "#", onClick: () => this.next.emit() },
                        h("slot", { name: "nextText" }, "Next"))));
            }
        };
        this.clickPage = page => () => {
            if (typeof page === 'number' && this.currentPage !== page) {
                this.goTo.emit(page);
            }
        };
        this.renderPages = () => {
            if (this.displayPages) {
                return logic(this.currentPage, this.pageCount, {
                    delta: this.window
                }).map(page => (h("li", { class: `page-item ${page == this.currentPage && 'active'}` },
                    h("a", { class: "page-link", href: "#", onClick: this.clickPage(page) }, page))));
            }
        };
    }
    render() {
        return (h("ul", { class: "pagination justify-content-center" },
            this.renderPrevious(),
            this.renderPages(),
            this.renderNext()));
    }
    static get is() { return "bearer-pagination"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "currentPage": {
            "type": Number,
            "attr": "current-page"
        },
        "displayNextPrev": {
            "type": Boolean,
            "attr": "display-next-prev"
        },
        "displayPages": {
            "type": Boolean,
            "attr": "display-pages"
        },
        "hasNext": {
            "type": Boolean,
            "attr": "has-next"
        },
        "pageCount": {
            "type": Number,
            "attr": "page-count"
        },
        "window": {
            "type": Number,
            "attr": "window"
        }
    }; }
    static get events() { return [{
            "name": "BearerPaginationNext",
            "method": "next",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }, {
            "name": "BearerPaginationPrev",
            "method": "prev",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }, {
            "name": "BearerPaginationGoTo",
            "method": "goTo",
            "bubbles": true,
            "cancelable": true,
            "composed": true
        }]; }
    static get style() { return "/**style-placeholder:bearer-pagination:**/"; }
}
