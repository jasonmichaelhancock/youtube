import '../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class BearerPagination {
    next: EventEmitter;
    prev: EventEmitter;
    goTo: EventEmitter;
    displayNextPrev: boolean;
    displayPages: boolean;
    currentPage: number;
    hasNext: boolean;
    pageCount: number;
    window: number;
    renderPrevious: () => JSX.Element;
    renderNext: () => JSX.Element;
    clickPage: (page: any) => () => void;
    renderPages: () => JSX.Element[];
    render(): JSX.Element;
}
