import '../../stencil.core';
import { TFetchBearerData } from '@bearer/core';
import { TCollectionRenderer } from './types';
export declare class BearerScrollable {
    renderCollection?: TCollectionRenderer;
    rendererProps?: JSXElements.BearerNavigatorCollectionAttributes;
    renderFetching?: () => any;
    perPage?: number;
    fetcher: ({ page: number }: {
        page: any;
    }) => Promise<TFetchBearerData>;
    hasMore: boolean;
    page: number;
    fetching: boolean;
    collection: Array<any>;
    content: HTMLElement;
    element: HTMLElement;
    fetchNext(): void;
    _renderCollection: () => any;
    renderCollectionDefault: TCollectionRenderer;
    _renderFetching: () => any;
    componentDidLoad(): void;
    onScroll: () => void;
    reset(): void;
    render(): JSX.Element;
}
