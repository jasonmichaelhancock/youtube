import '../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class AuthConfig {
    submit: EventEmitter;
    handleSubmit(): void;
    render(): JSX.Element;
}
