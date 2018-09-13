import { Component, Listen, Prop, State, Method, Element } from '@bearer/core';
export class BearerScrollable {
    constructor() {
        this.perPage = 5;
        this.hasMore = true;
        this.page = 1;
        this.fetching = false;
        this.collection = [];
        this._renderCollection = () => {
            if (this.fetching && !this.collection.length) {
                return null;
            }
            return (this.renderCollection || this.renderCollectionDefault)(this.collection);
        };
        this.renderCollectionDefault = collection => (h("bearer-navigator-collection", Object.assign({}, this.rendererProps, { data: collection })));
        this._renderFetching = () => (this.renderFetching ? this.renderFetching() : h("bearer-loading", null));
        this.onScroll = () => {
            if (!this.fetching) {
                if (this.content.scrollTop + this.content.clientHeight >= this.content.scrollHeight) {
                    this.fetchNext();
                }
            }
        };
    }
    fetchNext() {
        if (this.hasMore) {
            this.fetching = true;
            this.fetcher({ page: this.page })
                .then(({ data }) => {
                console.log('[BEARER]', 'data receiced from fetcher', data);
                this.hasMore = data.length === this.perPage;
                this.collection = [...this.collection, ...data];
                this.fetching = false;
                this.page = this.page + 1;
                return data;
            })
                .catch(error => {
                console.error('[BEARER]', 'Error while fetching', error);
                this.fetching = false;
            });
        }
    }
    componentDidLoad() {
        if (this.element) {
            this.content = this.element.querySelector('.scrollable-list');
            this.content.addEventListener('scroll', this.onScroll);
            this.fetchNext();
        }
    }
    reset() {
        this.hasMore = true;
        this.collection = [];
        this.fetchNext();
    }
    render() {
        return (h("div", { class: "scrollable-list" },
            this._renderCollection(),
            this.fetching && this._renderFetching()));
    }
    static get is() { return "bearer-scrollable"; }
    static get properties() { return {
        "collection": {
            "state": true
        },
        "content": {
            "state": true
        },
        "element": {
            "elementRef": true
        },
        "fetcher": {
            "type": "Any",
            "attr": "fetcher"
        },
        "fetching": {
            "state": true
        },
        "hasMore": {
            "state": true
        },
        "page": {
            "state": true
        },
        "perPage": {
            "type": Number,
            "attr": "per-page"
        },
        "renderCollection": {
            "type": "Any",
            "attr": "render-collection"
        },
        "rendererProps": {
            "type": "Any",
            "attr": "renderer-props"
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
            "name": "BearerScrollableNext",
            "method": "fetchNext"
        }]; }
    static get style() { return "/**style-placeholder:bearer-scrollable:**/"; }
}
