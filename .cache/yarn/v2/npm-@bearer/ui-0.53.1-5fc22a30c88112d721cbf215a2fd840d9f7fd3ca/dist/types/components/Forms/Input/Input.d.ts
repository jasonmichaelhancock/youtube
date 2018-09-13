import '../../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class BearerInput {
    el: HTMLElement;
    label?: string;
    type: string;
    controlName: string;
    placeholder: string;
    value: string;
    hint: string;
    disabled: boolean;
    valueChange: EventEmitter;
    submit: EventEmitter;
    inputClick: EventEmitter;
    inputChanged(event: any): void;
    inputClicked(): void;
    render(): JSX.Element;
}
