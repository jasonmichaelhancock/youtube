import '../../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class BearerRadio {
    el: HTMLElement;
    label?: string;
    controlName: string;
    inline: boolean;
    value: string;
    buttons: Array<{
        label: string;
        value: string;
        checked?: boolean;
    }>;
    valueChange: EventEmitter;
    inputClicked(event: any): void;
    render(): JSX.Element;
}
