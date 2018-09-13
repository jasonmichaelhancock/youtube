export default function AuthenticationListener(): (target: any) => void;
export interface IAuthenticated {
    onSessionInitialized?(): void;
    onAuthorized(): void;
    onRevoked(): void;
}
export interface IAuthenticatedLike extends IAuthenticated {
    [key: string]: any;
}
export declare class WithAuthenticationMethods {
}
