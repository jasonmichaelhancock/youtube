import '../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class BearerNavigatorScreen {
    visible: boolean;
    data: any;
    navigationTitle: ((data: any) => string) | string;
    renderFunc: <T>(params: {
        next: (data: any) => void;
        prev: () => void;
        complete: () => void;
        data: T;
    }) => void;
    name: string;
    stepCompleted: EventEmitter;
    scenarioCompleted: EventEmitter;
    navigatorGoBack: EventEmitter;
    willAppear(data: any): void;
    willDisappear(): void;
    getTitle(): string;
    completeScreenHandler({ detail }: {
        detail: any;
    }): void;
    next: (data: any) => void;
    prev: () => void;
    complete: () => void;
    render(): JSX.Element;
}
