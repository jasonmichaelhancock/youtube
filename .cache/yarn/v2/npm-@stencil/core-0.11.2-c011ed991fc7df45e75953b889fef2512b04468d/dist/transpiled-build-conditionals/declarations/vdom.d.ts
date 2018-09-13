import * as d from '.';
export interface Hyperscript {
    (sel: any): VNode;
    (sel: Node, data: VNodeData): VNode;
    (sel: any, data: VNodeData): VNode;
    (sel: any, text: string): VNode;
    (sel: any, children: Array<VNode | undefined | null>): VNode;
    (sel: any, data: VNodeData, text: string): VNode;
    (sel: any, data: VNodeData, children: Array<VNode | undefined | null>): VNode;
    (sel: any, data: VNodeData, children: VNode): VNode;
}
declare global {
    var h: Hyperscript;
}
export interface VNode {
    vtag?: string | number | Function;
    vkey?: string | number;
    vtext?: string;
    vchildren?: VNode[];
    vattrs?: any;
    vname?: string;
    elm?: d.RenderNode;
    ishost?: boolean;
    isSlotFallback?: boolean;
    isSlotReference?: boolean;
}
export interface VNodeData {
    class?: {
        [className: string]: boolean;
    };
    style?: any;
    [attrName: string]: any;
}
export interface ChildNode {
    vtag?: string | number | Function;
    vkey?: string | number;
    vtext?: string;
    vchildren?: d.VNode[];
    vattrs?: any;
    vname?: string;
}
export declare type PropsType = VNodeProdData | number | string | null;
export declare type ChildType = VNode | number | string;
export interface ComponentProps {
    children?: d.VNode[];
    key?: string | number | any;
}
export interface FunctionalUtilities {
    forEach: (children: d.VNode[], cb: (vnode: d.VNode) => void) => void;
    map: (children: d.VNode[], cb: (vnode: ChildNode) => ChildNode) => d.VNode[];
}
export interface FunctionalComponent<PropsType = {}> {
    (props?: PropsType & ComponentProps, utils?: FunctionalUtilities): VNode | VNode[];
}
/**
 * used by production compiler
 */
export interface VNodeProdData {
    key?: string | number;
    class?: {
        [className: string]: boolean;
    } | string;
    className?: {
        [className: string]: boolean;
    } | string;
    style?: any;
    [key: string]: any;
}
