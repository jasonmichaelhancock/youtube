import '../../stencil.core';
export declare class BearerPopoverNavigator {
    el: HTMLElement;
    screens: Array<any>;
    screenData: Object;
    _isVisible: boolean;
    _visibleScreenIndex: number;
    navigationTitle: string;
    direction: string;
    btnProps: JSXElements.BearerButtonAttributes;
    display: string;
    complete?: <T>({ data, complete }: {
        data: T;
        complete: () => void;
    }) => void;
    scenarioCompletedHandler(): void;
    stepCompletedHandler(event: any): void;
    next: (e: any) => void;
    prev(e: any): void;
    isVisible: boolean;
    visibleScreen: any;
    readonly screenNodes: any;
    onVisibilityChange: ({ detail: { visible } }: {
        detail: {
            visible: boolean;
        };
    }) => void;
    showScreen: (screen: any) => void;
    hideScreen: (screen: any) => void;
    hasNext: () => boolean;
    hasPrevious: () => boolean;
    hasAuthScreen: () => any;
    componentDidLoad(): void;
    render(): JSX.Element;
}
