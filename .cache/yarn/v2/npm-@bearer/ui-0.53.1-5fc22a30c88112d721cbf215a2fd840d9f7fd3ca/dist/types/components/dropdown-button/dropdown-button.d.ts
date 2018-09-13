import '../../stencil.core';
export declare class BearerDropdownButton {
    visible: boolean;
    opened: boolean;
    innerListener: string;
    btnProps: JSXElements.BearerButtonAttributes;
    toggleDisplay: (e: any) => void;
    clickOutsideHandler(): void;
    clickInsideHandler(ev: any): void;
    toggle(opened: boolean): void;
    componentDidLoad(): void;
    render(): JSX.Element;
}
