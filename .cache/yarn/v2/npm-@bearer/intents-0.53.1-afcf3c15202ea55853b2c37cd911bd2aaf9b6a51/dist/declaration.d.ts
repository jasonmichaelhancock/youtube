import { AxiosResponse } from 'axios';
/**
 * Intent callbacks
 */
export declare type TFetchDataCallback = {
    (payload: {
        data: any;
    } | {
        error: any;
    }): void;
};
export declare type TRetrieveStateCallback = {
    (payload: {
        data: any;
    } | {
        error: any;
    }): void;
};
/**
 * when success, state represent the data you want to store within Bearer database
 * whereras data sent to the frontend could be different
 */
export declare type TSaveStateCallback = {
    (payload: {
        state: any;
        data?: any;
    } | {
        error: any;
    }): void;
};
/**
 * Intents
 */
export declare type TBearerLambdaContext = {
    authAccess: TAuthContext;
};
export declare type ISaveStateIntentAction = {
    (context: TBearerLambdaContext, _params: any, body: any, state: any, callback: TSaveStateCallback): void;
};
export declare type IRetrieveStateIntentAction = {
    (context: TBearerLambdaContext, _params: any, state: any, callback: TRetrieveStateCallback): void;
};
export declare type TFetchDataAction = {
    (context: TBearerLambdaContext, params: Record<string, any>, body: Record<string, any>, callback: TFetchDataCallback): void;
};
/**
 * Auth definitions
 */
export declare type Toauth2Context = {
    accessToken: string;
    bearerBaseURL: string;
    [key: string]: any;
};
export declare type TnoAuthContext = {
    bearerBaseURL: string;
    [key: string]: any;
};
export declare type TbasicAuthContext = {
    username: string;
    password: string;
    bearerBaseURL: string;
    [key: string]: any;
};
export declare type TapiKeyContext = {
    apiKey: string;
    bearerBaseURL: string;
    [key: string]: any;
};
export declare type TAuthContext = TnoAuthContext | Toauth2Context | TbasicAuthContext | TapiKeyContext;
export declare type TStateData = AxiosResponse<{
    Item: any;
}>;
export declare type TLambdaEvent = {
    queryStringParameters: Record<string, any>;
    context: Record<string, any> & TBearerLambdaContext;
    body?: any;
};
export declare type TLambdaCallback = {
    (error: any | null, data: any): void;
};
