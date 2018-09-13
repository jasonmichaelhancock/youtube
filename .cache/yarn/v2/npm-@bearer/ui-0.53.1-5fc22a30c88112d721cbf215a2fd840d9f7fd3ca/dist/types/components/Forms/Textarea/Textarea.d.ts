import '../../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class BearerTextarea {
    el: HTMLElement;
    label?: string;
    controlName: string;
    placeholder: string;
    value: string;
    hint: string;
    valueChange: EventEmitter;
    inputChanged(event: any): void;
    render(): JSX.Element;
}
