import '../../stencil.core';
import { EventEmitter } from '@bearer/core';
export declare class BearerNavigatorBack {
    disabled: boolean;
    navigatorGoBack: EventEmitter;
    back: () => void;
    render(): JSX.Element;
}
