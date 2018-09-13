import '../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class BearerButtonPopover {
    _visible: boolean;
    visibilityChange: EventEmitter;
    opened: boolean;
    direction: string;
    arrow: boolean;
    header: string;
    backNav: boolean;
    btnProps: JSXElements.BearerButtonAttributes;
    toggleDisplay: (e: any) => void;
    visible: boolean;
    clickOutsideHandler(): void;
    clickInsideHandler(ev: any): void;
    toggle(opened: boolean): void;
    componentDidLoad(): void;
    render(): JSX.Element;
}
