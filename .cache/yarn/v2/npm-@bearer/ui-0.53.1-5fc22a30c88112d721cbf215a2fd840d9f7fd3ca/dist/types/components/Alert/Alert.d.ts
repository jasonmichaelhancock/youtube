import '../../stencil.core';
export declare class Alert {
    onDismiss: () => void;
    content: any;
    kind: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
    render(): JSX.Element;
}
