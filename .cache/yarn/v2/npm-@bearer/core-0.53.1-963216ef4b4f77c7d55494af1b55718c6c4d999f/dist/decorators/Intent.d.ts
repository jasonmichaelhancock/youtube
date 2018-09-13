/**
 * Declarations
 */
export declare enum IntentType {
    RetrieveState = "RetrieveState",
    SaveState = "SaveState",
    FetchData = "FetchData"
}
declare type TFetchBearerResult = {
    meta: {
        referenceId: string;
    };
    data: Array<any> | any;
    error?: any;
};
export declare type TFetchBearerData = {
    data: Array<any> | any;
    referenceId?: string;
};
export interface BearerFetch {
    (...args: any[]): Promise<any>;
}
interface IDecorator {
    (target: any, key: string): void;
}
/**
 * Constants
 */
export declare const BearerContext = "bearerContext";
export declare const setupId = "setupId";
export declare const IntentSaved = "BearerStateSaved";
export declare const BearerStateSavedEvent = "bearer:StateSaved";
/**
 * Intent
 */
export declare function Intent(intentName: string, type?: IntentType): IDecorator;
export declare function IntentPromise(promise: Promise<TFetchBearerResult>): Promise<TFetchBearerData>;
export {};
