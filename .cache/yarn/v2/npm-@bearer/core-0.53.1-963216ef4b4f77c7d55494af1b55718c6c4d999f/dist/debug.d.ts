export interface ILogger {
    namespace: string;
}
declare function logger(namespace: any): ILogger;
export default logger;
