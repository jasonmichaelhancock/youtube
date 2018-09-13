import { Component, Listen, Prop, State, Method } from '@bearer/core';
export class BearerPaginator {
    constructor() {
        this.perPage = 5;
        this.fetching = false;
        this.currentPage = 0;
        this.maxPages = 0;
        this.collection = [];
        this._renderCollection = () => {
            const start = (this.currentPage - 1) * this.perPage;
            return this.renderCollection(this.collection.slice(start, start + this.perPage));
        };
        this._renderFetching = () => (this.renderFetching ? this.renderFetching() : h("bearer-loading", null));
    }
    nextHandler() {
        const itemMaybeIndex = this.currentPage * this.perPage + 1;
        this.currentPage = this.currentPage + 1;
        if (!this.collection[itemMaybeIndex]) {
            this.fetching = true;
            this.fetcher({ page: this.currentPage })
                .then(({ data }) => {
                this.collection = [...this.collection, ...data];
                this.fetching = false;
            })
                .catch(e => {
                this.fetching = false;
                console.error(e);
            });
        }
    }
    prevHandler() {
        this.currentPage = Math.max(this.currentPage - 1, 1);
    }
    goToHandler(e) {
        this.currentPage = e.detail;
    }
    componentDidLoad() {
        this.nextHandler();
    }
    reset() {
        this.currentPage = 0;
        this.collection = [];
        this.nextHandler();
    }
    render() {
        return (h("div", null,
            this.fetching ? this._renderFetching() : this._renderCollection(),
            !!this.collection.length && [
                h("br", null),
                h("bearer-pagination", { currentPage: this.currentPage, hasNext: true, displayPages: false })
            ]));
    }
    static get is() { return "bearer-paginator"; }
    static get encapsulation() { return "shadow"; }
    static get properties() { return {
        "collection": {
            "state": true
        },
        "currentPage": {
            "state": true
        },
        "fetcher": {
            "type": "Any",
            "attr": "fetcher"
        },
        "fetching": {
            "state": true
        },
        "maxPages": {
            "state": true
        },
        "pageCount": {
            "type": Number,
            "attr": "page-count"
        },
        "perPage": {
            "type": Number,
            "attr": "per-page"
        },
        "renderCollection": {
            "type": "Any",
            "attr": "render-collection"
        },
        "renderFetching": {
            "type": "Any",
            "attr": "render-fetching"
        },
        "reset": {
            "method": true
        }
    }; }
    static get listeners() { return [{
            "name": "BearerPaginationNext",
            "method": "nextHandler"
        }, {
            "name": "BearerPaginationPrev",
            "method": "prevHandler"
        }, {
            "name": "BearerPaginationGoTo",
            "method": "goToHandler"
        }]; }
    static get style() { return "/**style-placeholder:bearer-paginator:**/"; }
}
