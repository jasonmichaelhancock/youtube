export interface CheckableInput {
    label: string;
    value: string;
    default?: boolean;
}
export interface Option {
    label: string;
    value: string;
    checked?: boolean;
}
export declare type FieldType = 'text' | 'password' | 'email' | 'tel' | 'submit' | 'textarea' | 'radio' | 'checkbox' | 'select';
export interface Field {
    type: FieldType;
    label: string;
    controlName: string;
    value?: string;
    valueList?: Array<string>;
    hint?: string;
    placeholder?: string;
    inline?: boolean;
    buttons?: Array<CheckableInput>;
    options?: Array<Option>;
}
export declare class FieldSet {
    private set;
    constructor(set: Array<Field>);
    get(controlName: string): Field;
    getValue(controlName: string): string;
    setValue(controlName: string, value: string): void;
    map(func: (value: Field, index: number, array: Field[]) => {}): {}[];
    reduce(func: (previousValue: Field, currentValue: Field, currentIndex: number, array: Field[]) => Field): Field;
    filter(func: (value: Field, index: number, array: Field[]) => {}): Field[];
}
