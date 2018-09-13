import '../../stencil.core';
import { EventEmitter } from '@bearer/core';
import { FieldSet } from '../Forms/Fieldset';
export declare class BearerConfig {
    fields: Array<any> | string;
    referenceId: string;
    scenarioId: string;
    element: HTMLElement;
    stepCompleted: EventEmitter;
    fieldSet: FieldSet;
    error: boolean;
    loading: boolean;
    handleSubmit: (e: any) => void;
    componentWillLoad(): void;
    render(): JSX.Element[];
}
