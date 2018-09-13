import '../../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class BearerCheckbox {
    el: HTMLElement;
    label?: string;
    controlName: string;
    inline: boolean;
    value: Array<string>;
    buttons: Array<{
        label: string;
        value: string;
        checked?: boolean;
    }>;
    valueChange: EventEmitter;
    inputClicked(event: any): void;
    render(): JSX.Element;
}
