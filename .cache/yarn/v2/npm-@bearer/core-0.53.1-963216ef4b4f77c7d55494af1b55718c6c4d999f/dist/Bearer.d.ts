import BearerConfig from './BearerConfig';
import fbemitter from 'fbemitter';
declare class Bearer {
    static init(config?: any): Bearer;
    private static _instance;
    static readonly emitter: fbemitter.EventEmitter;
    static readonly instance: Bearer;
    static readonly config: BearerConfig;
    static readonly version: string;
    private iframe;
    private isSessionInitialized;
    private allowIntegrationRequests;
    private _maybeInitialized;
    constructor(args: any);
    bearerConfig: BearerConfig;
    maybeInitialized: Promise<boolean>;
    static onAuthorized: (scenarioId: string, callback: (authorize: boolean) => void) => void;
    static onRevoked: (scenarioId: string, callback: (authorize: boolean) => void) => void;
    authorized: (scenarioId: string) => void;
    revoked: (scenarioId: string) => void;
    hasAuthorized: (scenarioId: any) => Promise<boolean>;
    revokeAuthorization: (scenarioId: string) => void;
    initSession(): void;
    private sessionInitialized;
    askAuthorizations: ({ scenarioId, setupId }: {
        scenarioId: any;
        setupId: any;
    }) => boolean;
}
export default Bearer;
