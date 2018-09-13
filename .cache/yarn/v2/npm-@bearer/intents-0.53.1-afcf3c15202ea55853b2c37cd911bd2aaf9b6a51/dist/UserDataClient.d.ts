declare type TPersistedData = {
    Item: {
        referenceId: string;
        [key: string]: any;
    };
};
declare class UserDataClient {
    private readonly baseURL;
    private client;
    constructor(baseURL: string);
    retrieveState(referenceId: string): Promise<TPersistedData>;
    updateState(referenceId: any, state: any): Promise<TPersistedData>;
    saveState(state: any): Promise<TPersistedData>;
}
declare const _default: (baseURL: string) => UserDataClient;
export default _default;
