import '../../stencil.core';
import { TFetchBearerData } from '@bearer/core';
export declare class BearerPaginator {
    renderCollection: (collection: Array<any>) => any;
    renderFetching: () => any;
    perPage: number;
    pageCount: number;
    fetcher: (refineParams: {
        page: number;
    }) => Promise<TFetchBearerData>;
    fetching: boolean;
    currentPage: number;
    maxPages: number;
    collection: Array<any>;
    nextHandler(): void;
    prevHandler(): void;
    goToHandler(e: any): void;
    _renderCollection: () => any;
    _renderFetching: () => any;
    componentDidLoad(): void;
    reset(): void;
    render(): JSX.Element;
}
