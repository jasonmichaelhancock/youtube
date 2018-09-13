declare type TPersistedData = {
    Item: {
        referenceId: string;
        [key: string]: any;
    };
};
export declare class DBClient {
    private readonly baseURL;
    static instance(): DBClient;
    private client;
    constructor(baseURL: string);
    getData(referenceId: string): Promise<TPersistedData>;
    updateData(referenceId: any, data: any): Promise<TPersistedData>;
    saveData(data: any): Promise<TPersistedData>;
}
declare const _default: (baseURL: string) => DBClient;
export default _default;
