import '../../stencil.core';
import { EventEmitter } from '@bearer/core';
import { TMember, TMemberRenderer } from './types';
export declare class BearerNavigatorCollection {
    data: any;
    displayMemberProp: string;
    collection: Array<TMember>;
    renderFunc: TMemberRenderer<TMember>;
    completeScreen: EventEmitter;
    select: (member: TMember) => () => void;
    dataWatcher(newValue: any): void;
    componentDidLoad(): void;
    defaultRender: TMemberRenderer<TMember>;
    render(): JSX.Element;
}
