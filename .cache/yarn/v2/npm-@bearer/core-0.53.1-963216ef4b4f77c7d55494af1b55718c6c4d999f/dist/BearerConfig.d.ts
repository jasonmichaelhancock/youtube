export interface IBearerConfig {
    integrationHost?: string;
    integrationId?: string;
    loadingComponent?: string;
}
export default class BearerConfig {
    integrationHost: string;
    authorizationHost: string;
    integrationId: string;
    loadingComponent: string;
    constructor(options?: IBearerConfig);
    update(options: IBearerConfig): void;
}
