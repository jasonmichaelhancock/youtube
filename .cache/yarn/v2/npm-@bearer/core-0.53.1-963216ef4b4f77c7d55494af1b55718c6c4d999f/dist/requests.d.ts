export declare type TBearerRequest<T> = {
    (params: any, init?: any): Promise<T>;
};
export declare function bearerRequest<TPromiseReturn>(uri: string, baseParams?: {}): TBearerRequest<TPromiseReturn>;
export declare function itemRequest(): TBearerRequest<any>;
declare type TIntentBaseQuery = {
    intentName: string;
    scenarioId: string;
    setupId: string;
};
export declare function intentRequest<TReturnFormat>({ intentName, scenarioId, setupId }: TIntentBaseQuery): TBearerRequest<TReturnFormat>;
declare const _default: {
    intentRequest: typeof intentRequest;
    itemRequest: typeof itemRequest;
};
export default _default;
