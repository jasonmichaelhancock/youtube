import '../../stencil.core';
export declare class Button {
    content: any;
    kind: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
    size: 'md' | 'sm' | 'lg';
    as: string;
    disabled: boolean;
    render(): JSX.Element;
}
