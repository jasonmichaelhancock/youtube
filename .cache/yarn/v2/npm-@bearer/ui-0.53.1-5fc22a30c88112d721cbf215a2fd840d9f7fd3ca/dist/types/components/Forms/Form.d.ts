import '../../stencil.core';
import { EventEmitter } from '@bearer/core';
import { FieldSet } from './Fieldset';
export declare class BearerForm {
    fields: FieldSet;
    clearOnInput: boolean;
    hasBeenCleared: boolean;
    submit: EventEmitter;
    values: Array<string>;
    handleSubmit(): void;
    handleValue(field: string, value: any): void;
    updateFieldSet(fields: FieldSet): void;
    handleEnterKey(): void;
    updateValues(fieldset: FieldSet): void;
    handleInputClicked(): void;
    clearValues(): void;
    componentDidLoad(): void;
    isValid(): boolean;
    renderInputs(): {}[];
    render(): JSX.Element;
}
