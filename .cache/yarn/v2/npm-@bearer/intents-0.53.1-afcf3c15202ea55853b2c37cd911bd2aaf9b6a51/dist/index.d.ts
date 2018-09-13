import * as d from './declaration';
export * from './declaration';
import { DBClient as CLIENT } from './DBClient';
export declare const DBClient: typeof CLIENT.instance;
export declare class Intent {
    static fetchData(callback: d.TLambdaCallback, { data, error }: {
        data?: any;
        error?: any;
    }): void;
}
declare class BaseIntent {
    static readonly display: string;
    static intent(_action: any): (event: any, context: any, callback: (...args: any[]) => any) => any;
}
declare class GenericIntentBase extends BaseIntent {
    static readonly isStateIntent: boolean;
    static readonly isGlobalIntent: boolean;
}
declare class StateIntentBase extends BaseIntent {
    static readonly isStateIntent: boolean;
    static readonly isGlobalIntent: boolean;
}
export declare class SaveState extends StateIntentBase {
    static readonly display: string;
    static intent(action: d.ISaveStateIntentAction): (event: d.TLambdaEvent, _context: any, lambdaCallback: d.TLambdaCallback) => void;
}
export declare class RetrieveState extends StateIntentBase {
    static readonly display: string;
    static intent(action: d.IRetrieveStateIntentAction): (event: d.TLambdaEvent, _context: any, lambdaCallback: d.TLambdaCallback) => void;
}
export declare class FetchData extends GenericIntentBase {
    static readonly display: string;
    static intent(action: d.TFetchDataAction): (event: d.TLambdaEvent, _context: any, lambdaCallback: d.TLambdaCallback) => void;
}
