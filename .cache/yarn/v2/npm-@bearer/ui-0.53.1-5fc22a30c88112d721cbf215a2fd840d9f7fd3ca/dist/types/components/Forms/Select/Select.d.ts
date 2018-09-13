import '../../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class BearerSelect {
    el: HTMLElement;
    label?: string;
    controlName: string;
    value: string;
    options: Array<{
        label: string;
        value: string;
        default?: boolean;
    }>;
    valueChange: EventEmitter;
    onSelectChange: (event: any) => void;
    componentDidLoad(): void;
    render(): JSX.Element;
}
