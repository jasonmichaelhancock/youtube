import '../../stencil.core';
import { EventEmitter } from '@bearer/core';
import { IAuthenticated, WithAuthenticationMethods } from '../../decorators/withAuthentication';
export declare class BearerNavigatorAuthScreen extends WithAuthenticationMethods implements IAuthenticated {
    el: HTMLStencilElement;
    scenarioAuthorized: boolean;
    scenarioAuthenticate: EventEmitter;
    stepCompleted: EventEmitter;
    willAppear(): void;
    willDisappear(): void;
    getTitle(): string;
    onAuthorized: () => void;
    onRevoked: () => void;
    goNext(): void;
    authenticate: () => void;
    revoke: () => void;
    render(): JSX.Element;
}
