import { IAuthenticated, WithAuthenticationMethods } from '../../decorators/withAuthentication';
export declare type FWithAuthenticate = {
    ({ authenticate }: {
        authenticate: () => Promise<boolean>;
    }): any;
};
export declare class BearerAuthorized extends WithAuthenticationMethods implements IAuthenticated {
    authorized: boolean;
    sessionInitialized: boolean;
    renderUnauthorized: FWithAuthenticate;
    renderAuthorized: () => any;
    bearerContext: any;
    private pendingAuthorizationResolve;
    private pendingAuthorizationReject;
    onAuthorized: () => void;
    onRevoked: () => void;
    onSessionInitialized: () => void;
    authenticate(): void;
    revoke(): void;
    authenticatePromise: () => Promise<boolean>;
    render(): any;
}
