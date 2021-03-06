'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var fs = require('fs');
var ts = require('typescript');

/**
 * Production h() function based on Preact by
 * Jason Miller (@developit)
 * Licensed under the MIT License
 * https://github.com/developit/preact/blob/master/LICENSE
 *
 * Modified for Stencil's compiler and vdom
 */
const stack = [];
function h(nodeName, vnodeData) {
    let children = null;
    let lastSimple = false;
    let simple = false;
    for (var i = arguments.length; i-- > 2;) {
        stack.push(arguments[i]);
    }
    while (stack.length > 0) {
        let child = stack.pop();
        if (child && child.pop !== undefined) {
            for (i = child.length; i--;) {
                stack.push(child[i]);
            }
        }
        else {
            if (typeof child === 'boolean') {
                child = null;
            }
            if ((simple = typeof nodeName !== 'function')) {
                if (child == null) {
                    child = '';
                }
                else if (typeof child === 'number') {
                    child = String(child);
                }
                else if (typeof child !== 'string') {
                    simple = false;
                }
            }
            if (simple && lastSimple) {
                children[children.length - 1].vtext += child;
            }
            else if (children === null) {
                children = [simple ? { vtext: child } : child];
            }
            else {
                children.push(simple ? { vtext: child } : child);
            }
            lastSimple = simple;
        }
    }
    let vkey;
    let vname;
    if (vnodeData != null) {
        // normalize class / classname attributes
        if (vnodeData['className']) {
            vnodeData['class'] = vnodeData['className'];
        }
        if (typeof vnodeData['class'] === 'object') {
            for (i in vnodeData['class']) {
                if (vnodeData['class'][i]) {
                    stack.push(i);
                }
            }
            vnodeData['class'] = stack.join(' ');
            stack.length = 0;
        }
        if (vnodeData.key != null) {
            vkey = vnodeData.key;
        }
        if (vnodeData.name != null) {
            vname = vnodeData.name;
        }
    }
    if (typeof nodeName === 'function') {
        // nodeName is a functional component
        return nodeName(Object.assign({}, vnodeData, { children: children }), utils);
    }
    return {
        vtag: nodeName,
        vchildren: children,
        vtext: undefined,
        vattrs: vnodeData,
        vkey: vkey,
        vname: vname,
        elm: undefined,
        ishost: false
    };
}
function childToVNode(child) {
    return {
        vtag: child['vtag'],
        vchildren: child['vchildren'],
        vtext: child['vtext'],
        vattrs: child['vattrs'],
        vkey: child['vkey'],
        vname: child['vname']
    };
}
function VNodeToChild(vnode) {
    return {
        'vtag': vnode.vtag,
        'vchildren': vnode.vchildren,
        'vtext': vnode.vtext,
        'vattrs': vnode.vattrs,
        'vkey': vnode.vkey,
        'vname': vnode.vname
    };
}
const utils = {
    'forEach': (children, cb) => {
        children.forEach((item) => cb(VNodeToChild(item)));
    },
    'map': (children, cb) => {
        return children.map((item) => childToVNode(cb(VNodeToChild(item))));
    }
};

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Cache {
    constructor(config, cacheFs) {
        this.config = config;
        this.cacheFs = cacheFs;
        this.failed = 0;
        this.skip = false;
    }
    initCacheDir() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config._isTesting) {
                return;
            }
            if (!this.config.enableCache) {
                this.config.logger.info(`cache optimizations disabled`);
                this.clearDiskCache();
                return;
            }
            this.config.logger.debug(`cache enabled, cacheDir: ${this.config.cacheDir}`);
            try {
                const readmeFilePath = this.config.sys.path.join(this.config.cacheDir, '_README.log');
                yield this.cacheFs.writeFile(readmeFilePath, CACHE_DIR_README);
            }
            catch (e) {
                this.config.logger.error(`Cache, initCacheDir: ${e}`);
                this.config.enableCache = false;
            }
        });
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.enableCache || this.skip) {
                return null;
            }
            if (this.failed >= MAX_FAILED) {
                if (!this.skip) {
                    this.skip = true;
                    this.config.logger.debug(`cache had ${this.failed} failed ops, skip disk ops for remander of build`);
                }
                return null;
            }
            let result;
            try {
                result = yield this.cacheFs.readFile(this.getCacheFilePath(key));
                this.failed = 0;
                this.skip = false;
            }
            catch (e) {
                this.failed++;
                result = null;
            }
            return result;
        });
    }
    put(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.enableCache) {
                return false;
            }
            let result;
            try {
                yield this.cacheFs.writeFile(this.getCacheFilePath(key), value);
                result = true;
            }
            catch (e) {
                this.failed++;
                result = false;
            }
            return result;
        });
    }
    createKey(domain, ...args) {
        if (!this.config.enableCache) {
            return '';
        }
        return domain + '_' + this.config.sys.generateContentHash(JSON.stringify(args), 32);
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config.enableCache) {
                this.skip = false;
                this.failed = 0;
                yield this.cacheFs.commit();
                yield this.clearExpiredCache();
            }
        });
    }
    clear() {
        this.cacheFs.clearCache();
    }
    clearExpiredCache() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            const lastClear = yield this.config.sys.storage.get(EXP_STORAGE_KEY);
            if (lastClear != null) {
                const diff = now - lastClear;
                if (diff < ONE_DAY) {
                    return;
                }
                const fs$$1 = this.cacheFs.disk;
                const cachedFileNames = yield fs$$1.readdirSync(this.config.cacheDir);
                const cachedFilePaths = cachedFileNames.map(f => this.config.sys.path.join(this.config.cacheDir, f));
                let totalCleared = 0;
                const promises = cachedFilePaths.map((filePath) => __awaiter(this, void 0, void 0, function* () {
                    const stat = yield fs$$1.stat(filePath);
                    const lastModified = stat.mtime.getTime();
                    const diff = now - lastModified;
                    if (diff > ONE_WEEK) {
                        yield fs$$1.unlink(filePath);
                        totalCleared++;
                    }
                }));
                yield Promise.all(promises);
                this.config.logger.debug(`clearExpiredCache, cachedFileNames: ${cachedFileNames.length}, totalCleared: ${totalCleared}`);
            }
            this.config.logger.debug(`clearExpiredCache, set last clear`);
            yield this.config.sys.storage.set(EXP_STORAGE_KEY, now);
        });
    }
    clearDiskCache() {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.cacheFs.access(this.config.cacheDir)) {
                yield this.cacheFs.remove(this.config.cacheDir);
                yield this.cacheFs.commit();
            }
        });
    }
    getCacheFilePath(key) {
        return this.config.sys.path.join(this.config.cacheDir, key) + '.log';
    }
    getMemoryStats() {
        return this.cacheFs.getMemoryStats();
    }
}
const MAX_FAILED = 100;
const ONE_DAY = 1000 * 60 * 60 * 24;
const ONE_WEEK = ONE_DAY * 7;
const EXP_STORAGE_KEY = `last_clear_expired_cache`;
const CACHE_DIR_README = `# Stencil Cache Directory

This directory contains files which the compiler has
cached for faster builds. To disable caching, please set
"enableCache: false" within the stencil.config.js file.

To change the cache directory, please update the
"cacheDir" property within the stencil.config.js file.
`;

/**
 * SSR Attribute Names
 */
const SSR_VNODE_ID = 'ssrv';
const SSR_CHILD_ID = 'ssrc';
/**
 * Default style mode id
 */
const DEFAULT_STYLE_MODE = '$';
/**
 * Reusable empty obj/array
 * Don't add values to these!!
 */
const EMPTY_OBJ = {};
/**
 * Key Name to Key Code Map
 */
const KEY_CODE_MAP = {
    'enter': 13,
    'escape': 27,
    'space': 32,
    'tab': 9,
    'left': 37,
    'up': 38,
    'right': 39,
    'down': 40
};
/**
 * File names and value
 */
const BANNER = `Built with http://stenciljs.com`;

const isDef = (v) => v != null;
const toLowerCase = (str) => str.toLowerCase();
const toDashCase = (str) => toLowerCase(str.replace(/([A-Z0-9])/g, g => ' ' + g[0]).trim().replace(/ /g, '-'));
const dashToPascalCase = (str) => toLowerCase(str).split('-').map(segment => segment.charAt(0).toUpperCase() + segment.slice(1)).join('');
const noop = () => { };
const pluck = (obj, keys) => {
    return keys.reduce((final, key) => {
        if (obj[key]) {
            final[key] = obj[key];
        }
        return final;
    }, {});
};
const isObject = (val) => {
    return val != null && typeof val === 'object' && Array.isArray(val) === false;
};

function createDomApi(App, win, doc) {
    // using the $ prefix so that closure is
    // cool with property renaming each of these
    if (!App.ael) {
        App.ael = (elm, eventName, cb, opts) => elm.addEventListener(eventName, cb, opts);
        App.rel = (elm, eventName, cb, opts) => elm.removeEventListener(eventName, cb, opts);
    }
    const unregisterListenerFns = new WeakMap();
    const domApi = {
        $doc: doc,
        $supportsEventOptions: false,
        $nodeType: (node) => node.nodeType,
        $createElement: (tagName) => doc.createElement(tagName),
        $createElementNS: (namespace, tagName) => doc.createElementNS(namespace, tagName),
        $createTextNode: (text) => doc.createTextNode(text),
        $createComment: (data) => doc.createComment(data),
        $insertBefore: (parentNode, childNode, referenceNode) => parentNode.insertBefore(childNode, referenceNode),
        // https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove
        // and it's polyfilled in es5 builds
        $remove: (node) => node.remove(),
        $appendChild: (parentNode, childNode) => parentNode.appendChild(childNode),
        $addClass: (elm, cssClass) => elm.classList.add(cssClass),
        $childNodes: (node) => node.childNodes,
        $parentNode: (node) => node.parentNode,
        $nextSibling: (node) => node.nextSibling,
        $previousSibling: (node) => node.previousSibling,
        $tagName: (elm) => toLowerCase(elm.nodeName),
        $getTextContent: (node) => node.textContent,
        $setTextContent: (node, text) => node.textContent = text,
        $getAttribute: (elm, key) => elm.getAttribute(key),
        $setAttribute: (elm, key, val) => elm.setAttribute(key, val),
        $setAttributeNS: (elm, namespaceURI, qualifiedName, val) => elm.setAttributeNS(namespaceURI, qualifiedName, val),
        $removeAttribute: (elm, key) => elm.removeAttribute(key),
        $hasAttribute: (elm, key) => elm.hasAttribute(key),
        $getMode: (elm) => elm.getAttribute('mode') || (App.Context || {}).mode,
        $elementRef: (elm, referenceName) => {
            if (referenceName === 'child') {
                return elm.firstElementChild;
            }
            if (referenceName === 'parent') {
                return domApi.$parentElement(elm);
            }
            if (referenceName === 'body') {
                return doc.body;
            }
            if (referenceName === 'document') {
                return doc;
            }
            if (referenceName === 'window') {
                return win;
            }
            return elm;
        },
        $addEventListener: (assignerElm, eventName, listenerCallback, useCapture, usePassive, attachTo, eventListenerOpts, splt) => {
            // remember the original name before we possibly change it
            const assignersEventName = eventName;
            let attachToElm = assignerElm;
            // get the existing unregister listeners for
            // this element from the unregister listeners weakmap
            let assignersUnregListeners = unregisterListenerFns.get(assignerElm);
            if (assignersUnregListeners && assignersUnregListeners[assignersEventName]) {
                // removed any existing listeners for this event for the assigner element
                // this element already has this listener, so let's unregister it now
                assignersUnregListeners[assignersEventName]();
            }
            if (typeof attachTo === 'string') {
                // attachTo is a string, and is probably something like
                // "parent", "window", or "document"
                // and the eventName would be like "mouseover" or "mousemove"
                attachToElm = domApi.$elementRef(assignerElm, attachTo);
            }
            else if (typeof attachTo === 'object') {
                // we were passed in an actual element to attach to
                attachToElm = attachTo;
            }
            else {
                // depending on the event name, we could actually be attaching
                // this element to something like the document or window
                splt = eventName.split(':');
                if (splt.length > 1) {
                    // document:mousemove
                    // parent:touchend
                    // body:keyup.enter
                    attachToElm = domApi.$elementRef(assignerElm, splt[0]);
                    eventName = splt[1];
                }
            }
            if (!attachToElm) {
                // somehow we're referencing an element that doesn't exist
                // let's not continue
                return;
            }
            let eventListener = listenerCallback;
            // test to see if we're looking for an exact keycode
            splt = eventName.split('.');
            if (splt.length > 1) {
                // looks like this listener is also looking for a keycode
                // keyup.enter
                eventName = splt[0];
                eventListener = (ev) => {
                    // wrap the user's event listener with our own check to test
                    // if this keyboard event has the keycode they're looking for
                    if (ev.keyCode === KEY_CODE_MAP[splt[1]]) {
                        listenerCallback(ev);
                    }
                };
            }
            // create the actual event listener options to use
            // this browser may not support event options
            eventListenerOpts = domApi.$supportsEventOptions ? {
                capture: !!useCapture,
                passive: !!usePassive
            } : !!useCapture;
            // ok, good to go, let's add the actual listener to the dom element
            App.ael(attachToElm, eventName, eventListener, eventListenerOpts);
            if (!assignersUnregListeners) {
                // we don't already have a collection, let's create it
                unregisterListenerFns.set(assignerElm, assignersUnregListeners = {});
            }
            // add the unregister listener to this element's collection
            assignersUnregListeners[assignersEventName] = () => {
                // looks like it's time to say goodbye
                attachToElm && App.rel(attachToElm, eventName, eventListener, eventListenerOpts);
                assignersUnregListeners[assignersEventName] = null;
            };
        },
        $removeEventListener: (elm, eventName) => {
            // get the unregister listener functions for this element
            const assignersUnregListeners = unregisterListenerFns.get(elm);
            if (assignersUnregListeners) {
                // this element has unregister listeners
                if (eventName) {
                    // passed in one specific event name to remove
                    assignersUnregListeners[eventName] && assignersUnregListeners[eventName]();
                }
                else {
                    // remove all event listeners
                    Object.keys(assignersUnregListeners).forEach(assignersEventName => {
                        assignersUnregListeners[assignersEventName] && assignersUnregListeners[assignersEventName]();
                    });
                }
            }
        }
    };
    {
        domApi.$attachShadow = (elm, shadowRootInit) => elm.attachShadow(shadowRootInit);
        domApi.$supportsShadowDom = !!domApi.$doc.documentElement.attachShadow;
        {
            if (win.location.search.indexOf('shadow=false') > 0) {
                // by adding ?shadow=false it'll force the slot polyfill
                // only add this check when in dev mode
                domApi.$supportsShadowDom = false;
            }
        }
    }
    domApi.$dispatchEvent = (elm, eventName, data) => elm && elm.dispatchEvent(new win.CustomEvent(eventName, data));
    {
        // test if this browser supports event options or not
        try {
            win.addEventListener('e', null, Object.defineProperty({}, 'passive', {
                get: () => domApi.$supportsEventOptions = true
            }));
        }
        catch (e) { }
    }
    domApi.$parentElement = (elm, parentNode) => 
    // if the parent node is a document fragment (shadow root)
    // then use the "host" property on it
    // otherwise use the parent node
    ((parentNode = domApi.$parentNode(elm)) && domApi.$nodeType(parentNode) === 11 /* DocumentFragment */) ? parentNode.host : parentNode;
    return domApi;
}

function createQueueServer() {
    const highPriority = [];
    const domReads = [];
    const domWrites = [];
    let queued = false;
    function flush(cb) {
        while (highPriority.length > 0) {
            highPriority.shift()(0);
        }
        while (domReads.length > 0) {
            domReads.shift()(0);
        }
        while (domWrites.length > 0) {
            domWrites.shift()(0);
        }
        queued = (highPriority.length > 0) || (domReads.length > 0) || (domWrites.length > 0);
        if (queued) {
            process.nextTick(flush);
        }
        cb && cb();
    }
    function clear() {
        highPriority.length = 0;
        domReads.length = 0;
        domWrites.length = 0;
    }
    return {
        tick: (cb) => {
            // queue high priority work to happen in next tick
            // uses Promise.resolve() for next tick
            highPriority.push(cb);
            if (!queued) {
                queued = true;
                process.nextTick(flush);
            }
        },
        read: (cb) => {
            // queue dom reads
            domReads.push(cb);
            if (!queued) {
                queued = true;
                process.nextTick(flush);
            }
        },
        write: (cb) => {
            // queue dom writes
            domWrites.push(cb);
            if (!queued) {
                queued = true;
                process.nextTick(flush);
            }
        },
        flush: flush,
        clear: clear
    };
}

function parsePropertyValue(propType, propValue) {
    // ensure this value is of the correct prop type
    // we're testing both formats of the "propType" value because
    // we could have either gotten the data from the attribute changed callback,
    // which wouldn't have Constructor data yet, and because this method is reused
    // within proxy where we don't have meta data, but only constructor data
    if (isDef(propValue) && typeof propValue !== 'object' && typeof propValue !== 'function') {
        if (propType === Boolean || propType === 3 /* Boolean */) {
            // per the HTML spec, any string value means it is a boolean true value
            // but we'll cheat here and say that the string "false" is the boolean false
            return (propValue === 'false' ? false : propValue === '' || !!propValue);
        }
        if (propType === Number || propType === 4 /* Number */) {
            // force it to be a number
            return parseFloat(propValue);
        }
        if (propType === String || propType === 2 /* String */) {
            // could have been passed as a number or boolean
            // but we still want it as a string
            return propValue.toString();
        }
    }
    // not sure exactly what type we want
    // so no need to change to a different type
    return propValue;
}

function initEventEmitters(plt, cmpEvents, instance) {
    if (cmpEvents) {
        const elm = plt.hostElementMap.get(instance);
        cmpEvents.forEach(eventMeta => {
            instance[eventMeta.method] = {
                emit: (data) => {
                    plt.emitEvent(elm, eventMeta.name, {
                        bubbles: eventMeta.bubbles,
                        composed: eventMeta.composed,
                        cancelable: eventMeta.cancelable,
                        detail: data
                    });
                }
            };
        });
    }
}

function proxyComponentInstance(plt, cmpConstructor, elm, instance, hostSnapshot, properties, memberName) {
    // at this point we've got a specific node of a host element, and created a component class instance
    // and we've already created getters/setters on both the host element and component class prototypes
    // let's upgrade any data that might have been set on the host element already
    // and let's have the getters/setters kick in and do their jobs
    // let's automatically add a reference to the host element on the instance
    plt.hostElementMap.set(instance, elm);
    // create the values object if it doesn't already exist
    // this will hold all of the internal getter/setter values
    if (!plt.valuesMap.has(elm)) {
        plt.valuesMap.set(elm, {});
    }
    // get the properties from the constructor
    // and add default "mode" and "color" properties
    properties = Object.assign({
        color: { type: String }
    }, cmpConstructor.properties);
    // always set mode
    properties.mode = { type: String };
    // define each of the members and initialize what their role is
    for (memberName in properties) {
        defineMember(plt, properties[memberName], elm, instance, memberName, hostSnapshot);
    }
}

function initComponentInstance(plt, elm, hostSnapshot, instance, componentConstructor, queuedEvents, i) {
    try {
        // using the user's component class, let's create a new instance
        componentConstructor = plt.getComponentMeta(elm).componentConstructor;
        instance = new componentConstructor();
        // ok cool, we've got an host element now, and a actual instance
        // and there were no errors creating the instance
        // let's upgrade the data on the host element
        // and let the getters/setters do their jobs
        proxyComponentInstance(plt, componentConstructor, elm, instance, hostSnapshot);
        {
            // add each of the event emitters which wire up instance methods
            // to fire off dom events from the host element
            initEventEmitters(plt, componentConstructor.events, instance);
        }
        {
            try {
                // replay any event listeners on the instance that
                // were queued up between the time the element was
                // connected and before the instance was ready
                queuedEvents = plt.queuedEvents.get(elm);
                if (queuedEvents) {
                    // events may have already fired before the instance was even ready
                    // now that the instance is ready, let's replay all of the events that
                    // we queued up earlier that were originally meant for the instance
                    for (i = 0; i < queuedEvents.length; i += 2) {
                        // data was added in sets of two
                        // first item the eventMethodName
                        // second item is the event data
                        // take a look at initElementListener()
                        instance[queuedEvents[i]](queuedEvents[i + 1]);
                    }
                    plt.queuedEvents.delete(elm);
                }
            }
            catch (e) {
                plt.onError(e, 2 /* QueueEventsError */, elm);
            }
        }
    }
    catch (e) {
        // something done went wrong trying to create a component instance
        // create a dumby instance so other stuff can load
        // but chances are the app isn't fully working cuz this component has issues
        instance = {};
        plt.onError(e, 7 /* InitInstanceError */, elm, true);
    }
    plt.instanceMap.set(elm, instance);
    return instance;
}
function initComponentLoaded(plt, elm, hydratedCssClass, instance, onReadyCallbacks) {
    // all is good, this component has been told it's time to finish loading
    // it's possible that we've already decided to destroy this element
    // check if this element has any actively loading child elements
    if (!plt.hasLoadedMap.has(elm) &&
        (instance = plt.instanceMap.get(elm)) &&
        !plt.isDisconnectedMap.has(elm) &&
        (!elm['s-ld'] || !elm['s-ld'].length)) {
        // cool, so at this point this element isn't already being destroyed
        // and it does not have any child elements that are still loading
        // ensure we remove any child references cuz it doesn't matter at this point
        delete elm['s-ld'];
        // sweet, this particular element is good to go
        // all of this element's children have loaded (if any)
        // elm._hasLoaded = true;
        plt.hasLoadedMap.set(elm, true);
        try {
            // fire off the ref if it exists
            callNodeRefs(plt.vnodeMap.get(elm));
            // fire off the user's elm.componentOnReady() callbacks that were
            // put directly on the element (well before anything was ready)
            if (onReadyCallbacks = plt.onReadyCallbacksMap.get(elm)) {
                onReadyCallbacks.forEach(cb => cb(elm));
                plt.onReadyCallbacksMap.delete(elm);
            }
            {
                // fire off the user's componentDidLoad method (if one was provided)
                // componentDidLoad only runs ONCE, after the instance's element has been
                // assigned as the host element, and AFTER render() has been called
                // we'll also fire this method off on the element, just to
                instance.componentDidLoad && instance.componentDidLoad();
            }
        }
        catch (e) {
            plt.onError(e, 4 /* DidLoadError */, elm);
        }
        // add the css class that this element has officially hydrated
        plt.domApi.$addClass(elm, hydratedCssClass);
        // ( •_•)
        // ( •_•)>⌐■-■
        // (⌐■_■)
        // load events fire from bottom to top
        // the deepest elements load first then bubbles up
        propagateComponentLoaded(plt, elm);
    }
}
function propagateComponentLoaded(plt, elm, index, ancestorsActivelyLoadingChildren) {
    // load events fire from bottom to top
    // the deepest elements load first then bubbles up
    const ancestorHostElement = plt.ancestorHostElementMap.get(elm);
    if (ancestorHostElement) {
        // ok so this element already has a known ancestor host element
        // let's make sure we remove this element from its ancestor's
        // known list of child elements which are actively loading
        ancestorsActivelyLoadingChildren = ancestorHostElement['s-ld'] || ancestorHostElement['$activeLoading'];
        if (ancestorsActivelyLoadingChildren) {
            index = ancestorsActivelyLoadingChildren.indexOf(elm);
            if (index > -1) {
                // yup, this element is in the list of child elements to wait on
                // remove it so we can work to get the length down to 0
                ancestorsActivelyLoadingChildren.splice(index, 1);
            }
            // the ancestor's initLoad method will do the actual checks
            // to see if the ancestor is actually loaded or not
            // then let's call the ancestor's initLoad method if there's no length
            // (which actually ends up as this method again but for the ancestor)
            if (!ancestorsActivelyLoadingChildren.length) {
                ancestorHostElement['s-init'] && ancestorHostElement['s-init']();
                // $initLoad deprecated 2018-04-02
                ancestorHostElement['$initLoad'] && ancestorHostElement['$initLoad']();
            }
        }
        plt.ancestorHostElementMap.delete(elm);
    }
}

function getScopeId(cmpMeta, mode) {
    return ('sc-' + cmpMeta.tagNameMeta) + ((mode && mode !== DEFAULT_STYLE_MODE) ? '-' + mode : '');
}
function getElementScopeId(scopeId, isHostElement) {
    return scopeId + (isHostElement ? '-h' : '-s');
}

function render(plt, cmpMeta, hostElm, instance) {
    try {
        // if this component has a render function, let's fire
        // it off and generate the child vnodes for this host element
        // note that we do not create the host element cuz it already exists
        const hostMeta = cmpMeta.componentConstructor.host;
        const encapsulation = cmpMeta.componentConstructor.encapsulation;
        // test if this component should be shadow dom
        // and if so does the browser supports it
        const useNativeShadowDom = (encapsulation === 'shadow' && plt.domApi.$supportsShadowDom);
        let reflectHostAttr;
        let rootElm;
        {
            reflectHostAttr = reflectInstanceValuesToHostAttributes(cmpMeta.componentConstructor.properties, instance);
        }
        if (useNativeShadowDom) {
            // this component SHOULD use native slot/shadow dom
            // this browser DOES support native shadow dom
            // and this is the first render
            // let's create that shadow root
            {
                rootElm = hostElm.shadowRoot;
            }
        }
        else {
            // not using, or can't use shadow dom
            // set the root element, which will be the shadow root when enabled
            rootElm = hostElm;
        }
        if (!hostElm['s-rn']) {
            // attach the styles this component needs, if any
            // this fn figures out if the styles should go in a
            // shadow root or if they should be global
            plt.attachStyles(plt, plt.domApi, cmpMeta, hostElm);
            // if no render function
            const scopeId = hostElm['s-sc'];
            if (scopeId) {
                plt.domApi.$addClass(hostElm, getElementScopeId(scopeId, true));
                if (!instance.render) {
                    plt.domApi.$addClass(hostElm, getElementScopeId(scopeId));
                }
            }
        }
        if (instance.render || instance.hostData || hostMeta || reflectHostAttr) {
            // tell the platform we're actively rendering
            // if a value is changed within a render() then
            // this tells the platform not to queue the change
            plt.activeRender = true;
            const vnodeChildren = instance.render && instance.render();
            let vnodeHostData;
            {
                // user component provided a "hostData()" method
                // the returned data/attributes are used on the host element
                vnodeHostData = instance.hostData && instance.hostData();
                {
                    if (vnodeHostData && cmpMeta.membersMeta) {
                        const foundHostKeys = Object.keys(vnodeHostData).reduce((err, k) => {
                            if (cmpMeta.membersMeta[k]) {
                                return err.concat(k);
                            }
                            if (cmpMeta.membersMeta[dashToPascalCase(k)]) {
                                return err.concat(dashToPascalCase(k));
                            }
                            return err;
                        }, []);
                        if (foundHostKeys.length > 0) {
                            throw new Error(`The following keys were attempted to be set with hostData() from the ` +
                                `${cmpMeta.tagNameMeta} component: ${foundHostKeys.join(', ')}. ` +
                                `If you would like to modify these please set @Prop({ mutable: true, reflectToAttr: true}) ` +
                                `on the @Prop() decorator.`);
                        }
                    }
                }
            }
            if (reflectHostAttr) {
                vnodeHostData = vnodeHostData ? Object.assign(vnodeHostData, reflectHostAttr) : reflectHostAttr;
            }
            // tell the platform we're done rendering
            // now any changes will again queue
            plt.activeRender = false;
            if (hostMeta) {
                // component meta data has a "theme"
                // use this to automatically generate a good css class
                // from the mode and color to add to the host element
                vnodeHostData = applyComponentHostData(vnodeHostData, hostMeta, instance);
            }
            // looks like we've got child nodes to render into this host element
            // or we need to update the css class/attrs on the host element
            // if we haven't already created a vnode, then we give the renderer the actual element
            // if this is a re-render, then give the renderer the last vnode we already created
            const oldVNode = plt.vnodeMap.get(hostElm) || {};
            oldVNode.elm = rootElm;
            const hostVNode = h(null, vnodeHostData, vnodeChildren);
            {
                // only care if we're reflecting values to the host element
                hostVNode.ishost = true;
            }
            // each patch always gets a new vnode
            // the host element itself isn't patched because it already exists
            // kick off the actual render and any DOM updates
            plt.vnodeMap.set(hostElm, plt.render(hostElm, oldVNode, hostVNode, useNativeShadowDom, encapsulation));
        }
        // update styles!
        if (plt.customStyle) {
            plt.customStyle.updateHost(hostElm);
        }
        // it's official, this element has rendered
        hostElm['s-rn'] = true;
        if (hostElm['$onRender']) {
            // $onRender deprecated 2018-04-02
            hostElm['s-rc'] = hostElm['$onRender'];
        }
        if (hostElm['s-rc']) {
            // ok, so turns out there are some child host elements
            // waiting on this parent element to load
            // let's fire off all update callbacks waiting
            hostElm['s-rc'].forEach(cb => cb());
            hostElm['s-rc'] = null;
        }
    }
    catch (e) {
        plt.activeRender = false;
        plt.onError(e, 8 /* RenderError */, hostElm, true);
    }
}
function applyComponentHostData(vnodeHostData, hostMeta, instance) {
    vnodeHostData = vnodeHostData || {};
    // component meta data has a "theme"
    // use this to automatically generate a good css class
    // from the mode and color to add to the host element
    Object.keys(hostMeta).forEach(key => {
        if (key === 'theme') {
            // host: { theme: 'button' }
            // adds css classes w/ mode and color combinations
            // class="button button-md button-primary button-md-primary"
            convertCssNamesToObj(vnodeHostData['class'] = vnodeHostData['class'] || {}, hostMeta[key], instance.mode, instance.color);
        }
        else if (key === 'class') {
            // host: { class: 'multiple css-classes' }
            // class="multiple css-classes"
            convertCssNamesToObj(vnodeHostData[key] = vnodeHostData[key] || {}, hostMeta[key]);
        }
        else {
            // rando attribute/properties
            vnodeHostData[key] = hostMeta[key];
        }
    });
    return vnodeHostData;
}
function convertCssNamesToObj(cssClassObj, className, mode, color) {
    className.split(' ').forEach(cssClass => {
        cssClassObj[cssClass] = true;
        if (mode) {
            cssClassObj[`${cssClass}-${mode}`] = true;
            if (color) {
                cssClassObj[`${cssClass}-${mode}-${color}`] = cssClassObj[`${cssClass}-${color}`] = true;
            }
        }
    });
}
function reflectInstanceValuesToHostAttributes(properties, instance, reflectHostAttr) {
    if (properties) {
        Object.keys(properties).forEach(memberName => {
            if (properties[memberName].reflectToAttr) {
                reflectHostAttr = reflectHostAttr || {};
                reflectHostAttr[memberName] = instance[memberName];
            }
        });
    }
    return reflectHostAttr;
}

function queueUpdate(plt, elm) {
    // only run patch if it isn't queued already
    if (!plt.isQueuedForUpdate.has(elm)) {
        plt.isQueuedForUpdate.set(elm, true);
        // run the patch in the next tick
        // vdom diff and patch the host element for differences
        if (plt.isAppLoaded) {
            // app has already loaded
            // let's queue this work in the dom write phase
            plt.queue.write(() => update(plt, elm));
        }
        else {
            // app hasn't finished loading yet
            // so let's use next tick to do everything
            // as fast as possible
            plt.queue.tick(() => update(plt, elm));
        }
    }
}
function update(plt, elm, isInitialLoad, instance, ancestorHostElement, userPromise) {
    // no longer queued for update
    plt.isQueuedForUpdate.delete(elm);
    // everything is async, so somehow we could have already disconnected
    // this node, so be sure to do nothing if we've already disconnected
    if (!plt.isDisconnectedMap.has(elm)) {
        instance = plt.instanceMap.get(elm);
        isInitialLoad = !instance;
        if (isInitialLoad) {
            ancestorHostElement = plt.ancestorHostElementMap.get(elm);
            if (ancestorHostElement && ancestorHostElement['$rendered']) {
                // $rendered deprecated 2018-04-02
                ancestorHostElement['s-rn'] = true;
            }
            if (ancestorHostElement && !ancestorHostElement['s-rn']) {
                // this is the intial load
                // this element has an ancestor host element
                // but the ancestor host element has NOT rendered yet
                // so let's just cool our jets and wait for the ancestor to render
                (ancestorHostElement['s-rc'] = ancestorHostElement['s-rc'] || []).push(() => {
                    // this will get fired off when the ancestor host element
                    // finally gets around to rendering its lazy self
                    update(plt, elm);
                });
                // $onRender deprecated 2018-04-02
                ancestorHostElement['$onRender'] = ancestorHostElement['s-rc'];
                return;
            }
            // haven't created a component instance for this host element yet!
            // create the instance from the user's component class
            // https://www.youtube.com/watch?v=olLxrojmvMg
            instance = initComponentInstance(plt, elm, plt.hostSnapshotMap.get(elm));
            {
                // fire off the user's componentWillLoad method (if one was provided)
                // componentWillLoad only runs ONCE, after instance's element has been
                // assigned as the host element, but BEFORE render() has been called
                try {
                    if (instance.componentWillLoad) {
                        userPromise = instance.componentWillLoad();
                    }
                }
                catch (e) {
                    plt.onError(e, 3 /* WillLoadError */, elm);
                }
            }
        }
        else {
            // already created an instance and this is an update
            // fire off the user's componentWillUpdate method (if one was provided)
            // componentWillUpdate runs BEFORE render() has been called
            // but only BEFORE an UPDATE and not before the intial render
            // get the returned promise (if one was provided)
            try {
                if (instance.componentWillUpdate) {
                    userPromise = instance.componentWillUpdate();
                }
            }
            catch (e) {
                plt.onError(e, 5 /* WillUpdateError */, elm);
            }
        }
        if (userPromise && userPromise.then) {
            // looks like the user return a promise!
            // let's not actually kick off the render
            // until the user has resolved their promise
            userPromise.then(() => renderUpdate(plt, elm, instance, isInitialLoad));
        }
        else {
            // user never returned a promise so there's
            // no need to wait on anything, let's do the render now my friend
            renderUpdate(plt, elm, instance, isInitialLoad);
        }
    }
}
function renderUpdate(plt, elm, instance, isInitialLoad) {
    // if this component has a render function, let's fire
    // it off and generate a vnode for this
    render(plt, plt.getComponentMeta(elm), elm, instance);
    try {
        if (isInitialLoad) {
            // so this was the initial load i guess
            elm['s-init']();
            // componentDidLoad just fired off
        }
        else {
            {
                // fire off the user's componentDidUpdate method (if one was provided)
                // componentDidUpdate runs AFTER render() has been called
                // but only AFTER an UPDATE and not after the intial render
                instance.componentDidUpdate && instance.componentDidUpdate();
            }
            callNodeRefs(plt.vnodeMap.get(elm));
        }
        {
            elm['s-hmr-load'] && elm['s-hmr-load']();
        }
    }
    catch (e) {
        // derp
        plt.onError(e, 6 /* DidUpdateError */, elm, true);
    }
}

function defineMember(plt, property, elm, instance, memberName, hostSnapshot, hostAttributes, hostAttrValue) {
    function getComponentProp(values) {
        // component instance prop/state getter
        // get the property value directly from our internal values
        values = plt.valuesMap.get(plt.hostElementMap.get(this));
        return values && values[memberName];
    }
    function setComponentProp(newValue, elm) {
        // component instance prop/state setter (cannot be arrow fn)
        elm = plt.hostElementMap.get(this);
        if (elm) {
            if (property.state || property.mutable) {
                setValue(plt, elm, memberName, newValue);
            }
            else {
                console.warn(`@Prop() "${memberName}" on "${elm.tagName}" cannot be modified.`);
            }
        }
    }
    if (property.type || property.state) {
        const values = plt.valuesMap.get(elm);
        if (!property.state) {
            if (property.attr && (values[memberName] === undefined || values[memberName] === '')) {
                // check the prop value from the host element attribute
                if ((hostAttributes = hostSnapshot && hostSnapshot.$attributes) && isDef(hostAttrValue = hostAttributes[property.attr])) {
                    // looks like we've got an attribute value
                    // let's set it to our internal values
                    values[memberName] = parsePropertyValue(property.type, hostAttrValue);
                }
            }
            {
                // server-side
                // server-side elm has the getter/setter
                // on the actual element instance, not its prototype
                // on the server we cannot accurately use "hasOwnProperty"
                // instead we'll do a direct lookup to see if the
                // constructor has this property
                if (elementHasProperty(plt, elm, memberName)) {
                    // @Prop or @Prop({mutable:true})
                    // property values on the host element should override
                    // any default values on the component instance
                    if (values[memberName] === undefined) {
                        values[memberName] = elm[memberName];
                    }
                }
            }
        }
        if (instance.hasOwnProperty(memberName) && values[memberName] === undefined) {
            // @Prop() or @Prop({mutable:true}) or @State()
            // we haven't yet got a value from the above checks so let's
            // read any "own" property instance values already set
            // to our internal value as the source of getter data
            // we're about to define a property and it'll overwrite this "own" property
            values[memberName] = instance[memberName];
        }
        if (property.watchCallbacks) {
            values[WATCH_CB_PREFIX + memberName] = property.watchCallbacks.slice();
        }
        // add getter/setter to the component instance
        // these will be pointed to the internal data set from the above checks
        definePropertyGetterSetter(instance, memberName, getComponentProp, setComponentProp);
    }
    else if (property.elementRef) {
        // @Element()
        // add a getter to the element reference using
        // the member name the component meta provided
        definePropertyValue(instance, memberName, elm);
    }
    else if (property.method) {
        // @Method()
        // add a property "value" on the host element
        // which we'll bind to the instance's method
        definePropertyValue(elm, memberName, instance[memberName].bind(instance));
    }
    else if (property.context) {
        // @Prop({ context: 'config' })
        const contextObj = plt.getContextItem(property.context);
        if (contextObj !== undefined) {
            definePropertyValue(instance, memberName, (contextObj.getContext && contextObj.getContext(elm)) || contextObj);
        }
    }
    else if (property.connect) {
        // @Prop({ connect: 'ion-loading-ctrl' })
        definePropertyValue(instance, memberName, plt.propConnect(property.connect));
    }
}
function setValue(plt, elm, memberName, newVal, values, instance, watchMethods) {
    // get the internal values object, which should always come from the host element instance
    // create the _values object if it doesn't already exist
    values = plt.valuesMap.get(elm);
    if (!values) {
        plt.valuesMap.set(elm, values = {});
    }
    const oldVal = values[memberName];
    // check our new property value against our internal value
    if (newVal !== oldVal) {
        // gadzooks! the property's value has changed!!
        // set our new value!
        // https://youtu.be/dFtLONl4cNc?t=22
        values[memberName] = newVal;
        instance = plt.instanceMap.get(elm);
        if (instance) {
            // get an array of method names of watch functions to call
            watchMethods = values[WATCH_CB_PREFIX + memberName];
            if (watchMethods) {
                // this instance is watching for when this property changed
                for (let i = 0; i < watchMethods.length; i++) {
                    try {
                        // fire off each of the watch methods that are watching this property
                        instance[watchMethods[i]].call(instance, newVal, oldVal, memberName);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
            if (!plt.activeRender && elm['s-rn']) {
                // looks like this value actually changed, so we've got work to do!
                // but only if we've already rendered, otherwise just chill out
                // queue that we need to do an update, but don't worry about queuing
                // up millions cuz this function ensures it only runs once
                queueUpdate(plt, elm);
            }
        }
    }
}
function definePropertyValue(obj, propertyKey, value) {
    // minification shortcut
    Object.defineProperty(obj, propertyKey, {
        'configurable': true,
        'value': value
    });
}
function definePropertyGetterSetter(obj, propertyKey, get, set) {
    // minification shortcut
    Object.defineProperty(obj, propertyKey, {
        'configurable': true,
        'get': get,
        'set': set
    });
}
const WATCH_CB_PREFIX = `wc-`;
function elementHasProperty(plt, elm, memberName) {
    // within the browser, the element's prototype
    // already has its getter/setter set, but on the
    // server the prototype is shared causing issues
    // so instead the server's elm has the getter/setter
    // directly on the actual element instance, not its prototype
    // so at the time of this function being called, the server
    // side element is unaware if the element has this property
    // name. So for server-side only, do this trick below
    // don't worry, this runtime code doesn't show on the client
    let hasOwnProperty = elm.hasOwnProperty(memberName);
    if (!hasOwnProperty) {
        // element doesn't
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta) {
            if (cmpMeta.componentConstructor && cmpMeta.componentConstructor.properties) {
                // if we have the constructor property data, let's check that
                const member = cmpMeta.componentConstructor.properties[memberName];
                hasOwnProperty = !!(member && member.type);
            }
            if (!hasOwnProperty && cmpMeta.membersMeta) {
                // if we have the component's metadata, let's check that
                const member = cmpMeta.membersMeta[memberName];
                hasOwnProperty = !!(member && member.propType);
            }
        }
    }
    return hasOwnProperty;
}

function updateAttribute(elm, memberName, newValue, isBooleanAttr = typeof newValue === 'boolean') {
    const isXlinkNs = (memberName !== (memberName = memberName.replace(/^xlink\:?/, '')));
    if (newValue == null || (isBooleanAttr && (!newValue || newValue === 'false'))) {
        if (isXlinkNs) {
            elm.removeAttributeNS(XLINK_NS$1, toLowerCase(memberName));
        }
        else {
            elm.removeAttribute(memberName);
        }
    }
    else if (typeof newValue !== 'function') {
        if (isBooleanAttr) {
            newValue = '';
        }
        else {
            newValue = newValue.toString();
        }
        if (isXlinkNs) {
            elm.setAttributeNS(XLINK_NS$1, toLowerCase(memberName), newValue);
        }
        else {
            elm.setAttribute(memberName, newValue);
        }
    }
}
const XLINK_NS$1 = 'http://www.w3.org/1999/xlink';

function setAccessor(plt, elm, memberName, oldValue, newValue, isSvg, isHostElement) {
    if (memberName === 'class' && !isSvg) {
        // Class
        if (oldValue !== newValue) {
            const oldList = parseClassList(oldValue);
            const newList = parseClassList(newValue);
            // remove classes in oldList, not included in newList
            const toRemove = oldList.filter(item => !newList.includes(item));
            const classList = parseClassList(elm.className)
                .filter(item => !toRemove.includes(item));
            // add classes from newValue that are not in oldList or classList
            const toAdd = newList.filter(item => !oldList.includes(item) && !classList.includes(item));
            classList.push(...toAdd);
            elm.className = classList.join(' ');
        }
    }
    else if (memberName === 'style') {
        // update style attribute, css properties and values
        for (const prop in oldValue) {
            if (!newValue || newValue[prop] == null) {
                if (/-/.test(prop)) {
                    elm.style.removeProperty(prop);
                }
                else {
                    elm.style[prop] = '';
                }
            }
        }
        for (const prop in newValue) {
            if (!oldValue || newValue[prop] !== oldValue[prop]) {
                if (/-/.test(prop)) {
                    elm.style.setProperty(prop, newValue[prop]);
                }
                else {
                    elm.style[prop] = newValue[prop];
                }
            }
        }
    }
    else if ((memberName[0] === 'o' && memberName[1] === 'n' && /[A-Z]/.test(memberName[2])) && (!(memberName in elm))) {
        // Event Handlers
        // so if the member name starts with "on" and the 3rd characters is
        // a capital letter, and it's not already a member on the element,
        // then we're assuming it's an event listener
        if (toLowerCase(memberName) in elm) {
            // standard event
            // the JSX attribute could have been "onMouseOver" and the
            // member name "onmouseover" is on the element's prototype
            // so let's add the listener "mouseover", which is all lowercased
            memberName = toLowerCase(memberName.substring(2));
        }
        else {
            // custom event
            // the JSX attribute could have been "onMyCustomEvent"
            // so let's trim off the "on" prefix and lowercase the first character
            // and add the listener "myCustomEvent"
            // except for the first character, we keep the event name case
            memberName = toLowerCase(memberName[2]) + memberName.substring(3);
        }
        if (newValue) {
            if (newValue !== oldValue) {
                // add listener
                plt.domApi.$addEventListener(elm, memberName, newValue);
            }
        }
        else {
            // remove listener
            plt.domApi.$removeEventListener(elm, memberName);
        }
    }
    else if (memberName !== 'list' && memberName !== 'type' && !isSvg &&
        (memberName in elm || (['object', 'function'].indexOf(typeof newValue) !== -1) && newValue !== null)
        || (elementHasProperty(plt, elm, memberName))) {
        // Properties
        // - list and type are attributes that get applied as values on the element
        // - all svgs get values as attributes not props
        // - check if elm contains name or if the value is array, object, or function
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta && cmpMeta.membersMeta && cmpMeta.membersMeta[memberName]) {
            // we know for a fact that this element is a known component
            // and this component has this member name as a property,
            // let's set the known @Prop on this element
            // set it directly as property on the element
            setProperty(elm, memberName, newValue);
            if (isHostElement && cmpMeta.membersMeta[memberName].reflectToAttrib) {
                // we also want to set this data to the attribute
                updateAttribute(elm, cmpMeta.membersMeta[memberName].attribName, newValue, cmpMeta.membersMeta[memberName].propType === 3 /* Boolean */);
            }
        }
        else if (memberName !== 'ref') {
            // this member name is a property on this element, but it's not a component
            // this is a native property like "value" or something
            // also we can ignore the "ref" member name at this point
            setProperty(elm, memberName, newValue == null ? '' : newValue);
            if (newValue == null || newValue === false) {
                plt.domApi.$removeAttribute(elm, memberName);
            }
        }
    }
    else if (newValue != null && memberName !== 'key') {
        // Element Attributes
        updateAttribute(elm, memberName, newValue);
    }
    else if (isSvg || plt.domApi.$hasAttribute(elm, memberName) && (newValue == null || newValue === false)) {
        // remove svg attribute
        plt.domApi.$removeAttribute(elm, memberName);
    }
}
function parseClassList(value) {
    return (value == null || value === '') ? [] : value.trim().split(/\s+/);
}
/**
 * Attempt to set a DOM property to the given value.
 * IE & FF throw for certain property-value combinations.
 */
function setProperty(elm, name, value) {
    try {
        elm[name] = value;
    }
    catch (e) { }
}

function updateElement(plt, oldVnode, newVnode, isSvgMode, memberName) {
    // if the element passed in is a shadow root, which is a document fragment
    // then we want to be adding attrs/props to the shadow root's "host" element
    // if it's not a shadow root, then we add attrs/props to the same element
    const elm = (newVnode.elm.nodeType === 11 /* DocumentFragment */ && newVnode.elm.host) ? newVnode.elm.host : newVnode.elm;
    const oldVnodeAttrs = (oldVnode && oldVnode.vattrs) || EMPTY_OBJ;
    const newVnodeAttrs = newVnode.vattrs || EMPTY_OBJ;
    // remove attributes no longer present on the vnode by setting them to undefined
    for (memberName in oldVnodeAttrs) {
        if (!(newVnodeAttrs && newVnodeAttrs[memberName] != null) && oldVnodeAttrs[memberName] != null) {
            setAccessor(plt, elm, memberName, oldVnodeAttrs[memberName], undefined, isSvgMode, newVnode.ishost);
        }
    }
    // add new & update changed attributes
    for (memberName in newVnodeAttrs) {
        if (!(memberName in oldVnodeAttrs) || newVnodeAttrs[memberName] !== (memberName === 'value' || memberName === 'checked' ? elm[memberName] : oldVnodeAttrs[memberName])) {
            setAccessor(plt, elm, memberName, oldVnodeAttrs[memberName], newVnodeAttrs[memberName], isSvgMode, newVnode.ishost);
        }
    }
}

let isSvgMode = false;
function createRendererPatch(plt, domApi) {
    // createRenderer() is only created once per app
    // the patch() function which createRenderer() returned is the function
    // which gets called numerous times by each component
    function createElm(oldParentVNode, newParentVNode, childIndex, parentElm, i, elm, childNode, newVNode, oldVNode) {
        newVNode = newParentVNode.vchildren[childIndex];
        if (!useNativeShadowDom) {
            // remember for later we need to check to relocate nodes
            checkSlotRelocate = true;
            if (newVNode.vtag === 'slot') {
                if (scopeId) {
                    // scoped css needs to add its scoped id to the parent element
                    domApi.$addClass(parentElm, scopeId + '-s');
                }
                if (!newVNode.vchildren) {
                    // slot element does not have fallback content
                    // create an html comment we'll use to always reference
                    // where actual slot content should sit next to
                    newVNode.isSlotReference = true;
                }
                else {
                    // slot element has fallback content
                    // still create an element that "mocks" the slot element
                    newVNode.isSlotFallback = true;
                }
            }
        }
        if (isDef(newVNode.vtext)) {
            // create text node
            newVNode.elm = domApi.$createTextNode(newVNode.vtext);
        }
        else if (newVNode.isSlotReference) {
            // create a slot reference html text node
            newVNode.elm = domApi.$createTextNode('');
        }
        else {
            // create element
            elm = newVNode.elm = ((isSvgMode || newVNode.vtag === 'svg') ?
                domApi.$createElementNS('http://www.w3.org/2000/svg', newVNode.vtag) :
                domApi.$createElement((newVNode.isSlotFallback) ? 'slot-fb' : newVNode.vtag));
            {
                isSvgMode = newVNode.vtag === 'svg' ? true : (newVNode.vtag === 'foreignObject' ? false : isSvgMode);
            }
            // add css classes, attrs, props, listeners, etc.
            updateElement(plt, null, newVNode, isSvgMode);
            if (isDef(scopeId) && elm['s-si'] !== scopeId) {
                // if there is a scopeId and this is the initial render
                // then let's add the scopeId as an attribute
                domApi.$addClass(elm, (elm['s-si'] = scopeId));
            }
            if (isDef(ssrId)) {
                // SSR ONLY: this is an SSR render and this
                // logic does not run on the client
                // give this element the SSR child id that can be read by the client
                domApi.$setAttribute(elm, SSR_CHILD_ID, ssrId + '.' + childIndex + (hasChildNodes(newVNode.vchildren) ? '' : '.'));
            }
            if (newVNode.vchildren) {
                for (i = 0; i < newVNode.vchildren.length; ++i) {
                    // create the node
                    childNode = createElm(oldParentVNode, newVNode, i, elm);
                    // return node could have been null
                    if (childNode) {
                        if (isDef(ssrId) && childNode.nodeType === 3 /* TextNode */ && !childNode['s-cr']) {
                            // SSR ONLY: add the text node's start comment
                            domApi.$appendChild(elm, domApi.$createComment('s.' + ssrId + '.' + i));
                        }
                        // append our new node
                        domApi.$appendChild(elm, childNode);
                        if (isDef(ssrId) && childNode.nodeType === 3 /* TextNode */ && !childNode['s-cr']) {
                            // SSR ONLY: add the text node's end comment
                            domApi.$appendChild(elm, domApi.$createComment('/'));
                            domApi.$appendChild(elm, domApi.$createTextNode(' '));
                        }
                    }
                }
            }
            if (newVNode.vtag === 'svg') {
                // Only reset the SVG context when we're exiting SVG element
                isSvgMode = false;
            }
        }
        {
            newVNode.elm['s-hn'] = hostTagName;
            if (newVNode.isSlotFallback || newVNode.isSlotReference) {
                // remember the content reference comment
                newVNode.elm['s-sr'] = true;
                // remember the content reference comment
                newVNode.elm['s-cr'] = contentRef;
                // remember the slot name, or empty string for default slot
                newVNode.elm['s-sn'] = newVNode.vname || '';
                // check if we've got an old vnode for this slot
                oldVNode = oldParentVNode && oldParentVNode.vchildren && oldParentVNode.vchildren[childIndex];
                if (oldVNode && oldVNode.vtag === newVNode.vtag && oldParentVNode.elm) {
                    // we've got an old slot vnode and the wrapper is being replaced
                    // so let's move the old slot content back to it's original location
                    putBackInOriginalLocation(oldParentVNode.elm);
                }
            }
        }
        return newVNode.elm;
    }
    function putBackInOriginalLocation(parentElm, recursive, i, childNode) {
        plt.tmpDisconnected = true;
        const oldSlotChildNodes = domApi.$childNodes(parentElm);
        for (i = oldSlotChildNodes.length - 1; i >= 0; i--) {
            childNode = oldSlotChildNodes[i];
            if (childNode['s-hn'] !== hostTagName && childNode['s-ol']) {
                // this child node in the old element is from another component
                // remove this node from the old slot's parent
                domApi.$remove(childNode);
                // and relocate it back to it's original location
                domApi.$insertBefore(parentReferenceNode(childNode), childNode, referenceNode(childNode));
                // remove the old original location comment entirely
                // later on the patch function will know what to do
                // and move this to the correct spot in need be
                domApi.$remove(childNode['s-ol']);
                childNode['s-ol'] = null;
                checkSlotRelocate = true;
            }
            if (recursive) {
                putBackInOriginalLocation(childNode, recursive);
            }
        }
        plt.tmpDisconnected = false;
    }
    function addVnodes(parentElm, before, parentVNode, vnodes, startIdx, endIdx, containerElm, childNode) {
        // $defaultHolder deprecated 2018-04-02
        const contentRef = parentElm['s-cr'] || parentElm['$defaultHolder'];
        containerElm = ((contentRef && domApi.$parentNode(contentRef)) || parentElm);
        if (containerElm.shadowRoot && domApi.$tagName(containerElm) === hostTagName) {
            containerElm = containerElm.shadowRoot;
        }
        for (; startIdx <= endIdx; ++startIdx) {
            if (vnodes[startIdx]) {
                childNode = isDef(vnodes[startIdx].vtext) ?
                    domApi.$createTextNode(vnodes[startIdx].vtext) :
                    createElm(null, parentVNode, startIdx, parentElm);
                if (childNode) {
                    vnodes[startIdx].elm = childNode;
                    domApi.$insertBefore(containerElm, childNode, referenceNode(before));
                }
            }
        }
    }
    function removeVnodes(vnodes, startIdx, endIdx, node) {
        for (; startIdx <= endIdx; ++startIdx) {
            if (isDef(vnodes[startIdx])) {
                node = vnodes[startIdx].elm;
                {
                    // we're removing this element
                    // so it's possible we need to show slot fallback content now
                    checkSlotFallbackVisibility = true;
                    if (node['s-ol']) {
                        // remove the original location comment
                        domApi.$remove(node['s-ol']);
                    }
                    else {
                        // it's possible that child nodes of the node
                        // that's being removed are slot nodes
                        putBackInOriginalLocation(node, true);
                    }
                }
                // remove the vnode's element from the dom
                domApi.$remove(node);
            }
        }
    }
    function updateChildren(parentElm, oldCh, newVNode, newCh, idxInOld, i, node, elmToMove) {
        let oldStartIdx = 0, newStartIdx = 0;
        let oldEndIdx = oldCh.length - 1;
        let oldStartVnode = oldCh[0];
        let oldEndVnode = oldCh[oldEndIdx];
        let newEndIdx = newCh.length - 1;
        let newStartVnode = newCh[0];
        let newEndVnode = newCh[newEndIdx];
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (oldStartVnode == null) {
                // Vnode might have been moved left
                oldStartVnode = oldCh[++oldStartIdx];
            }
            else if (oldEndVnode == null) {
                oldEndVnode = oldCh[--oldEndIdx];
            }
            else if (newStartVnode == null) {
                newStartVnode = newCh[++newStartIdx];
            }
            else if (newEndVnode == null) {
                newEndVnode = newCh[--newEndIdx];
            }
            else if (isSameVnode(oldStartVnode, newStartVnode)) {
                patchVNode(oldStartVnode, newStartVnode);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else if (isSameVnode(oldEndVnode, newEndVnode)) {
                patchVNode(oldEndVnode, newEndVnode);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (isSameVnode(oldStartVnode, newEndVnode)) {
                // Vnode moved right
                if (oldStartVnode.vtag === 'slot' || newEndVnode.vtag === 'slot') {
                    putBackInOriginalLocation(domApi.$parentNode(oldStartVnode.elm));
                }
                patchVNode(oldStartVnode, newEndVnode);
                domApi.$insertBefore(parentElm, oldStartVnode.elm, domApi.$nextSibling(oldEndVnode.elm));
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (isSameVnode(oldEndVnode, newStartVnode)) {
                // Vnode moved left
                if (oldStartVnode.vtag === 'slot' || newEndVnode.vtag === 'slot') {
                    putBackInOriginalLocation(domApi.$parentNode(oldEndVnode.elm));
                }
                patchVNode(oldEndVnode, newStartVnode);
                domApi.$insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else {
                // createKeyToOldIdx
                idxInOld = null;
                for (i = oldStartIdx; i <= oldEndIdx; ++i) {
                    if (oldCh[i] && isDef(oldCh[i].vkey) && oldCh[i].vkey === newStartVnode.vkey) {
                        idxInOld = i;
                        break;
                    }
                }
                if (isDef(idxInOld)) {
                    elmToMove = oldCh[idxInOld];
                    if (elmToMove.vtag !== newStartVnode.vtag) {
                        node = createElm(oldCh && oldCh[newStartIdx], newVNode, idxInOld, parentElm);
                    }
                    else {
                        patchVNode(elmToMove, newStartVnode);
                        oldCh[idxInOld] = undefined;
                        node = elmToMove.elm;
                    }
                    newStartVnode = newCh[++newStartIdx];
                }
                else {
                    // new element
                    node = createElm(oldCh && oldCh[newStartIdx], newVNode, newStartIdx, parentElm);
                    newStartVnode = newCh[++newStartIdx];
                }
                if (node) {
                    domApi.$insertBefore(parentReferenceNode(oldStartVnode.elm), node, referenceNode(oldStartVnode.elm));
                }
            }
        }
        if (oldStartIdx > oldEndIdx) {
            addVnodes(parentElm, (newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm), newVNode, newCh, newStartIdx, newEndIdx);
        }
        else if (newStartIdx > newEndIdx) {
            removeVnodes(oldCh, oldStartIdx, oldEndIdx);
        }
    }
    function isSameVnode(vnode1, vnode2) {
        // compare if two vnode to see if they're "technically" the same
        // need to have the same element tag, and same key to be the same
        if (vnode1.vtag === vnode2.vtag && vnode1.vkey === vnode2.vkey) {
            {
                if (vnode1.vtag === 'slot') {
                    return vnode1.vname === vnode2.vname;
                }
            }
            return true;
        }
        return false;
    }
    function referenceNode(node) {
        {
            if (node && node['s-ol']) {
                // this node was relocated to a new location in the dom
                // because of some other component's slot
                // but we still have an html comment in place of where
                // it's original location was according to it's original vdom
                return node['s-ol'];
            }
        }
        return node;
    }
    function parentReferenceNode(node) {
        return domApi.$parentNode(node['s-ol'] ? node['s-ol'] : node);
    }
    function patchVNode(oldVNode, newVNode, defaultHolder) {
        const elm = newVNode.elm = oldVNode.elm;
        const oldChildren = oldVNode.vchildren;
        const newChildren = newVNode.vchildren;
        {
            // test if we're rendering an svg element, or still rendering nodes inside of one
            // only add this to the when the compiler sees we're using an svg somewhere
            isSvgMode = newVNode.elm &&
                isDef(domApi.$parentElement(newVNode.elm)) &&
                newVNode.elm.ownerSVGElement !== undefined;
            isSvgMode = newVNode.vtag === 'svg' ? true : (newVNode.vtag === 'foreignObject' ? false : isSvgMode);
        }
        if (!isDef(newVNode.vtext)) {
            // element node
            if (newVNode.vtag !== 'slot') {
                // either this is the first render of an element OR it's an update
                // AND we already know it's possible it could have changed
                // this updates the element's css classes, attrs, props, listeners, etc.
                updateElement(plt, oldVNode, newVNode, isSvgMode);
            }
            if (isDef(oldChildren) && isDef(newChildren)) {
                // looks like there's child vnodes for both the old and new vnodes
                updateChildren(elm, oldChildren, newVNode, newChildren);
            }
            else if (isDef(newChildren)) {
                // no old child vnodes, but there are new child vnodes to add
                if (isDef(oldVNode.vtext)) {
                    // the old vnode was text, so be sure to clear it out
                    domApi.$setTextContent(elm, '');
                }
                // add the new vnode children
                addVnodes(elm, null, newVNode, newChildren, 0, newChildren.length - 1);
            }
            else if (isDef(oldChildren)) {
                // no new child vnodes, but there are old child vnodes to remove
                removeVnodes(oldChildren, 0, oldChildren.length - 1);
            }
        }
        else if (defaultHolder = (elm['s-cr'] || elm['$defaultHolder'] /* $defaultHolder deprecated 2018-04-02 */)) {
            // this element has slotted content
            domApi.$setTextContent(domApi.$parentNode(defaultHolder), newVNode.vtext);
        }
        else if (oldVNode.vtext !== newVNode.vtext) {
            // update the text content for the text only vnode
            // and also only if the text is different than before
            domApi.$setTextContent(elm, newVNode.vtext);
        }
        {
            // reset svgMode when svg node is fully patched
            if (isSvgMode && 'svg' === newVNode.vtag) {
                isSvgMode = false;
            }
        }
    }
    function updateFallbackSlotVisibility(elm, childNode, childNodes, i, ilen, j, slotNameAttr, nodeType) {
        childNodes = domApi.$childNodes(elm);
        for (i = 0, ilen = childNodes.length; i < ilen; i++) {
            childNode = childNodes[i];
            if (domApi.$nodeType(childNode) === 1 /* ElementNode */) {
                if (childNode['s-sr']) {
                    // this is a slot fallback node
                    // get the slot name for this slot reference node
                    slotNameAttr = childNode['s-sn'];
                    // by default always show a fallback slot node
                    // then hide it if there are other slots in the light dom
                    childNode.hidden = false;
                    for (j = 0; j < ilen; j++) {
                        if (childNodes[j]['s-hn'] !== childNode['s-hn']) {
                            // this sibling node is from a different component
                            nodeType = domApi.$nodeType(childNodes[j]);
                            if (slotNameAttr !== '') {
                                // this is a named fallback slot node
                                if (nodeType === 1 /* ElementNode */ && slotNameAttr === domApi.$getAttribute(childNodes[j], 'slot')) {
                                    childNode.hidden = true;
                                    break;
                                }
                            }
                            else {
                                // this is a default fallback slot node
                                // any element or text node (with content)
                                // should hide the default fallback slot node
                                if (nodeType === 1 /* ElementNode */ || (nodeType === 3 /* TextNode */ && domApi.$getTextContent(childNodes[j]).trim() !== '')) {
                                    childNode.hidden = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                // keep drilling down
                updateFallbackSlotVisibility(childNode);
            }
        }
    }
    const relocateNodes = [];
    function relocateSlotContent(elm, childNodes, childNode, node, i, ilen, j, hostContentNodes, slotNameAttr, nodeType) {
        childNodes = domApi.$childNodes(elm);
        for (i = 0, ilen = childNodes.length; i < ilen; i++) {
            childNode = childNodes[i];
            if (childNode['s-sr'] && (node = childNode['s-cr'])) {
                // first got the content reference comment node
                // then we got it's parent, which is where all the host content is in now
                hostContentNodes = domApi.$childNodes(domApi.$parentNode(node));
                slotNameAttr = childNode['s-sn'];
                for (j = hostContentNodes.length - 1; j >= 0; j--) {
                    node = hostContentNodes[j];
                    if (!node['s-cn'] && !node['s-nr'] && node['s-hn'] !== childNode['s-hn']) {
                        // let's do some relocating to its new home
                        // but never relocate a content reference node
                        // that is suppose to always represent the original content location
                        nodeType = domApi.$nodeType(node);
                        if (((nodeType === 3 /* TextNode */ || nodeType === 8 /* CommentNode */) && slotNameAttr === '') ||
                            (nodeType === 1 /* ElementNode */ && domApi.$getAttribute(node, 'slot') === null && slotNameAttr === '') ||
                            (nodeType === 1 /* ElementNode */ && domApi.$getAttribute(node, 'slot') === slotNameAttr)) {
                            // it's possible we've already decided to relocate this node
                            if (!relocateNodes.some(r => r.nodeToRelocate === node)) {
                                // made some changes to slots
                                // let's make sure we also double check
                                // fallbacks are correctly hidden or shown
                                checkSlotFallbackVisibility = true;
                                node['s-sn'] = slotNameAttr;
                                // add to our list of nodes to relocate
                                relocateNodes.push({
                                    slotRefNode: childNode,
                                    nodeToRelocate: node
                                });
                            }
                        }
                    }
                }
            }
            if (domApi.$nodeType(childNode) === 1 /* ElementNode */) {
                relocateSlotContent(childNode);
            }
        }
    }
    // internal variables to be reused per patch() call
    let useNativeShadowDom, ssrId, scopeId, checkSlotFallbackVisibility, checkSlotRelocate, hostTagName, contentRef;
    return function patch(hostElm, oldVNode, newVNode, useNativeShadowDomVal, encapsulation, ssrPatchId, i, relocateNode, orgLocationNode, refNode, parentNodeRef, insertBeforeNode) {
        // patchVNode() is synchronous
        // so it is safe to set these variables and internally
        // the same patch() call will reference the same data
        hostTagName = domApi.$tagName(hostElm);
        contentRef = hostElm['s-cr'];
        useNativeShadowDom = useNativeShadowDomVal;
        {
            if (encapsulation !== 'shadow') {
                ssrId = ssrPatchId;
            }
            else {
                ssrId = null;
            }
        }
        {
            // get the scopeId
            scopeId = hostElm['s-sc'];
            // always reset
            checkSlotRelocate = checkSlotFallbackVisibility = false;
        }
        // synchronous patch
        patchVNode(oldVNode, newVNode);
        if (isDef(ssrId)) {
            // SSR ONLY: we've been given an SSR id, so the host element
            // should be given the ssr id attribute
            domApi.$setAttribute(oldVNode.elm, SSR_VNODE_ID, ssrId);
        }
        {
            if (checkSlotRelocate) {
                relocateSlotContent(newVNode.elm);
                for (i = 0; i < relocateNodes.length; i++) {
                    relocateNode = relocateNodes[i];
                    if (!relocateNode.nodeToRelocate['s-ol']) {
                        // add a reference node marking this node's original location
                        // keep a reference to this node for later lookups
                        orgLocationNode = domApi.$createTextNode('');
                        orgLocationNode['s-nr'] = relocateNode.nodeToRelocate;
                        domApi.$insertBefore(domApi.$parentNode(relocateNode.nodeToRelocate), (relocateNode.nodeToRelocate['s-ol'] = orgLocationNode), relocateNode.nodeToRelocate);
                    }
                }
                // while we're moving nodes around existing nodes, temporarily disable
                // the disconnectCallback from working
                plt.tmpDisconnected = true;
                for (i = 0; i < relocateNodes.length; i++) {
                    relocateNode = relocateNodes[i];
                    // by default we're just going to insert it directly
                    // after the slot reference node
                    parentNodeRef = domApi.$parentNode(relocateNode.slotRefNode);
                    insertBeforeNode = domApi.$nextSibling(relocateNode.slotRefNode);
                    orgLocationNode = relocateNode.nodeToRelocate['s-ol'];
                    while (orgLocationNode = domApi.$previousSibling(orgLocationNode)) {
                        if ((refNode = orgLocationNode['s-nr']) && refNode) {
                            if (refNode['s-sn'] === relocateNode.nodeToRelocate['s-sn']) {
                                if (parentNodeRef === domApi.$parentNode(refNode)) {
                                    if ((refNode = domApi.$nextSibling(refNode)) && refNode && !refNode['s-nr']) {
                                        insertBeforeNode = refNode;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if ((!insertBeforeNode && parentNodeRef !== domApi.$parentNode(relocateNode.nodeToRelocate)) ||
                        (domApi.$nextSibling(relocateNode.nodeToRelocate) !== insertBeforeNode)) {
                        // we've checked that it's worth while to relocate
                        // since that the node to relocate
                        // has a different next sibling or parent relocated
                        if (relocateNode.nodeToRelocate !== insertBeforeNode) {
                            // remove the node from the dom
                            domApi.$remove(relocateNode.nodeToRelocate);
                            // add it back to the dom but in its new home
                            domApi.$insertBefore(parentNodeRef, relocateNode.nodeToRelocate, insertBeforeNode);
                        }
                    }
                }
                // done moving nodes around
                // allow the disconnect callback to work again
                plt.tmpDisconnected = false;
            }
            if (checkSlotFallbackVisibility) {
                updateFallbackSlotVisibility(newVNode.elm);
            }
            // always reset
            relocateNodes.length = 0;
        }
        // return our new vnode
        return newVNode;
    };
}
function callNodeRefs(vNode, isDestroy) {
    if (vNode) {
        vNode.vattrs && vNode.vattrs.ref && vNode.vattrs.ref(isDestroy ? null : vNode.elm);
        vNode.vchildren && vNode.vchildren.forEach(vChild => {
            callNodeRefs(vChild, isDestroy);
        });
    }
}
function hasChildNodes(children) {
    // SSR ONLY: check if there are any more nested child elements
    // if there aren't, this info is useful so the client runtime
    // doesn't have to climb down and check so many elements
    if (children) {
        for (var i = 0; i < children.length; i++) {
            if (children[i].vtag !== 'slot' || hasChildNodes(children[i].vchildren)) {
                return true;
            }
        }
    }
    return false;
}

function initElementListeners(plt, elm) {
    // so the element was just connected, which means it's in the DOM
    // however, the component instance hasn't been created yet
    // but what if an event it should be listening to get emitted right now??
    // let's add our listeners right now to our element, and if it happens
    // to receive events between now and the instance being created let's
    // queue up all of the event data and fire it off on the instance when it's ready
    const cmpMeta = plt.getComponentMeta(elm);
    if (cmpMeta.listenersMeta) {
        // we've got listens
        cmpMeta.listenersMeta.forEach(listenMeta => {
            // go through each listener
            if (!listenMeta.eventDisabled) {
                // only add ones that are not already disabled
                plt.domApi.$addEventListener(elm, listenMeta.eventName, createListenerCallback(plt, elm, listenMeta.eventMethodName), listenMeta.eventCapture, listenMeta.eventPassive);
            }
        });
    }
}
function createListenerCallback(plt, elm, eventMethodName, val) {
    // create the function that gets called when the element receives
    // an event which it should be listening for
    return (ev) => {
        // get the instance if it exists
        val = plt.instanceMap.get(elm);
        if (val) {
            // instance is ready, let's call it's member method for this event
            val[eventMethodName](ev);
        }
        else {
            // instance is not ready!!
            // let's queue up this event data and replay it later
            // when the instance is ready
            val = (plt.queuedEvents.get(elm) || []);
            val.push(eventMethodName, ev);
            plt.queuedEvents.set(elm, val);
        }
    };
}
function enableEventListener(plt, instance, eventName, shouldEnable, attachTo, passive) {
    if (instance) {
        // cool, we've got an instance, it's get the element it's on
        const elm = plt.hostElementMap.get(instance);
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta && cmpMeta.listenersMeta) {
            // alrighty, so this cmp has listener meta
            if (shouldEnable) {
                // we want to enable this event
                // find which listen meta we're talking about
                const listenMeta = cmpMeta.listenersMeta.find(l => l.eventName === eventName);
                if (listenMeta) {
                    // found the listen meta, so let's add the listener
                    plt.domApi.$addEventListener(elm, eventName, (ev) => instance[listenMeta.eventMethodName](ev), listenMeta.eventCapture, (passive === undefined) ? listenMeta.eventPassive : !!passive, attachTo);
                }
            }
            else {
                // we're disabling the event listener
                // so let's just remove it entirely
                plt.domApi.$removeEventListener(elm, eventName);
            }
        }
    }
}

function fillCmpMetaFromConstructor(cmp, cmpMeta) {
    if (!cmpMeta.tagNameMeta) {
        cmpMeta.tagNameMeta = cmp.is;
    }
    if (!cmpMeta.bundleIds) {
        cmpMeta.bundleIds = cmp.is;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    if (!cmpMeta.membersMeta.color) {
        cmpMeta.membersMeta.color = {
            propType: 2 /* String */,
            attribName: 'color',
            memberType: 1 /* Prop */
        };
    }
    if (cmp.properties) {
        Object.keys(cmp.properties).forEach(memberName => {
            const property = cmp.properties[memberName];
            const memberMeta = cmpMeta.membersMeta[memberName] = {};
            if (property.state) {
                memberMeta.memberType = 5 /* State */;
            }
            else if (property.elementRef) {
                memberMeta.memberType = 7 /* Element */;
            }
            else if (property.method) {
                memberMeta.memberType = 6 /* Method */;
            }
            else if (property.connect) {
                memberMeta.memberType = 4 /* PropConnect */;
                memberMeta.ctrlId = property.connect;
            }
            else if (property.context) {
                memberMeta.memberType = 3 /* PropContext */;
                memberMeta.ctrlId = property.context;
            }
            else {
                if (property.type === String) {
                    memberMeta.propType = 2 /* String */;
                }
                else if (property.type === Boolean) {
                    memberMeta.propType = 3 /* Boolean */;
                }
                else if (property.type === Number) {
                    memberMeta.propType = 4 /* Number */;
                }
                else {
                    memberMeta.propType = 1 /* Any */;
                }
                if (property.attr) {
                    memberMeta.attribName = property.attr;
                }
                else {
                    memberMeta.attribName = memberName;
                }
                memberMeta.reflectToAttrib = !!property.reflectToAttr;
                if (property.mutable) {
                    memberMeta.memberType = 2 /* PropMutable */;
                }
                else {
                    memberMeta.memberType = 1 /* Prop */;
                }
            }
        });
    }
    if (cmp.listeners) {
        cmpMeta.listenersMeta = cmp.listeners.map(listener => {
            return {
                eventName: listener.name,
                eventMethodName: listener.method,
                eventCapture: listener.capture,
                eventDisabled: listener.disabled,
                eventPassive: listener.passive
            };
        });
    }
    return cmpMeta;
}

function hasFileExtension(filePath, extensions) {
    filePath = filePath.toLowerCase();
    return extensions.some(ext => filePath.endsWith('.' + ext));
}
function generatePreamble(config, opts = {}) {
    let preamble = [];
    if (config.preamble) {
        preamble = config.preamble.split('\n');
    }
    if (typeof opts.prefix === 'string') {
        opts.prefix.split('\n').forEach(c => {
            preamble.push(c);
        });
    }
    preamble.push(BANNER);
    if (typeof opts.suffix === 'string') {
        opts.suffix.split('\n').forEach(c => {
            preamble.push(c);
        });
    }
    if (preamble.length > 1) {
        preamble = preamble.map(l => ` * ${l}`);
        preamble.unshift(`/*!`);
        preamble.push(` */`);
        return preamble.join('\n');
    }
    return `/*! ${BANNER} */`;
}
function buildError(diagnostics) {
    const diagnostic = {
        level: 'error',
        type: 'build',
        header: 'Build Error',
        messageText: 'build error',
        relFilePath: null,
        absFilePath: null,
        lines: []
    };
    diagnostics.push(diagnostic);
    return diagnostic;
}
function buildWarn(diagnostics) {
    const diagnostic = {
        level: 'warn',
        type: 'build',
        header: 'build warn',
        messageText: 'build warn',
        relFilePath: null,
        absFilePath: null,
        lines: []
    };
    diagnostics.push(diagnostic);
    return diagnostic;
}
function catchError(diagnostics, err, msg) {
    const diagnostic = {
        level: 'error',
        type: 'build',
        header: 'Build Error',
        messageText: 'build error',
        relFilePath: null,
        absFilePath: null,
        lines: []
    };
    if (typeof msg === 'string') {
        diagnostic.messageText = msg;
    }
    else if (err) {
        if (err.stack) {
            diagnostic.messageText = err.stack.toString();
        }
        else {
            if (err.message) {
                diagnostic.messageText = err.message.toString();
            }
            else {
                diagnostic.messageText = err.toString();
            }
        }
    }
    if (diagnostics && !shouldIgnoreError(diagnostic.messageText)) {
        diagnostics.push(diagnostic);
    }
}
const TASK_CANCELED_MSG = `task canceled`;
function shouldIgnoreError(msg) {
    return (msg === TASK_CANCELED_MSG);
}
function hasError(diagnostics) {
    if (!diagnostics) {
        return false;
    }
    return diagnostics.some(d => d.level === 'error' && d.type !== 'runtime');
}
function pathJoin(config, ...paths) {
    return normalizePath(config.sys.path.join.apply(config.sys.path, paths));
}
function normalizePath(str) {
    // Convert Windows backslash paths to slash paths: foo\\bar ➔ foo/bar
    // https://github.com/sindresorhus/slash MIT
    // By Sindre Sorhus
    if (typeof str !== 'string') {
        throw new Error(`invalid path to normalize`);
    }
    str = str.trim();
    if (EXTENDED_PATH_REGEX.test(str) || NON_ASCII_REGEX.test(str)) {
        return str;
    }
    str = str.replace(SLASH_REGEX, '/');
    // always remove the trailing /
    // this makes our file cache look ups consistent
    if (str.charAt(str.length - 1) === '/') {
        const colonIndex = str.indexOf(':');
        if (colonIndex > -1) {
            if (colonIndex < str.length - 2) {
                str = str.substring(0, str.length - 1);
            }
        }
        else if (str.length > 1) {
            str = str.substring(0, str.length - 1);
        }
    }
    return str;
}
const EXTENDED_PATH_REGEX = /^\\\\\?\\/;
const NON_ASCII_REGEX = /[^\x00-\x80]+/;
const SLASH_REGEX = /\\/g;

function getAppBuildDir(config, outputTarget) {
    return pathJoin(config, outputTarget.buildDir, config.fsNamespace);
}
function getRegistryFileName(config) {
    return `${config.fsNamespace}.registry.json`;
}
function getRegistryJson(config, outputTarget) {
    return pathJoin(config, getAppBuildDir(config, outputTarget), getRegistryFileName(config));
}
function getLoaderFileName(config) {
    return `${config.fsNamespace}.js`;
}
function getLoaderPath(config, outputTarget) {
    return pathJoin(config, outputTarget.buildDir, getLoaderFileName(config));
}
function getGlobalFileName(config) {
    return `${config.fsNamespace}.global.js`;
}
function getGlobalJsBuildPath(config, outputTarget) {
    return pathJoin(config, getAppBuildDir(config, outputTarget), getGlobalFileName(config));
}

function initCoreComponentOnReady(plt, App, win, apps, queuedComponentOnReadys, i) {
    // add componentOnReady() to the App object
    // this also is used to know that the App's core is ready
    App.componentOnReady = (elm, resolve) => {
        if (!elm.nodeName.includes('-')) {
            resolve(null);
            return false;
        }
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta) {
            if (plt.hasLoadedMap.has(elm)) {
                // element has already loaded, pass the resolve the element component
                // so we know that the resolve knows it this element is an app component
                resolve(elm);
            }
            else {
                // element hasn't loaded yet
                // add this resolve specifically to this elements on ready queue
                const onReadyCallbacks = plt.onReadyCallbacksMap.get(elm) || [];
                onReadyCallbacks.push(resolve);
                plt.onReadyCallbacksMap.set(elm, onReadyCallbacks);
            }
        }
        // return a boolean if this app recognized this element or not
        return !!cmpMeta;
    };
    if (queuedComponentOnReadys) {
        // we've got some componentOnReadys in the queue before the app was ready
        for (i = queuedComponentOnReadys.length - 1; i >= 0; i--) {
            // go through each element and see if this app recongizes it
            if (App.componentOnReady(queuedComponentOnReadys[i][0], queuedComponentOnReadys[i][1])) {
                // turns out this element belongs to this app
                // remove the resolve from the queue so in the end
                // all that's left in the queue are elements not apart of any apps
                queuedComponentOnReadys.splice(i, 1);
            }
        }
        for (i = 0; i < apps.length; i++) {
            if (!win[apps[i]].componentOnReady) {
                // there is at least 1 apps that isn't ready yet
                // so let's stop here cuz there's still app cores loading
                return;
            }
        }
        // if we got to this point then that means all of the apps are ready
        // and they would have removed any of their elements from queuedComponentOnReadys
        // so let's do the cleanup of the  remaining queuedComponentOnReadys
        for (i = 0; i < queuedComponentOnReadys.length; i++) {
            // resolve any queued componentsOnReadys that are left over
            // since these elements were not apart of any apps
            // call the resolve fn, but pass null so it's know this wasn't a known app component
            queuedComponentOnReadys[i][1](null);
        }
        queuedComponentOnReadys.length = 0;
    }
}

function attributeChangedCallback(membersMeta, elm, attribName, oldVal, newVal, propName, memberMeta) {
    // only react if the attribute values actually changed
    if (membersMeta && oldVal !== newVal) {
        // using the known component meta data
        // look up to see if we have a property wired up to this attribute name
        for (propName in membersMeta) {
            memberMeta = membersMeta[propName];
            // normalize the attribute name w/ lower case
            if (memberMeta.attribName && toLowerCase(memberMeta.attribName) === toLowerCase(attribName)) {
                // cool we've got a prop using this attribute name, the value will
                // be a string, so let's convert it to the correct type the app wants
                elm[propName] = parsePropertyValue(memberMeta.propType, newVal);
                break;
            }
        }
    }
}

function initHostSnapshot(domApi, cmpMeta, hostElm, hostSnapshot, attribName) {
    // the host element has connected to the dom
    // and we've waited a tick to make sure all frameworks
    // have finished adding attributes and child nodes to the host
    // before we go all out and hydrate this beast
    // let's first take a snapshot of its original layout before render
    if (!hostElm.mode) {
        // looks like mode wasn't set as a property directly yet
        // first check if there's an attribute
        // next check the app's global
        hostElm.mode = domApi.$getMode(hostElm);
    }
    {
        // if the slot polyfill is required we'll need to put some nodes
        // in here to act as original content anchors as we move nodes around
        // host element has been connected to the DOM
        if (!hostElm['s-cr'] && !domApi.$getAttribute(hostElm, SSR_VNODE_ID) && (!domApi.$supportsShadowDom || cmpMeta.encapsulationMeta !== 1 /* ShadowDom */)) {
            // only required when we're NOT using native shadow dom (slot)
            // or this browser doesn't support native shadow dom
            // and this host element was NOT created with SSR
            // let's pick out the inner content for slot projection
            // create a node to represent where the original
            // content was first placed, which is useful later on
            hostElm['s-cr'] = domApi.$createTextNode('');
            hostElm['s-cr']['s-cn'] = true;
            domApi.$insertBefore(hostElm, hostElm['s-cr'], domApi.$childNodes(hostElm)[0]);
        }
        if (!domApi.$supportsShadowDom && cmpMeta.encapsulationMeta === 1 /* ShadowDom */) {
            // this component should use shadow dom
            // but this browser doesn't support it
            // so let's polyfill a few things for the user
            {
                hostElm.shadowRoot = hostElm;
            }
        }
    }
    {
        if (cmpMeta.encapsulationMeta === 1 /* ShadowDom */ && domApi.$supportsShadowDom && !hostElm.shadowRoot) {
            // this component is using shadow dom
            // and this browser supports shadow dom
            // add the read-only property "shadowRoot" to the host element
            domApi.$attachShadow(hostElm, { mode: 'open' });
        }
    }
    // create a host snapshot object we'll
    // use to store all host data about to be read later
    hostSnapshot = {
        $id: hostElm['s-id'],
        $attributes: {}
    };
    // loop through and gather up all the original attributes on the host
    // this is useful later when we're creating the component instance
    cmpMeta.membersMeta && Object.keys(cmpMeta.membersMeta).forEach(memberName => {
        if (attribName = cmpMeta.membersMeta[memberName].attribName) {
            hostSnapshot.$attributes[attribName] = domApi.$getAttribute(hostElm, attribName);
        }
    });
    return hostSnapshot;
}

function connectedCallback(plt, cmpMeta, elm) {
    {
        // initialize our event listeners on the host element
        // we do this now so that we can listening to events that may
        // have fired even before the instance is ready
        if (!plt.hasListenersMap.has(elm)) {
            // it's possible we've already connected
            // then disconnected
            // and the same element is reconnected again
            plt.hasListenersMap.set(elm, true);
            initElementListeners(plt, elm);
        }
    }
    // this element just connected, which may be re-connecting
    // ensure we remove it from our map of disconnected
    plt.isDisconnectedMap.delete(elm);
    if (!plt.hasConnectedMap.has(elm)) {
        // first time we've connected
        plt.hasConnectedMap.set(elm, true);
        if (!elm['s-id']) {
            // assign a unique id to this host element
            // it's possible this was already given an element id
            elm['s-id'] = plt.nextId();
        }
        // register this component as an actively
        // loading child to its parent component
        registerWithParentComponent(plt, elm);
        // add to the queue to load the bundle
        // it's important to have an async tick in here so we can
        // ensure the "mode" attribute has been added to the element
        // place in high priority since it's not much work and we need
        // to know as fast as possible, but still an async tick in between
        plt.queue.tick(() => {
            // start loading this component mode's bundle
            // if it's already loaded then the callback will be synchronous
            plt.hostSnapshotMap.set(elm, initHostSnapshot(plt.domApi, cmpMeta, elm));
            plt.requestBundle(cmpMeta, elm);
        });
    }
}
function registerWithParentComponent(plt, elm, ancestorHostElement) {
    // find the first ancestor host element (if there is one) and register
    // this element as one of the actively loading child elements for its ancestor
    ancestorHostElement = elm;
    while (ancestorHostElement = plt.domApi.$parentElement(ancestorHostElement)) {
        // climb up the ancestors looking for the first registered component
        if (plt.isDefinedComponent(ancestorHostElement)) {
            // we found this elements the first ancestor host element
            // if the ancestor already loaded then do nothing, it's too late
            if (!plt.hasLoadedMap.has(elm)) {
                // keep a reference to this element's ancestor host element
                // elm._ancestorHostElement = ancestorHostElement;
                plt.ancestorHostElementMap.set(elm, ancestorHostElement);
                // ensure there is an array to contain a reference to each of the child elements
                // and set this element as one of the ancestor's child elements it should wait on
                if (ancestorHostElement['$activeLoading']) {
                    // $activeLoading deprecated 2018-04-02
                    ancestorHostElement['s-ld'] = ancestorHostElement['$activeLoading'];
                }
                (ancestorHostElement['s-ld'] = ancestorHostElement['s-ld'] || []).push(elm);
            }
            break;
        }
    }
}

function disconnectedCallback(plt, elm) {
    // only disconnect if we're not temporarily disconnected
    // tmpDisconnected will happen when slot nodes are being relocated
    if (!plt.tmpDisconnected && isDisconnected(plt.domApi, elm)) {
        // ok, let's officially destroy this thing
        // set this to true so that any of our pending async stuff
        // doesn't continue since we already decided to destroy this node
        // elm._hasDestroyed = true;
        plt.isDisconnectedMap.set(elm, true);
        // double check that we've informed the ancestor host elements
        // that they're good to go and loaded (cuz this one is on its way out)
        propagateComponentLoaded(plt, elm);
        // since we're disconnecting, call all of the JSX ref's with null
        callNodeRefs(plt.vnodeMap.get(elm), true);
        // detatch any event listeners that may have been added
        // because we're not passing an exact event name it'll
        // remove all of this element's event, which is good
        plt.domApi.$removeEventListener(elm);
        plt.hasListenersMap.delete(elm);
        {
            // call instance componentDidUnload
            // if we've created an instance for this
            const instance = plt.instanceMap.get(elm);
            if (instance) {
                // call the user's componentDidUnload if there is one
                instance.componentDidUnload && instance.componentDidUnload();
            }
        }
        // clear CSS var-shim tracking
        if (plt.customStyle) {
            plt.customStyle.removeHost(elm);
        }
        // clear any references to other elements
        // more than likely we've already deleted these references
        // but let's double check there pal
        [
            plt.ancestorHostElementMap,
            plt.onReadyCallbacksMap,
            plt.hostSnapshotMap
        ].forEach(wm => wm.delete(elm));
    }
}
function isDisconnected(domApi, elm) {
    while (elm) {
        if (!domApi.$parentNode(elm)) {
            return domApi.$nodeType(elm) !== 9 /* DocumentNode */;
        }
        elm = domApi.$parentNode(elm);
    }
}

function hmrStart(plt, cmpMeta, elm, hmrVersionId) {
    // ¯\_(ツ)_/¯
    // keep the existing state
    // forget the constructor
    cmpMeta.componentConstructor = null;
    // no sir, this component has never loaded, not once, ever
    plt.hasLoadedMap.delete(elm);
    // forget the instance
    const instance = plt.instanceMap.get(elm);
    if (instance) {
        plt.hostElementMap.delete(instance);
        plt.instanceMap.delete(elm);
    }
    // detatch any event listeners that may have been added
    // because we're not passing an exact event name it'll
    // remove all of this element's event, which is good
    plt.domApi.$removeEventListener(elm);
    plt.hasListenersMap.delete(elm);
    cmpMeta.listenersMeta = null;
    // create a callback for when this component finishes hmr
    elm['s-hmr-load'] = () => {
        // finished hmr for this element
        delete elm['s-hmr-load'];
        hmrFinish(plt, cmpMeta, elm);
    };
    // create the new host snapshot from the element
    plt.hostSnapshotMap.set(elm, initHostSnapshot(plt.domApi, cmpMeta, elm));
    // request the bundle again
    plt.requestBundle(cmpMeta, elm, hmrVersionId);
}
function hmrFinish(plt, cmpMeta, elm) {
    if (!plt.hasListenersMap.has(elm)) {
        plt.hasListenersMap.set(elm, true);
        // initElementListeners works off of cmp metadata
        // but we just got new data from the constructor
        // so let's update the cmp metadata w/ constructor listener data
        if (cmpMeta.componentConstructor && cmpMeta.componentConstructor.listeners) {
            cmpMeta.listenersMeta = cmpMeta.componentConstructor.listeners.map(lstn => {
                const listenerMeta = {
                    eventMethodName: lstn.method,
                    eventName: lstn.name,
                    eventCapture: !!lstn.capture,
                    eventPassive: !!lstn.passive,
                    eventDisabled: !!lstn.disabled,
                };
                return listenerMeta;
            });
            initElementListeners(plt, elm);
        }
    }
}

function proxyHostElementPrototype(plt, membersMeta, hostPrototype) {
    // create getters/setters on the host element prototype to represent the public API
    // the setters allows us to know when data has changed so we can re-render
    {
        // in just a server-side build
        // let's set the properties to the values immediately
        let values = plt.valuesMap.get(hostPrototype);
        if (!values) {
            values = {};
            plt.valuesMap.set(hostPrototype, values);
        }
        membersMeta && Object.keys(membersMeta).forEach(memberName => {
            const memberType = membersMeta[memberName].memberType;
            if (memberType === 1 /* Prop */ || memberType === 2 /* PropMutable */) {
                values[memberName] = hostPrototype[memberName];
            }
        });
    }
    membersMeta && Object.keys(membersMeta).forEach(memberName => {
        // add getters/setters
        const member = membersMeta[memberName];
        const memberType = member.memberType;
        if (memberType === 1 /* Prop */ || memberType === 2 /* PropMutable */) {
            // @Prop() or @Prop({ mutable: true })
            definePropertyGetterSetter(hostPrototype, memberName, function getHostElementProp() {
                // host element getter (cannot be arrow fn)
                // yup, ugly, srynotsry
                return (plt.valuesMap.get(this) || {})[memberName];
            }, function setHostElementProp(newValue) {
                // host element setter (cannot be arrow fn)
                setValue(plt, this, memberName, parsePropertyValue(member.propType, newValue));
            });
        }
        else if (memberType === 6 /* Method */) {
            // @Method()
            // add a placeholder noop value on the host element's prototype
            // incase this method gets called before setup
            definePropertyValue(hostPrototype, memberName, noop);
        }
    });
}

function initHostElement(plt, cmpMeta, HostElementConstructor, hydratedCssClass) {
    // let's wire up our functions to the host element's prototype
    // we can also inject our platform into each one that needs that api
    // note: these cannot be arrow functions cuz "this" is important here hombre
    HostElementConstructor.connectedCallback = function () {
        // coolsville, our host element has just hit the DOM
        connectedCallback(plt, cmpMeta, this);
    };
    {
        HostElementConstructor.attributeChangedCallback = function (attribName, oldVal, newVal) {
            // the browser has just informed us that an attribute
            // on the host element has changed
            attributeChangedCallback(cmpMeta.membersMeta, this, attribName, oldVal, newVal);
        };
    }
    HostElementConstructor.disconnectedCallback = function () {
        // the element has left the builing
        disconnectedCallback(plt, this);
    };
    HostElementConstructor['s-init'] = function () {
        initComponentLoaded(plt, this, hydratedCssClass);
    };
    {
        HostElementConstructor['s-hmr'] = function (hmrVersionId) {
            hmrStart(plt, cmpMeta, this, hmrVersionId);
        };
    }
    HostElementConstructor.forceUpdate = function () {
        queueUpdate(plt, this);
    };
    // add getters/setters to the host element members
    // these would come from the @Prop and @Method decorators that
    // should create the public API to this component
    proxyHostElementPrototype(plt, cmpMeta.membersMeta, HostElementConstructor);
}

function patchDomApi(config, plt, domApi) {
    const orgCreateElement = domApi.$createElement;
    domApi.$createElement = (tagName) => {
        const elm = orgCreateElement(tagName);
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta && !cmpMeta.componentConstructor) {
            initHostElement(plt, cmpMeta, elm, config.namespace);
            const hostSnapshot = initHostSnapshot(domApi, cmpMeta, elm);
            plt.hostSnapshotMap.set(elm, hostSnapshot);
            plt.requestBundle(cmpMeta, elm);
        }
        return elm;
    };
}

function proxyController(domApi, controllerComponents, ctrlTag) {
    return {
        'create': proxyProp(domApi, controllerComponents, ctrlTag, 'create'),
        'componentOnReady': proxyProp(domApi, controllerComponents, ctrlTag, 'componentOnReady')
    };
}
function proxyProp(domApi, controllerComponents, ctrlTag, proxyMethodName) {
    return function () {
        const args = arguments;
        return loadComponent(domApi, controllerComponents, ctrlTag)
            .then(ctrlElm => ctrlElm[proxyMethodName].apply(ctrlElm, args));
    };
}
function loadComponent(domApi, controllerComponents, ctrlTag) {
    let ctrlElm = controllerComponents[ctrlTag];
    const body = domApi.$doc.body;
    if (body) {
        if (!ctrlElm) {
            ctrlElm = body.querySelector(ctrlTag);
        }
        if (!ctrlElm) {
            ctrlElm = controllerComponents[ctrlTag] = domApi.$createElement(ctrlTag);
            domApi.$appendChild(body, ctrlElm);
        }
        return ctrlElm.componentOnReady();
    }
    return Promise.resolve();
}

function serverInitStyle(domApi, appliedStyleIds, cmpCtr) {
    if (!cmpCtr || !cmpCtr.style) {
        // no styles
        return;
    }
    const styleId = cmpCtr.is + (cmpCtr.styleMode || DEFAULT_STYLE_MODE);
    if (appliedStyleIds.has(styleId)) {
        // already initialized
        return;
    }
    appliedStyleIds.add(styleId);
    const styleElm = domApi.$createElement('style');
    styleElm.setAttribute('data-styles', '');
    styleElm.innerHTML = cmpCtr.style;
    domApi.$appendChild(domApi.$doc.head, styleElm);
}
function serverAttachStyles(plt, appliedStyleIds, cmpMeta, hostElm) {
    const shouldScopeCss = (cmpMeta.encapsulationMeta === 2 /* ScopedCss */ || (cmpMeta.encapsulationMeta === 1 /* ShadowDom */ && !plt.domApi.$supportsShadowDom));
    // create the style id w/ the host element's mode
    const styleModeId = cmpMeta.tagNameMeta + hostElm.mode;
    if (shouldScopeCss) {
        hostElm['s-sc'] = getScopeId(cmpMeta, hostElm.mode);
    }
    if (!appliedStyleIds.has(styleModeId)) {
        // doesn't look like there's a style template with the mode
        // create the style id using the default style mode and try again
        if (shouldScopeCss) {
            hostElm['s-sc'] = getScopeId(cmpMeta);
        }
    }
}

function createPlatformServer(config, outputTarget, win, doc, App, cmpRegistry, diagnostics, isPrerender, compilerCtx) {
    const loadedBundles = {};
    const appliedStyleIds = new Set();
    const controllerComponents = {};
    const domApi = createDomApi(App, win, doc);
    // init build context
    compilerCtx = compilerCtx || {};
    // the root <html> element is always the top level registered component
    cmpRegistry = Object.assign({ 'html': {} }, cmpRegistry);
    // initialize Core global object
    const Context = {};
    Context.enableListener = (instance, eventName, enabled, attachTo, passive) => enableEventListener(plt, instance, eventName, enabled, attachTo, passive);
    Context.emit = (elm, eventName, data) => domApi.$dispatchEvent(elm, Context.eventNameFn ? Context.eventNameFn(eventName) : eventName, data);
    Context.isClient = false;
    Context.isServer = true;
    Context.isPrerender = isPrerender;
    Context.window = win;
    Context.location = win.location;
    Context.document = doc;
    // add the Core global to the window context
    // Note: "Core" is not on the window context on the client-side
    win.Context = Context;
    // add the h() fn to the app's global namespace
    App.h = h;
    App.Context = Context;
    // add the app's global to the window context
    win[config.namespace] = App;
    const appBuildDir = getAppBuildDir(config, outputTarget);
    Context.resourcesUrl = Context.publicPath = appBuildDir;
    // create the sandboxed context with a new instance of a V8 Context
    // V8 Context provides an isolated global environment
    config.sys.vm.createContext(compilerCtx, outputTarget, win);
    // execute the global scripts (if there are any)
    runGlobalScripts();
    // internal id increment for unique ids
    let ids = 0;
    // create the platform api which is used throughout common core code
    const plt = {
        attachStyles: noop,
        defineComponent,
        domApi,
        emitEvent: Context.emit,
        getComponentMeta,
        getContextItem,
        isDefinedComponent,
        onError,
        nextId: () => config.namespace + (ids++),
        propConnect,
        queue: (Context.queue = createQueueServer()),
        requestBundle: requestBundle,
        tmpDisconnected: false,
        ancestorHostElementMap: new WeakMap(),
        componentAppliedStyles: new WeakMap(),
        hasConnectedMap: new WeakMap(),
        hasListenersMap: new WeakMap(),
        hasLoadedMap: new WeakMap(),
        hostElementMap: new WeakMap(),
        hostSnapshotMap: new WeakMap(),
        instanceMap: new WeakMap(),
        isDisconnectedMap: new WeakMap(),
        isQueuedForUpdate: new WeakMap(),
        onReadyCallbacksMap: new WeakMap(),
        queuedEvents: new WeakMap(),
        vnodeMap: new WeakMap(),
        valuesMap: new WeakMap()
    };
    // patch dom api like createElement()
    patchDomApi(config, plt, domApi);
    // create the renderer which will be used to patch the vdom
    plt.render = createRendererPatch(plt, domApi);
    // patch the componentOnReady fn
    initCoreComponentOnReady(plt, App);
    // setup the root node of all things
    // which is the mighty <html> tag
    const rootElm = domApi.$doc.documentElement;
    rootElm['s-ld'] = [];
    rootElm['s-rn'] = true;
    rootElm['s-init'] = function appLoadedCallback() {
        plt.hasLoadedMap.set(rootElm, true);
        appLoaded();
    };
    function appLoaded(failureDiagnostic) {
        if (plt.hasLoadedMap.has(rootElm) || failureDiagnostic) {
            // the root node has loaded
            plt.onAppLoad && plt.onAppLoad(rootElm, failureDiagnostic);
        }
    }
    function getComponentMeta(elm) {
        // registry tags are always lower-case
        return cmpRegistry[elm.nodeName.toLowerCase()];
    }
    function defineComponent(cmpMeta) {
        // default mode and color props
        cmpRegistry[cmpMeta.tagNameMeta] = cmpMeta;
    }
    function setLoadedBundle(bundleId, value) {
        loadedBundles[bundleId] = value;
    }
    function getLoadedBundle(bundleId) {
        if (bundleId == null) {
            return null;
        }
        return loadedBundles[bundleId.replace(/^\.\//, '')];
    }
    /**
     * Execute a bundle queue item
     * @param name
     * @param deps
     * @param callback
     */
    function execBundleCallback(name, deps, callback) {
        const bundleExports = {};
        try {
            callback(bundleExports, ...deps.map(d => getLoadedBundle(d)));
        }
        catch (e) {
            onError(e, 1 /* LoadBundleError */, null, true);
        }
        // If name is undefined then this callback was fired by component callback
        if (name === undefined) {
            return;
        }
        setLoadedBundle(name, bundleExports);
        // If name contains chunk then this callback was associated with a dependent bundle loading
        // let's add a reference to the constructors on each components metadata
        // each key in moduleImports is a PascalCased tag name
        if (!name.startsWith('chunk')) {
            Object.keys(bundleExports).forEach(pascalCasedTagName => {
                const normalizedTagName = pascalCasedTagName.replace(/-/g, '').toLowerCase();
                const registryTags = Object.keys(cmpRegistry);
                for (let i = 0; i < registryTags.length; i++) {
                    const normalizedRegistryTag = registryTags[i].replace(/-/g, '').toLowerCase();
                    if (normalizedRegistryTag === normalizedTagName) {
                        const cmpMeta = cmpRegistry[toDashCase(pascalCasedTagName)];
                        if (cmpMeta) {
                            // connect the component's constructor to its metadata
                            const componentConstructor = bundleExports[pascalCasedTagName];
                            if (!cmpMeta.componentConstructor) {
                                fillCmpMetaFromConstructor(componentConstructor, cmpMeta);
                                if (!cmpMeta.componentConstructor) {
                                    cmpMeta.componentConstructor = componentConstructor;
                                }
                            }
                            serverInitStyle(domApi, appliedStyleIds, componentConstructor);
                        }
                        break;
                    }
                }
            });
        }
    }
    /**
     * This function is called anytime a JS file is loaded
     */
    App.loadBundle = function loadBundle(bundleId, [, ...dependentsList], importer) {
        const missingDependents = dependentsList.filter(d => !getLoadedBundle(d));
        missingDependents.forEach(d => {
            const fileName = d.replace('.js', '.es5.js');
            loadFile(fileName);
        });
        execBundleCallback(bundleId, dependentsList, importer);
    };
    function isDefinedComponent(elm) {
        return !!(cmpRegistry[elm.tagName.toLowerCase()]);
    }
    plt.attachStyles = (plt, _domApi, cmpMeta, hostElm) => {
        serverAttachStyles(plt, appliedStyleIds, cmpMeta, hostElm);
    };
    // This is executed by the component's connected callback.
    function requestBundle(cmpMeta, elm) {
        // set the "mode" property
        if (!elm.mode) {
            // looks like mode wasn't set as a property directly yet
            // first check if there's an attribute
            // next check the app's global
            elm.mode = domApi.$getAttribute(elm, 'mode') || Context.mode;
        }
        // It is possible the data was loaded from an outside source like tests
        if (cmpRegistry[cmpMeta.tagNameMeta].componentConstructor) {
            serverInitStyle(domApi, appliedStyleIds, cmpRegistry[cmpMeta.tagNameMeta].componentConstructor);
            queueUpdate(plt, elm);
        }
        else {
            const bundleId = (typeof cmpMeta.bundleIds === 'string') ?
                cmpMeta.bundleIds :
                cmpMeta.bundleIds[elm.mode];
            if (getLoadedBundle(bundleId)) {
                // sweet, we've already loaded this bundle
                queueUpdate(plt, elm);
            }
            else {
                const fileName = getComponentBundleFilename(cmpMeta, elm.mode);
                loadFile(fileName);
            }
        }
    }
    function loadFile(fileName) {
        const jsFilePath = config.sys.path.join(appBuildDir, fileName);
        const jsCode = compilerCtx.fs.readFileSync(jsFilePath);
        config.sys.vm.runInContext(jsCode, win);
    }
    function runGlobalScripts() {
        if (!compilerCtx || !compilerCtx.appFiles || !compilerCtx.appFiles.global) {
            return;
        }
        config.sys.vm.runInContext(compilerCtx.appFiles.global, win);
    }
    function onError(err, type, elm, appFailure) {
        const diagnostic = {
            type: 'runtime',
            header: 'Runtime error detected',
            level: 'error',
            messageText: err ? err.message ? err.message : err.toString() : ''
        };
        if (err && err.stack) {
            diagnostic.messageText += '\n' + err.stack;
            diagnostic.messageText = diagnostic.messageText.trim();
        }
        switch (type) {
            case 1 /* LoadBundleError */:
                diagnostic.header += ' while loading bundle';
                break;
            case 2 /* QueueEventsError */:
                diagnostic.header += ' while running initial events';
                break;
            case 3 /* WillLoadError */:
                diagnostic.header += ' during componentWillLoad()';
                break;
            case 4 /* DidLoadError */:
                diagnostic.header += ' during componentDidLoad()';
                break;
            case 7 /* InitInstanceError */:
                diagnostic.header += ' while initializing instance';
                break;
            case 8 /* RenderError */:
                diagnostic.header += ' while rendering';
                break;
            case 6 /* DidUpdateError */:
                diagnostic.header += ' while updating';
                break;
        }
        if (elm && elm.tagName) {
            diagnostic.header += ': ' + elm.tagName.toLowerCase();
        }
        diagnostics.push(diagnostic);
        if (appFailure) {
            appLoaded(diagnostic);
        }
    }
    function propConnect(ctrlTag) {
        return proxyController(domApi, controllerComponents, ctrlTag);
    }
    function getContextItem(contextKey) {
        return Context[contextKey];
    }
    return plt;
}
function getComponentBundleFilename(cmpMeta, modeName) {
    let bundleId = (typeof cmpMeta.bundleIds === 'string') ?
        cmpMeta.bundleIds :
        (cmpMeta.bundleIds[modeName] || cmpMeta.bundleIds[DEFAULT_STYLE_MODE]);
    if (cmpMeta.encapsulationMeta === 2 /* ScopedCss */ || cmpMeta.encapsulationMeta === 1 /* ShadowDom */) {
        bundleId += '.sc';
    }
    // server-side always uses es5 and jsonp callback modules
    bundleId += '.es5.js';
    return bundleId;
}

var __awaiter$1 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class InMemoryFileSystem {
    constructor(disk, sys) {
        this.disk = disk;
        this.sys = sys;
        this.items = {};
    }
    accessData(filePath) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const item = this.getItem(filePath);
            const data = {
                exists: false,
                isDirectory: false,
                isFile: false
            };
            if (typeof item.exists === 'boolean') {
                data.exists = item.exists;
                data.isDirectory = item.isDirectory;
                data.isFile = item.isFile;
                return data;
            }
            try {
                const s = yield this.stat(filePath);
                item.exists = true;
                item.isDirectory = s.isDirectory;
                item.isFile = s.isFile;
                data.exists = item.exists;
                data.isDirectory = item.isDirectory;
                data.isFile = item.isFile;
            }
            catch (e) {
                item.exists = false;
            }
            return data;
        });
    }
    access(filePath) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const data = yield this.accessData(filePath);
            return data.exists;
        });
    }
    /**
     * Synchronous!!! Do not use!!!
     * (Only typescript transpiling is allowed to use)
     * @param filePath
     */
    accessSync(filePath) {
        const item = this.getItem(filePath);
        if (typeof item.exists === 'boolean') {
            return item.exists;
        }
        let hasAccess = false;
        try {
            const s = this.statSync(filePath);
            item.exists = true;
            item.isDirectory = s.isDirectory;
            item.isFile = s.isFile;
            hasAccess = true;
        }
        catch (e) {
            item.exists = false;
        }
        return hasAccess;
    }
    emptyDir(dirPath) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const item = this.getItem(dirPath);
            yield this.removeDir(dirPath);
            item.isFile = false;
            item.isDirectory = true;
            item.queueWriteToDisk = true;
            item.queueDeleteFromDisk = false;
        });
    }
    readdir(dirPath, opts = {}) {
        return __awaiter$1(this, void 0, void 0, function* () {
            dirPath = normalizePath(dirPath);
            const collectedPaths = [];
            if (opts.inMemoryOnly) {
                let inMemoryDir = dirPath;
                if (!inMemoryDir.endsWith('/')) {
                    inMemoryDir += '/';
                }
                const inMemoryDirs = dirPath.split('/');
                const filePaths = Object.keys(this.items);
                filePaths.forEach(filePath => {
                    if (!filePath.startsWith(dirPath)) {
                        return;
                    }
                    const parts = filePath.split('/');
                    if (parts.length === inMemoryDirs.length + 1 || (opts.recursive && parts.length > inMemoryDirs.length)) {
                        const d = this.items[filePath];
                        if (d.exists) {
                            const item = {
                                absPath: filePath,
                                relPath: parts[inMemoryDirs.length],
                                isDirectory: d.isDirectory,
                                isFile: d.isFile
                            };
                            collectedPaths.push(item);
                        }
                    }
                });
            }
            else {
                // always a disk read
                yield this.readDirectory(dirPath, dirPath, opts, collectedPaths);
            }
            return collectedPaths.sort((a, b) => {
                if (a.absPath < b.absPath)
                    return -1;
                if (a.absPath > b.absPath)
                    return 1;
                return 0;
            });
        });
    }
    readDirectory(initPath, dirPath, opts, collectedPaths) {
        return __awaiter$1(this, void 0, void 0, function* () {
            // used internally only so we could easily recursively drill down
            // loop through this directory and sub directories
            // always a disk read!!
            const dirItems = yield this.disk.readdir(dirPath);
            // cache some facts about this path
            const item = this.getItem(dirPath);
            item.exists = true;
            item.isFile = false;
            item.isDirectory = true;
            yield Promise.all(dirItems.map((dirItem) => __awaiter$1(this, void 0, void 0, function* () {
                // let's loop through each of the files we've found so far
                // create an absolute path of the item inside of this directory
                const absPath = normalizePath(this.sys.path.join(dirPath, dirItem));
                const relPath = normalizePath(this.sys.path.relative(initPath, absPath));
                // get the fs stats for the item, could be either a file or directory
                const stats = yield this.stat(absPath);
                // cache some stats about this path
                const subItem = this.getItem(absPath);
                subItem.exists = true;
                subItem.isDirectory = stats.isDirectory;
                subItem.isFile = stats.isFile;
                collectedPaths.push({
                    absPath: absPath,
                    relPath: relPath,
                    isDirectory: stats.isDirectory,
                    isFile: stats.isFile
                });
                if (opts.recursive && stats.isDirectory) {
                    // looks like it's yet another directory
                    // let's keep drilling down
                    yield this.readDirectory(initPath, absPath, opts, collectedPaths);
                }
            })));
        });
    }
    readFile(filePath, opts) {
        return __awaiter$1(this, void 0, void 0, function* () {
            if (!opts || (opts.useCache === true || opts.useCache === undefined)) {
                const item = this.getItem(filePath);
                if (item.exists && typeof item.fileText === 'string') {
                    return item.fileText;
                }
            }
            const fileContent = yield this.disk.readFile(filePath);
            const item = this.getItem(filePath);
            if (fileContent.length < MAX_TEXT_CACHE) {
                item.exists = true;
                item.isFile = true;
                item.isDirectory = false;
                item.fileText = fileContent;
            }
            return fileContent;
        });
    }
    /**
     * Synchronous!!! Do not use!!!
     * (Only typescript transpiling is allowed to use)
     * @param filePath
     */
    readFileSync(filePath, opts) {
        if (!opts || (opts.useCache === true || opts.useCache === undefined)) {
            const item = this.getItem(filePath);
            if (item.exists && typeof item.fileText === 'string') {
                return item.fileText;
            }
        }
        const fileContent = this.disk.readFileSync(filePath);
        const item = this.getItem(filePath);
        if (fileContent.length < MAX_TEXT_CACHE) {
            item.exists = true;
            item.isFile = true;
            item.isDirectory = false;
            item.fileText = fileContent;
        }
        return fileContent;
    }
    remove(itemPath) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const stats = yield this.stat(itemPath);
            if (stats.isDirectory) {
                yield this.removeDir(itemPath);
            }
            else if (stats.isFile) {
                yield this.removeItem(itemPath);
            }
        });
    }
    removeDir(dirPath) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const item = this.getItem(dirPath);
            item.isFile = false;
            item.isDirectory = true;
            if (!item.queueWriteToDisk) {
                item.queueDeleteFromDisk = true;
            }
            try {
                const dirItems = yield this.readdir(dirPath, { recursive: true });
                yield Promise.all(dirItems.map((item) => __awaiter$1(this, void 0, void 0, function* () {
                    yield this.removeItem(item.absPath);
                })));
            }
            catch (e) {
                // do not throw error if the directory never existed
            }
        });
    }
    removeItem(filePath) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const item = this.getItem(filePath);
            if (!item.queueWriteToDisk) {
                item.queueDeleteFromDisk = true;
            }
        });
    }
    stat(itemPath) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const item = this.getItem(itemPath);
            if (typeof item.isDirectory !== 'boolean' || typeof item.isFile !== 'boolean') {
                const s = yield this.disk.stat(itemPath);
                item.exists = true;
                item.isDirectory = s.isDirectory();
                item.isFile = s.isFile();
                item.size = s.size;
            }
            return {
                exists: !!item.exists,
                isFile: !!item.isFile,
                isDirectory: !!item.isDirectory,
                size: typeof item.size === 'number' ? item.size : 0
            };
        });
    }
    /**
     * Synchronous!!! Do not use!!!
     * (Only typescript transpiling is allowed to use)
     * @param itemPath
     */
    statSync(itemPath) {
        const item = this.getItem(itemPath);
        if (typeof item.isDirectory !== 'boolean' || typeof item.isFile !== 'boolean') {
            const s = this.disk.statSync(itemPath);
            item.exists = true;
            item.isDirectory = s.isDirectory();
            item.isFile = s.isFile();
        }
        return {
            isFile: item.isFile,
            isDirectory: item.isDirectory
        };
    }
    writeFile(filePath, content, opts) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const results = {};
            if (typeof filePath !== 'string') {
                throw new Error(`writeFile, invalid filePath: ${filePath}`);
            }
            if (typeof content !== 'string') {
                throw new Error(`writeFile, invalid content: ${filePath}`);
            }
            if (shouldIgnore(filePath)) {
                results.ignored = true;
                return results;
            }
            const item = this.getItem(filePath);
            item.exists = true;
            item.isFile = true;
            item.isDirectory = false;
            item.queueDeleteFromDisk = false;
            results.changedContent = item.fileText !== content;
            results.queuedWrite = false;
            item.fileText = content;
            if (opts && opts.useCache === false) {
                item.useCache = false;
            }
            if (opts && opts.inMemoryOnly) {
                // we don't want to actually write this to disk
                // just keep it in memory
                if (item.queueWriteToDisk) {
                    // we already queued this file to write to disk
                    // in that case we still need to do it
                    results.queuedWrite = true;
                }
                else {
                    // we only want this in memory and
                    // it wasn't already queued to be written
                    item.queueWriteToDisk = false;
                }
            }
            else if (opts && opts.immediateWrite) {
                // If this is an immediate write then write the file
                // and do not add it to the queue
                yield this.disk.writeFile(filePath, item.fileText);
            }
            else {
                // we want to write this to disk (eventually)
                // but only if the content is different
                // from our existing cached content
                if (!item.queueWriteToDisk && results.changedContent) {
                    // not already queued to be written
                    // and the content is different
                    item.queueWriteToDisk = true;
                    results.queuedWrite = true;
                }
            }
            return results;
        });
    }
    writeFiles(files, opts) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const writtenFiles = yield Promise.all(Object.keys(files).map((filePath) => __awaiter$1(this, void 0, void 0, function* () {
                const writtenFile = yield this.writeFile(filePath, files[filePath], opts);
                return writtenFile;
            })));
            return writtenFiles;
        });
    }
    commit() {
        return __awaiter$1(this, void 0, void 0, function* () {
            const instructions = getCommitInstructions(this.sys.path, this.items);
            // ensure directories we need exist
            const dirsAdded = yield this.commitEnsureDirs(instructions.dirsToEnsure);
            // write all queued the files
            const filesWritten = yield this.commitWriteFiles(instructions.filesToWrite);
            // remove all the queued files to be deleted
            const filesDeleted = yield this.commitDeleteFiles(instructions.filesToDelete);
            // remove all the queued dirs to be deleted
            const dirsDeleted = yield this.commitDeleteDirs(instructions.dirsToDelete);
            instructions.filesToDelete.forEach(fileToDelete => {
                this.clearFileCache(fileToDelete);
            });
            instructions.dirsToDelete.forEach(dirToDelete => {
                this.clearDirCache(dirToDelete);
            });
            // return only the files that were
            return {
                filesWritten: filesWritten,
                filesDeleted: filesDeleted,
                dirsDeleted: dirsDeleted,
                dirsAdded: dirsAdded
            };
        });
    }
    commitEnsureDirs(dirsToEnsure) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const dirsAdded = [];
            for (const dirPath of dirsToEnsure) {
                const item = this.getItem(dirPath);
                if (item.exists && item.isDirectory) {
                    // already cached that this path is indeed an existing directory
                    continue;
                }
                try {
                    // cache that we know this is a directory on disk
                    item.exists = true;
                    item.isDirectory = true;
                    item.isFile = false;
                    yield this.disk.mkdir(dirPath);
                    dirsAdded.push(dirPath);
                }
                catch (e) { }
            }
            return dirsAdded;
        });
    }
    commitWriteFiles(filesToWrite) {
        const writtenFiles = Promise.all(filesToWrite.map((filePath) => __awaiter$1(this, void 0, void 0, function* () {
            if (typeof filePath !== 'string') {
                throw new Error(`unable to writeFile without filePath`);
            }
            return this.commitWriteFile(filePath);
        })));
        return writtenFiles;
    }
    commitWriteFile(filePath) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const item = this.getItem(filePath);
            if (item.fileText == null) {
                throw new Error(`unable to find item fileText to write: ${filePath}`);
            }
            yield this.disk.writeFile(filePath, item.fileText);
            if (item.useCache === false) {
                this.clearFileCache(filePath);
            }
            return filePath;
        });
    }
    commitDeleteFiles(filesToDelete) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const deletedFiles = yield Promise.all(filesToDelete.map((filePath) => __awaiter$1(this, void 0, void 0, function* () {
                if (typeof filePath !== 'string') {
                    throw new Error(`unable to unlink without filePath`);
                }
                yield this.disk.unlink(filePath);
                return filePath;
            })));
            return deletedFiles;
        });
    }
    commitDeleteDirs(dirsToDelete) {
        return __awaiter$1(this, void 0, void 0, function* () {
            const dirsDeleted = [];
            for (const dirPath of dirsToDelete) {
                try {
                    yield this.disk.rmdir(dirPath);
                }
                catch (e) { }
                dirsDeleted.push(dirPath);
            }
            return dirsDeleted;
        });
    }
    clearDirCache(dirPath) {
        dirPath = normalizePath(dirPath);
        const filePaths = Object.keys(this.items);
        filePaths.forEach(f => {
            const filePath = this.sys.path.relative(dirPath, f).split('/')[0];
            if (!filePath.startsWith('.') && !filePath.startsWith('/')) {
                this.clearFileCache(f);
            }
        });
    }
    clearFileCache(filePath) {
        filePath = normalizePath(filePath);
        const item = this.items[filePath];
        if (item && !item.queueWriteToDisk) {
            delete this.items[filePath];
        }
    }
    cancelDeleteFilesFromDisk(filePaths) {
        filePaths.forEach(filePath => {
            const item = this.getItem(filePath);
            if (item.isFile && item.queueDeleteFromDisk) {
                item.queueDeleteFromDisk = false;
            }
        });
    }
    cancelDeleteDirectoriesFromDisk(dirPaths) {
        dirPaths.forEach(dirPath => {
            const item = this.getItem(dirPath);
            if (item.queueDeleteFromDisk) {
                item.queueDeleteFromDisk = false;
            }
        });
    }
    getItem(itemPath) {
        itemPath = normalizePath(itemPath);
        const item = this.items[itemPath];
        if (item) {
            return item;
        }
        return this.items[itemPath] = {};
    }
    clearCache() {
        this.items = {};
    }
    get keys() {
        return Object.keys(this.items).sort();
    }
    getMemoryStats() {
        return `data length: ${Object.keys(this.items).length}`;
    }
}
function getCommitInstructions(path$$1, d) {
    const instructions = {
        filesToDelete: [],
        filesToWrite: [],
        dirsToDelete: [],
        dirsToEnsure: []
    };
    Object.keys(d).forEach(itemPath => {
        const item = d[itemPath];
        if (item.queueWriteToDisk) {
            if (item.isFile) {
                instructions.filesToWrite.push(itemPath);
                const dir = normalizePath(path$$1.dirname(itemPath));
                if (!instructions.dirsToEnsure.includes(dir)) {
                    instructions.dirsToEnsure.push(dir);
                }
                const dirDeleteIndex = instructions.dirsToDelete.indexOf(dir);
                if (dirDeleteIndex > -1) {
                    instructions.dirsToDelete.splice(dirDeleteIndex, 1);
                }
                const fileDeleteIndex = instructions.filesToDelete.indexOf(itemPath);
                if (fileDeleteIndex > -1) {
                    instructions.filesToDelete.splice(fileDeleteIndex, 1);
                }
            }
            else if (item.isDirectory) {
                if (!instructions.dirsToEnsure.includes(itemPath)) {
                    instructions.dirsToEnsure.push(itemPath);
                }
                const dirDeleteIndex = instructions.dirsToDelete.indexOf(itemPath);
                if (dirDeleteIndex > -1) {
                    instructions.dirsToDelete.splice(dirDeleteIndex, 1);
                }
            }
        }
        else if (item.queueDeleteFromDisk) {
            if (item.isDirectory && !instructions.dirsToEnsure.includes(itemPath)) {
                instructions.dirsToDelete.push(itemPath);
            }
            else if (item.isFile && !instructions.filesToWrite.includes(itemPath)) {
                instructions.filesToDelete.push(itemPath);
            }
        }
        item.queueDeleteFromDisk = false;
        item.queueWriteToDisk = false;
    });
    // add all the ancestor directories for each directory too
    for (let i = 0, ilen = instructions.dirsToEnsure.length; i < ilen; i++) {
        const segments = instructions.dirsToEnsure[i].split('/');
        for (let j = 2; j < segments.length; j++) {
            const dir = segments.slice(0, j).join('/');
            if (!instructions.dirsToEnsure.includes(dir)) {
                instructions.dirsToEnsure.push(dir);
            }
        }
    }
    // sort directories so shortest paths are ensured first
    instructions.dirsToEnsure.sort((a, b) => {
        const segmentsA = a.split('/').length;
        const segmentsB = b.split('/').length;
        if (segmentsA < segmentsB)
            return -1;
        if (segmentsA > segmentsB)
            return 1;
        if (a.length < b.length)
            return -1;
        if (a.length > b.length)
            return 1;
        return 0;
    });
    // sort directories so longest paths are removed first
    instructions.dirsToDelete.sort((a, b) => {
        const segmentsA = a.split('/').length;
        const segmentsB = b.split('/').length;
        if (segmentsA < segmentsB)
            return 1;
        if (segmentsA > segmentsB)
            return -1;
        if (a.length < b.length)
            return 1;
        if (a.length > b.length)
            return -1;
        return 0;
    });
    instructions.dirsToEnsure.forEach(dirToEnsure => {
        const i = instructions.dirsToDelete.indexOf(dirToEnsure);
        if (i > -1) {
            instructions.dirsToDelete.splice(i, 1);
        }
    });
    instructions.dirsToDelete = instructions.dirsToDelete.filter(dir => {
        if (dir === '/' || dir.endsWith(':/')) {
            return false;
        }
        return true;
    });
    instructions.dirsToEnsure = instructions.dirsToEnsure.filter(dir => {
        if (d[dir] && d[dir].exists && d[dir].isDirectory) {
            return false;
        }
        if (dir === '/' || dir.endsWith(':/')) {
            return false;
        }
        return true;
    });
    return instructions;
}
function shouldIgnore(filePath) {
    filePath = filePath.trim().toLowerCase();
    return IGNORE.some(ignoreFile => filePath.endsWith(ignoreFile));
}
const IGNORE = [
    '.ds_store',
    '.gitignore',
    'desktop.ini',
    'thumbs.db'
];
// only cache if it's less than 5MB-ish (using .length as a rough guess)
// why 5MB? idk, seems like a good number for source text
// it's pretty darn large to cover almost ALL legitimate source files
// and anything larger is probably a REALLY large file and a rare case
// which we don't need to eat up memory for
const MAX_TEXT_CACHE = 5242880;

class TestingFs {
    constructor() {
        this.data = {};
        this.diskWrites = 0;
        this.diskReads = 0;
    }
    copyFile(srcPath, destPath) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.diskReads++;
                if (!this.data[srcPath]) {
                    reject(`copyFile, srcPath doesn't exists: ${srcPath}`);
                }
                else {
                    this.diskWrites++;
                    this.data[destPath] = this.data[srcPath];
                    resolve();
                }
            }, this.resolveTime);
        });
    }
    createReadStream(_filePath) {
        return {};
    }
    mkdir(dirPath) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                dirPath = normalizePath(dirPath);
                this.diskWrites++;
                if (this.data[dirPath]) {
                    reject(`mkdir, dir already exists: ${dirPath}`);
                }
                else {
                    this.data[dirPath] = {
                        isDirectory: true,
                        isFile: false
                    };
                    resolve();
                }
            }, this.resolveTime);
        });
    }
    mkdirSync(dirPath) {
        dirPath = normalizePath(dirPath);
        this.diskWrites++;
        if (this.data[dirPath]) {
            throw new Error(`mkdir, dir already exists: ${dirPath}`);
        }
        else {
            this.data[dirPath] = {
                isDirectory: true,
                isFile: false
            };
        }
    }
    readdir(dirPath) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const dirs = this.readdirSync(dirPath);
                    resolve(dirs.sort());
                }
                catch (e) {
                    reject(e);
                }
            }, this.resolveTime);
        });
    }
    readdirSync(dirPath) {
        dirPath = normalizePath(dirPath);
        this.diskReads++;
        if (!this.data[dirPath]) {
            throw new Error(`readdir, dir doesn't exists: ${dirPath}`);
        }
        const filePaths = Object.keys(this.data);
        const dirs = [];
        filePaths.forEach(f => {
            const pathRelative = path.relative(dirPath, f);
            // Windows: pathRelative =  ..\dir2\dir3\dir4\file2.js
            const dirItem = normalizePath(pathRelative).split('/')[0];
            if (!dirItem.startsWith('.') && !dirItem.startsWith('/')) {
                if (dirItem !== '' && !dirs.includes(dirItem)) {
                    dirs.push(dirItem);
                }
            }
        });
        return dirs;
    }
    readFile(filePath) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    resolve(this.readFileSync(filePath));
                }
                catch (e) {
                    reject(e);
                }
            }, this.resolveTime);
        });
    }
    readFileSync(filePath) {
        filePath = normalizePath(filePath);
        this.diskReads++;
        if (this.data[filePath] && typeof this.data[filePath].content === 'string') {
            return this.data[filePath].content;
        }
        throw new Error(`readFile, path doesn't exist: ${filePath}`);
    }
    rmdir(dirPath) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                dirPath = normalizePath(dirPath);
                if (!this.data[dirPath]) {
                    reject(`rmdir, dir doesn't exists: ${dirPath}`);
                }
                else {
                    Object.keys(this.data).forEach(item => {
                        if (item.startsWith(dirPath + '/') || item === dirPath) {
                            this.diskWrites++;
                            delete this.data[item];
                        }
                    });
                    resolve();
                }
            }, this.resolveTime);
        });
    }
    stat(itemPath) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    resolve(this.statSync(itemPath));
                }
                catch (e) {
                    reject(e);
                }
            }, this.resolveTime);
        });
    }
    statSync(itemPath) {
        itemPath = normalizePath(itemPath);
        this.diskReads++;
        if (this.data[itemPath]) {
            const isDirectory = this.data[itemPath].isDirectory;
            const isFile = this.data[itemPath].isFile;
            return {
                isDirectory: () => isDirectory,
                isFile: () => isFile,
                size: this.data[itemPath].content ? this.data[itemPath].content.length : 0
            };
        }
        throw new Error(`stat, path doesn't exist: ${itemPath}`);
    }
    unlink(filePath) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                filePath = normalizePath(filePath);
                this.diskWrites++;
                if (!this.data[filePath]) {
                    reject(`unlink, file doesn't exists: ${filePath}`);
                }
                else {
                    delete this.data[filePath];
                    resolve();
                }
            }, this.resolveTime);
        });
    }
    writeFile(filePath, content) {
        filePath = normalizePath(filePath);
        return new Promise(resolve => {
            setTimeout(() => {
                this.diskWrites++;
                this.data[filePath] = {
                    isDirectory: false,
                    isFile: true,
                    content: content
                };
                resolve();
            }, this.resolveTime);
        });
    }
    writeFileSync(filePath, content) {
        filePath = normalizePath(filePath);
        this.diskWrites++;
        this.data[filePath] = {
            isDirectory: false,
            isFile: true,
            content: content
        };
    }
    writeFiles(files) {
        return Promise.all(Object.keys(files).map(filePath => {
            return this.writeFile(filePath, files[filePath]);
        }));
    }
    get resolveTime() {
        return (Math.random() * 6);
    }
}

const relDistPath = path.join(__dirname, '..', '..', 'dist');
const nodeSys = require('../sys/node/index');
const NodeSystem = nodeSys.NodeSystem;
class TestingSystem extends NodeSystem {
    constructor() {
        const fs$$1 = new TestingFs();
        super(fs$$1);
        this.createFsWatcher = null;
        this.initWorkers(1, 1);
    }
    get compiler() {
        const compiler = super.compiler;
        compiler.name = 'test';
        compiler.version += '-test';
        return compiler;
    }
    getClientCoreFile(opts) {
        const filePath = path.join(relDistPath, 'client', opts.staticName);
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    tmpdir() {
        return path.join(path.resolve('/'), 'tmp', 'testing');
    }
}

function setBooleanConfig(config, configName, flagName, defaultValue) {
    if (flagName) {
        if (typeof config.flags[flagName] === 'boolean') {
            config[configName] = config.flags[flagName];
        }
    }
    const userConfigName = getUserConfigName(config, configName);
    if (typeof config[userConfigName] === 'function') {
        config[userConfigName] = !!config[userConfigName]();
    }
    if (typeof config[userConfigName] === 'boolean') {
        config[configName] = config[userConfigName];
    }
    else {
        config[configName] = defaultValue;
    }
}
function setNumberConfig(config, configName, _flagName, defaultValue) {
    const userConfigName = getUserConfigName(config, configName);
    if (typeof config[userConfigName] === 'function') {
        config[userConfigName] = config[userConfigName]();
    }
    if (typeof config[userConfigName] === 'number') {
        config[configName] = config[userConfigName];
    }
    else {
        config[configName] = defaultValue;
    }
}
function setStringConfig(config, configName, defaultValue) {
    const userConfigName = getUserConfigName(config, configName);
    if (typeof config[userConfigName] === 'function') {
        config[userConfigName] = config[userConfigName]();
    }
    if (typeof config[userConfigName] === 'string') {
        config[configName] = config[userConfigName];
    }
    else {
        config[configName] = defaultValue;
    }
}
function setArrayConfig(config, configName, defaultValue) {
    const userConfigName = getUserConfigName(config, configName);
    if (typeof config[userConfigName] === 'function') {
        config[userConfigName] = config[userConfigName]();
    }
    if (!Array.isArray(config[configName])) {
        if (Array.isArray(defaultValue)) {
            config[configName] = defaultValue.slice();
        }
        else {
            config[configName] = [];
        }
    }
}
function getUserConfigName(config, correctConfigName) {
    const userConfigNames = Object.keys(config);
    for (const userConfigName of userConfigNames) {
        if (userConfigName.toLowerCase() === correctConfigName.toLowerCase()) {
            if (userConfigName !== correctConfigName) {
                config.logger.warn(`config "${userConfigName}" should be "${correctConfigName}"`);
                return userConfigName;
            }
            break;
        }
    }
    return correctConfigName;
}

function validateAssetVerioning(config) {
    if (!config.assetVersioning) {
        config.assetVersioning = null;
        return;
    }
    if ((config.assetVersioning) === true) {
        config.assetVersioning = {};
    }
    const hashLength = config.hashedFileNameLength > 3 ? config.hashedFileNameLength : DEFAULTS.hashLength;
    setArrayConfig(config.assetVersioning, 'cssProperties', DEFAULTS.cssProperties);
    setNumberConfig(config.assetVersioning, 'hashLength', null, hashLength);
    setBooleanConfig(config.assetVersioning, 'queryMode', null, DEFAULTS.queryMode);
    setStringConfig(config.assetVersioning, 'prefix', DEFAULTS.separator);
    setStringConfig(config.assetVersioning, 'separator', DEFAULTS.separator);
    setBooleanConfig(config.assetVersioning, 'versionHtml', null, DEFAULTS.versionHtml);
    setBooleanConfig(config.assetVersioning, 'versionManifest', null, DEFAULTS.versionManifest);
    setBooleanConfig(config.assetVersioning, 'versionCssProperties', null, DEFAULTS.versionCssProperties);
}
const DEFAULTS = {
    cssProperties: ['background', 'background-url', 'url'],
    hashLength: 8,
    queryMode: false,
    pattern: '**/*.{css,js,png,jpg,jpeg,gif,svg,json,woff,woff2,ttf,eot}',
    prefix: '',
    separator: '.',
    versionHtml: true,
    versionManifest: true,
    versionCssProperties: true,
};

function validateCopy(config) {
    if (config.copy === null || config.copy === false) {
        // manually forcing to skip the copy task
        config.copy = null;
        return;
    }
    if (!Array.isArray(config.copy)) {
        config.copy = [];
    }
    if (!config.copy.some(c => c.src === DEFAULT_ASSETS.src)) {
        config.copy.push(DEFAULT_ASSETS);
    }
    if (!config.copy.some(c => c.src === DEFAULT_MANIFEST.src)) {
        config.copy.push(DEFAULT_MANIFEST);
    }
}
const DEFAULT_ASSETS = { src: 'assets', warn: false };
const DEFAULT_MANIFEST = { src: 'manifest.json', warn: false };

function validateDevServer(config) {
    config.devServer = config.devServer || {};
    if (typeof config.flags.address === 'string') {
        config.devServer.address = config.flags.address;
    }
    else {
        setStringConfig(config.devServer, 'address', '0.0.0.0');
    }
    if (typeof config.flags.port === 'number') {
        config.devServer.port = config.flags.port;
    }
    else {
        setNumberConfig(config.devServer, 'port', null, 3333);
    }
    setBooleanConfig(config.devServer, 'gzip', null, true);
    setBooleanConfig(config.devServer, 'hotReplacement', null, true);
    setBooleanConfig(config.devServer, 'openBrowser', null, true);
    validateProtocol(config.devServer);
    if (config.devServer.historyApiFallback !== null && config.devServer.historyApiFallback !== false) {
        config.devServer.historyApiFallback = config.devServer.historyApiFallback || {};
        if (typeof config.devServer.historyApiFallback.index !== 'string') {
            config.devServer.historyApiFallback.index = 'index.html';
        }
        if (typeof config.devServer.historyApiFallback.disableDotRule !== 'boolean') {
            config.devServer.historyApiFallback.disableDotRule = false;
        }
    }
    if (config.flags && config.flags.open === false) {
        config.devServer.openBrowser = false;
    }
    let serveDir = null;
    let baseUrl = null;
    const wwwOutputTarget = config.outputTargets.find(o => o.type === 'www');
    if (wwwOutputTarget) {
        serveDir = wwwOutputTarget.dir;
        baseUrl = wwwOutputTarget.baseUrl;
        config.logger.debug(`dev server www root: ${serveDir}, base url: ${baseUrl}`);
    }
    else {
        serveDir = config.rootDir;
        if (config.flags && config.flags.serve) {
            config.logger.debug(`dev server missing www output target, serving root directory: ${serveDir}`);
        }
    }
    if (typeof baseUrl !== 'string') {
        baseUrl = `/`;
    }
    baseUrl = normalizePath(baseUrl);
    if (!baseUrl.startsWith('/')) {
        baseUrl = '/' + baseUrl;
    }
    if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
    }
    setStringConfig(config.devServer, 'root', serveDir);
    setStringConfig(config.devServer, 'baseUrl', baseUrl);
    if (!config.sys.path.isAbsolute(config.devServer.root)) {
        config.devServer.root = pathJoin(config, config.rootDir, config.devServer.root);
    }
    if (config.devServer.excludeHmr) {
        if (!Array.isArray(config.devServer.excludeHmr)) {
            config.logger.error(`dev server excludeHmr must be an array of glob strings`);
        }
    }
    else {
        config.devServer.excludeHmr = [];
    }
    return config.devServer;
}
function validateProtocol(devServer) {
    if (typeof devServer.protocol === 'string') {
        let protocol = devServer.protocol.trim().toLowerCase();
        protocol = protocol.replace(':', '').replace('/', '');
        devServer.protocol = protocol;
    }
    if (devServer.protocol !== 'http' && devServer.protocol !== 'https') {
        devServer.protocol = 'http';
    }
}

function validateNamespace(config) {
    setStringConfig(config, 'namespace', DEFAULT_NAMESPACE);
    config.namespace = config.namespace.trim();
    const invalidNamespaceChars = config.namespace.replace(/(\w)|(\-)|(\$)/g, '');
    if (invalidNamespaceChars !== '') {
        throw new Error(`Namespace "${config.namespace}" contains invalid characters: ${invalidNamespaceChars}`);
    }
    if (config.namespace.length < 3) {
        throw new Error(`Namespace "${config.namespace}" must be at least 3 characters`);
    }
    if (/^\d+$/.test(config.namespace.charAt(0))) {
        throw new Error(`Namespace "${config.namespace}" cannot have a number for the first character`);
    }
    if (config.namespace.charAt(0) === '-') {
        throw new Error(`Namespace "${config.namespace}" cannot have a dash for the first character`);
    }
    if (config.namespace.charAt(config.namespace.length - 1) === '-') {
        throw new Error(`Namespace "${config.namespace}" cannot have a dash for the last character`);
    }
    // the file system namespace is the one
    // used in filenames and seen in the url
    setStringConfig(config, 'fsNamespace', config.namespace.toLowerCase());
    if (config.namespace.includes('-')) {
        // convert to PascalCase
        // this is the same namespace that gets put on "window"
        config.namespace = dashToPascalCase(config.namespace);
    }
}
const DEFAULT_NAMESPACE = 'App';

function validateDocs(config) {
    if (config.flags.docs || typeof config.flags.docsJson === 'string') {
        // docs flag
        config.outputTargets = config.outputTargets || [];
        if (!config.outputTargets.some(o => o.type === 'docs')) {
            // didn't provide a docs config, so let's add one
            const outputTarget = {
                type: 'docs'
            };
            if (typeof config.flags.docsJson === 'string') {
                outputTarget.jsonFile = config.flags.docsJson;
            }
            else if (config.flags.docs) {
                outputTarget.readmeDir = config.srcDir;
            }
            config.outputTargets.push(outputTarget);
        }
        const docsOutputs = config.outputTargets.filter(o => o.type === 'docs');
        docsOutputs.forEach(outputTarget => {
            validateDocsOutputTarget(config, outputTarget);
        });
    }
    else {
        if (config.outputTargets) {
            // remove docs if there is no docs flag
            config.outputTargets = config.outputTargets.filter(o => o.type !== 'docs');
        }
    }
}
function validateDocsOutputTarget(config, outputTarget) {
    if (typeof outputTarget.readmeDir === 'string' && !config.sys.path.isAbsolute(outputTarget.readmeDir)) {
        outputTarget.readmeDir = pathJoin(config, config.rootDir, outputTarget.readmeDir);
    }
    if (typeof outputTarget.jsonFile === 'string') {
        outputTarget.jsonFile = pathJoin(config, config.rootDir, outputTarget.jsonFile);
    }
}

function validateOutputTargetAngular(config) {
    const path$$1 = config.sys.path;
    const distOutputTargets = config.outputTargets.filter(o => o.type === 'angular');
    distOutputTargets.forEach(outputTarget => {
        outputTarget.excludeComponents = outputTarget.excludeComponents || [];
        if (typeof outputTarget.appBuild !== 'boolean') {
            outputTarget.appBuild = true;
        }
        if (!outputTarget.dir) {
            outputTarget.dir = DEFAULT_DIR;
        }
        if (!path$$1.isAbsolute(outputTarget.dir)) {
            outputTarget.dir = normalizePath(path$$1.join(config.rootDir, outputTarget.dir));
        }
        if (!outputTarget.buildDir) {
            outputTarget.buildDir = DEFAULT_BUILD_DIR;
        }
        if (!path$$1.isAbsolute(outputTarget.buildDir)) {
            outputTarget.buildDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.buildDir));
        }
        if (!outputTarget.typesDir) {
            outputTarget.typesDir = DEFAULT_TYPES_DIR;
        }
        if (!path$$1.isAbsolute(outputTarget.typesDir)) {
            outputTarget.typesDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.typesDir));
        }
        if (typeof outputTarget.empty !== 'boolean') {
            outputTarget.empty = DEFAULT_EMPTY_DIR;
        }
        if (typeof outputTarget.appBuild !== 'boolean') {
            outputTarget.appBuild = true;
        }
        if (!path$$1.isAbsolute(outputTarget.directivesProxyFile)) {
            outputTarget.directivesProxyFile = normalizePath(path$$1.join(config.rootDir, outputTarget.directivesProxyFile));
        }
        if (!path$$1.isAbsolute(outputTarget.directivesArrayFile)) {
            outputTarget.directivesArrayFile = normalizePath(path$$1.join(config.rootDir, outputTarget.directivesArrayFile));
        }
    });
}
const DEFAULT_DIR = 'dist';
const DEFAULT_BUILD_DIR = '';
const DEFAULT_EMPTY_DIR = true;
const DEFAULT_TYPES_DIR = 'types';

function validateOutputTargetDist(config) {
    const path$$1 = config.sys.path;
    const distOutputTargets = config.outputTargets.filter(o => o.type === 'dist');
    distOutputTargets.forEach(outputTarget => {
        if (!outputTarget.dir) {
            outputTarget.dir = DEFAULT_DIR$1;
        }
        if (!path$$1.isAbsolute(outputTarget.dir)) {
            outputTarget.dir = normalizePath(path$$1.join(config.rootDir, outputTarget.dir));
        }
        if (!outputTarget.buildDir) {
            outputTarget.buildDir = DEFAULT_BUILD_DIR$1;
        }
        if (!path$$1.isAbsolute(outputTarget.buildDir)) {
            outputTarget.buildDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.buildDir));
        }
        if (!outputTarget.collectionDir) {
            outputTarget.collectionDir = DEFAULT_COLLECTION_DIR;
        }
        if (!path$$1.isAbsolute(outputTarget.collectionDir)) {
            outputTarget.collectionDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.collectionDir));
        }
        if (!outputTarget.typesDir) {
            outputTarget.typesDir = DEFAULT_TYPES_DIR$1;
        }
        if (!path$$1.isAbsolute(outputTarget.typesDir)) {
            outputTarget.typesDir = normalizePath(path$$1.join(outputTarget.dir, outputTarget.typesDir));
        }
        if (typeof outputTarget.empty !== 'boolean') {
            outputTarget.empty = DEFAULT_EMPTY_DIR$1;
        }
        if (typeof outputTarget.appBuild !== 'boolean') {
            outputTarget.appBuild = true;
        }
    });
}
const DEFAULT_DIR$1 = 'dist';
const DEFAULT_BUILD_DIR$1 = '';
const DEFAULT_EMPTY_DIR$1 = true;
const DEFAULT_COLLECTION_DIR = 'collection';
const DEFAULT_TYPES_DIR$1 = 'types';

function validatePrerender(config, outputTarget) {
    let defaults;
    if (config.flags.prerender) {
        // forcing a prerender build
        defaults = FULL_PRERENDER_DEFAULTS;
    }
    else if (config.flags.ssr) {
        // forcing a ssr build
        defaults = SSR_DEFAULTS;
    }
    else {
        // not forcing a prerender build
        if (config.devMode) {
            // not forcing a prerender build
            // but we're in dev mode
            defaults = DEV_MODE_DEFAULTS;
        }
        else {
            // not forcing a prerender build
            // but we're in prod mode
            defaults = PROD_NON_HYDRATE_DEFAULTS;
        }
    }
    setStringConfig(outputTarget, 'baseUrl', defaults.baseUrl);
    setBooleanConfig(outputTarget, 'canonicalLink', null, defaults.canonicalLink);
    setBooleanConfig(outputTarget, 'collapseWhitespace', null, defaults.collapseWhitespace);
    setBooleanConfig(outputTarget, 'hydrateComponents', null, defaults.hydrateComponents);
    setBooleanConfig(outputTarget, 'inlineStyles', null, defaults.inlineStyles);
    setBooleanConfig(outputTarget, 'inlineLoaderScript', null, defaults.inlineLoaderScript);
    setNumberConfig(outputTarget, 'inlineAssetsMaxSize', null, defaults.inlineAssetsMaxSize);
    setBooleanConfig(outputTarget, 'prerenderUrlCrawl', null, defaults.prerenderUrlCrawl);
    setArrayConfig(outputTarget, 'prerenderLocations', defaults.prerenderLocations);
    setBooleanConfig(outputTarget, 'prerenderPathHash', null, defaults.prerenderPathHash);
    setBooleanConfig(outputTarget, 'prerenderPathQuery', null, defaults.prerenderPathQuery);
    setNumberConfig(outputTarget, 'prerenderMaxConcurrent', null, defaults.prerenderMaxConcurrent);
    setBooleanConfig(outputTarget, 'removeUnusedStyles', null, defaults.removeUnusedStyles);
    defaults.baseUrl = normalizePath(defaults.baseUrl);
    if (!outputTarget.baseUrl.startsWith('/')) {
        throw new Error(`baseUrl "${outputTarget.baseUrl}" must start with a slash "/". This represents an absolute path to the root of the domain.`);
    }
    if (!outputTarget.baseUrl.endsWith('/')) {
        outputTarget.baseUrl += '/';
    }
    if (config.flags.prerender && outputTarget.prerenderLocations.length === 0) {
        outputTarget.prerenderLocations.push({
            path: outputTarget.baseUrl
        });
    }
    if (outputTarget.hydrateComponents) {
        config.buildEs5 = true;
    }
}
const FULL_PRERENDER_DEFAULTS = {
    type: 'www',
    baseUrl: '/',
    canonicalLink: true,
    collapseWhitespace: true,
    hydrateComponents: true,
    inlineStyles: true,
    inlineLoaderScript: true,
    inlineAssetsMaxSize: 5000,
    prerenderUrlCrawl: true,
    prerenderPathHash: false,
    prerenderPathQuery: false,
    prerenderMaxConcurrent: 4,
    removeUnusedStyles: true
};
const SSR_DEFAULTS = {
    type: 'www',
    baseUrl: '/',
    canonicalLink: true,
    collapseWhitespace: true,
    hydrateComponents: true,
    inlineStyles: true,
    inlineLoaderScript: true,
    inlineAssetsMaxSize: 0,
    prerenderUrlCrawl: false,
    prerenderPathHash: false,
    prerenderPathQuery: false,
    prerenderMaxConcurrent: 0,
    removeUnusedStyles: false
};
const PROD_NON_HYDRATE_DEFAULTS = {
    type: 'www',
    baseUrl: '/',
    canonicalLink: false,
    collapseWhitespace: true,
    hydrateComponents: false,
    inlineStyles: false,
    inlineLoaderScript: true,
    inlineAssetsMaxSize: 0,
    prerenderUrlCrawl: false,
    prerenderPathHash: false,
    prerenderPathQuery: false,
    prerenderMaxConcurrent: 0,
    removeUnusedStyles: false
};
const DEV_MODE_DEFAULTS = {
    type: 'www',
    baseUrl: '/',
    canonicalLink: false,
    collapseWhitespace: false,
    hydrateComponents: false,
    inlineStyles: false,
    inlineLoaderScript: false,
    inlineAssetsMaxSize: 0,
    prerenderUrlCrawl: false,
    prerenderPathHash: false,
    prerenderPathQuery: false,
    prerenderMaxConcurrent: 0,
    removeUnusedStyles: false
};

function validateOutputTargetWww(config) {
    if (!Array.isArray(config.outputTargets)) {
        config.outputTargets = [
            { type: 'www' }
        ];
    }
    const wwwOutputTargets = config.outputTargets.filter(o => o.type === 'www');
    wwwOutputTargets.forEach(outputTarget => {
        validateOutputTarget(config, outputTarget);
    });
}
function validateOutputTarget(config, outputTarget) {
    const path$$1 = config.sys.path;
    setStringConfig(outputTarget, 'dir', DEFAULT_DIR$2);
    if (!path$$1.isAbsolute(outputTarget.dir)) {
        outputTarget.dir = pathJoin(config, config.rootDir, outputTarget.dir);
    }
    setStringConfig(outputTarget, 'buildDir', DEFAULT_BUILD_DIR$2);
    if (!path$$1.isAbsolute(outputTarget.buildDir)) {
        outputTarget.buildDir = pathJoin(config, outputTarget.dir, outputTarget.buildDir);
    }
    setStringConfig(outputTarget, 'indexHtml', DEFAULT_INDEX_HTML);
    if (!path$$1.isAbsolute(outputTarget.indexHtml)) {
        outputTarget.indexHtml = pathJoin(config, outputTarget.dir, outputTarget.indexHtml);
    }
    setBooleanConfig(outputTarget, 'empty', null, DEFAULT_EMPTY_DIR$2);
    validatePrerender(config, outputTarget);
    if (typeof outputTarget.appBuild !== 'boolean') {
        outputTarget.appBuild = true;
    }
}
const DEFAULT_DIR$2 = 'www';
const DEFAULT_INDEX_HTML = 'index.html';
const DEFAULT_BUILD_DIR$2 = 'build';
const DEFAULT_EMPTY_DIR$2 = true;

function validateResourcesUrl(outputTarget) {
    if (typeof outputTarget.resourcesUrl === 'string') {
        outputTarget.resourcesUrl = normalizePath(outputTarget.resourcesUrl.trim());
        if (outputTarget.resourcesUrl.charAt(outputTarget.resourcesUrl.length - 1) !== '/') {
            // ensure there's a trailing /
            outputTarget.resourcesUrl += '/';
        }
    }
}

var __awaiter$2 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const HOST_CONFIG_FILENAME = 'host.config.json';

function validateServiceWorker(config, outputTarget) {
    if (config.devMode && !config.flags.serviceWorker) {
        outputTarget.serviceWorker = null;
        return;
    }
    if (outputTarget.serviceWorker === false || outputTarget.serviceWorker === null) {
        outputTarget.serviceWorker = null;
        return;
    }
    if (!outputTarget.serviceWorker && outputTarget.type !== 'www') {
        outputTarget.serviceWorker = null;
        return;
    }
    if (outputTarget.serviceWorker === true) {
        outputTarget.serviceWorker = {};
    }
    else if (!outputTarget.serviceWorker && config.devMode) {
        outputTarget.serviceWorker = null;
        return;
    }
    if (typeof outputTarget.serviceWorker !== 'object') {
        // what was passed in could have been a boolean
        // in that case let's just turn it into an empty obj so Object.assign doesn't crash
        outputTarget.serviceWorker = {};
    }
    if (!Array.isArray(outputTarget.serviceWorker.globPatterns)) {
        if (typeof outputTarget.serviceWorker.globPatterns === 'string') {
            outputTarget.serviceWorker.globPatterns = [outputTarget.serviceWorker.globPatterns];
        }
        else if (typeof outputTarget.serviceWorker.globPatterns !== 'string') {
            outputTarget.serviceWorker.globPatterns = [DEFAULT_GLOB_PATTERNS];
        }
    }
    if (typeof outputTarget.serviceWorker.globDirectory !== 'string') {
        outputTarget.serviceWorker.globDirectory = outputTarget.dir;
    }
    if (typeof outputTarget.serviceWorker.globIgnores === 'string') {
        outputTarget.serviceWorker.globIgnores = [outputTarget.serviceWorker.globIgnores];
    }
    outputTarget.serviceWorker.globIgnores = outputTarget.serviceWorker.globIgnores || [];
    addGlobIgnores(config, outputTarget.serviceWorker.globIgnores);
    if (!outputTarget.serviceWorker.swDest) {
        outputTarget.serviceWorker.swDest = config.sys.path.join(outputTarget.dir, DEFAULT_FILENAME);
    }
    if (!config.sys.path.isAbsolute(outputTarget.serviceWorker.swDest)) {
        outputTarget.serviceWorker.swDest = config.sys.path.join(outputTarget.dir, outputTarget.serviceWorker.swDest);
    }
}
function addGlobIgnores(config, globIgnores) {
    const appRegistry = `**/${getRegistryFileName(config)}`;
    globIgnores.push(appRegistry);
    const appGlobal = `**/${getGlobalFileName(config)}`;
    globIgnores.push(appGlobal);
    const hostConfigJson = `**/${HOST_CONFIG_FILENAME}`;
    globIgnores.push(hostConfigJson);
}
const DEFAULT_GLOB_PATTERNS = '**/*.{js,css,json,html,ico,png,svg}';
const DEFAULT_FILENAME = 'sw.js';

function validateStats(config) {
    if (config.flags.stats) {
        const hasOutputTarget = config.outputTargets.some(o => o.type === 'stats');
        if (!hasOutputTarget) {
            config.outputTargets.push({
                type: 'stats'
            });
        }
    }
    const outputTargets = config.outputTargets.filter(o => o.type === 'stats');
    outputTargets.forEach(outputTarget => {
        validateStatsOutputTarget(config, outputTarget);
    });
}
function validateStatsOutputTarget(config, outputTarget) {
    if (!outputTarget.file) {
        outputTarget.file = DEFAULT_JSON_FILE_NAME;
    }
    if (!config.sys.path.isAbsolute(outputTarget.file)) {
        outputTarget.file = pathJoin(config, config.rootDir, outputTarget.file);
    }
}
const DEFAULT_JSON_FILE_NAME = 'stencil-stats.json';

/**
 * DEPRECATED "config" generateWWW, wwwDir, emptyWWW, generateDistribution, distDir, emptyDist
 * since 0.7.0, 2018-03-02
 */
function _deprecatedToMultipleTarget(config) {
    const deprecatedConfigs = [];
    if (config.generateWWW !== undefined) {
        deprecatedConfigs.push('generateWWW');
        if (config.generateWWW) {
            config.outputTargets = config.outputTargets || [];
            let o = config.outputTargets.find(o => o.type === 'www');
            if (!o) {
                o = { type: 'www' };
                config.outputTargets.push(o);
            }
        }
        delete config.generateWWW;
    }
    if (config.emptyWWW !== undefined) {
        deprecatedConfigs.push('emptyWWW');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www' };
            config.outputTargets.push(o);
        }
        o.empty = !!config.emptyWWW;
        delete config.emptyWWW;
    }
    if (config.wwwDir !== undefined) {
        deprecatedConfigs.push('wwwDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www' };
            config.outputTargets.push(o);
        }
        o.dir = config.wwwDir;
        delete config.wwwDir;
    }
    if (config.buildDir !== undefined) {
        deprecatedConfigs.push('buildDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www' };
            config.outputTargets.push(o);
        }
        o.buildDir = config.buildDir;
        delete config.buildDir;
    }
    if (config.wwwIndexHtml !== undefined) {
        deprecatedConfigs.push('wwwIndexHtml');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www' };
            config.outputTargets.push(o);
        }
        o.indexHtml = config.wwwIndexHtml;
        delete config.wwwIndexHtml;
    }
    if (config.generateDistribution !== undefined) {
        deprecatedConfigs.push('generateDistribution');
        if (config.generateDistribution) {
            config.outputTargets = config.outputTargets || [];
            let o = config.outputTargets.find(o => o.type === 'dist');
            if (!o) {
                o = { type: 'dist' };
                config.outputTargets.push(o);
            }
        }
        delete config.generateDistribution;
    }
    if (config.distDir !== undefined) {
        deprecatedConfigs.push('distDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'dist');
        if (!o) {
            o = { type: 'dist' };
            config.outputTargets.push(o);
        }
        o.dir = config.distDir;
        delete config.distDir;
    }
    if (config.emptyDist !== undefined) {
        deprecatedConfigs.push('emptyDist');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'dist');
        if (!o) {
            o = { type: 'dist' };
            config.outputTargets.push(o);
        }
        o.empty = !!config.emptyDist;
        delete config.emptyDist;
    }
    if (config.collectionDir !== undefined) {
        deprecatedConfigs.push('collectionDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'dist');
        if (!o) {
            o = { type: 'dist' };
            config.outputTargets.push(o);
        }
        o.dir = config.collectionDir;
        delete config.collectionDir;
    }
    if (config.typesDir !== undefined) {
        deprecatedConfigs.push('typesDir');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'dist');
        if (!o) {
            o = { type: 'dist' };
            config.outputTargets.push(o);
        }
        o.dir = config.typesDir;
        delete config.typesDir;
    }
    if (config.publicPath !== undefined) {
        deprecatedConfigs.push('publicPath');
        config.outputTargets = config.outputTargets || [];
        const www = config.outputTargets.find(o => o.type === 'www');
        if (www) {
            www.resourcesUrl = config.publicPath;
        }
        delete config.publicPath;
    }
    if (config.serviceWorker !== undefined) {
        deprecatedConfigs.push('serviceWorker');
        config.outputTargets = config.outputTargets || [];
        let o = config.outputTargets.find(o => o.type === 'www');
        if (!o) {
            o = { type: 'www', serviceWorker: config.serviceWorker };
            config.outputTargets.push(o);
        }
        else {
            o.serviceWorker = config.serviceWorker;
        }
        delete config.serviceWorker;
    }
    if (config.prerender !== undefined) {
        deprecatedConfigs.push('prerender');
        delete config.prerender;
    }
    if (deprecatedConfigs.length > 0) {
        const warningMsg = [
            `As of v0.7.0, the config `,
            deprecatedConfigs.length > 1 ? `properties ` : `property `,
            `"${deprecatedConfigs.join(', ')}" `,
            deprecatedConfigs.length > 1 ? `have ` : `has `,
            `been deprecated in favor of a multiple output target configuration. `,
            `Please use the "outputTargets" config which `,
            `is an array of output targets. `,
            `Note that not having an "outputTarget" config will default `,
            `to have an { type: "www" } output target. `,
            `More information aobut the new format can be found here: https://stenciljs.com/docs/config`
        ];
        config.logger.warn(warningMsg.join(''));
    }
    return deprecatedConfigs;
}

function validateOutputTargets(config) {
    // setup outputTargets from deprecated config properties
    _deprecatedToMultipleTarget(config);
    if (Array.isArray(config.outputTargets)) {
        config.outputTargets.forEach(outputTarget => {
            if (typeof outputTarget.type !== 'string') {
                outputTarget.type = 'www';
            }
            outputTarget.type = outputTarget.type.trim().toLowerCase();
            if (!VALID_TYPES.includes(outputTarget.type)) {
                throw new Error(`invalid outputTarget type "${outputTarget.type}". Valid target types: ${VALID_TYPES.join(', ')}`);
            }
        });
    }
    validateOutputTargetWww(config);
    validateOutputTargetDist(config);
    validateOutputTargetAngular(config);
    validateDocs(config);
    validateStats(config);
    if (!config.outputTargets || config.outputTargets.length === 0) {
        throw new Error(`outputTarget required`);
    }
    config.outputTargets.forEach(outputTarget => {
        validateResourcesUrl(outputTarget);
        validateServiceWorker(config, outputTarget);
    });
}
const VALID_TYPES = ['angular', 'dist', 'docs', 'stats', 'www'];

function validatePaths(config) {
    const path$$1 = config.sys.path;
    if (typeof config.globalScript === 'string' && !path$$1.isAbsolute(config.globalScript)) {
        if (!path$$1.isAbsolute(config.globalScript)) {
            config.globalScript = path$$1.join(config.rootDir, config.globalScript);
        }
        config.globalScript = normalizePath(config.globalScript);
    }
    if (Array.isArray(config.globalStyle)) {
        // DEPRECATED 2018-05-31
        config.logger.warn(`"globalStyle" config no longer accepts an array. Please update to only use a single entry point for a global style css file.`);
        if (config.globalStyle.length > 0) {
            config.globalStyle = config.globalStyle[0];
        }
    }
    if (typeof config.globalStyle === 'string') {
        if (!path$$1.isAbsolute(config.globalStyle)) {
            config.globalStyle = path$$1.join(config.rootDir, config.globalStyle);
        }
        config.globalStyle = normalizePath(config.globalStyle);
    }
    setStringConfig(config, 'srcDir', DEFAULT_SRC_DIR);
    if (!path$$1.isAbsolute(config.srcDir)) {
        config.srcDir = path$$1.join(config.rootDir, config.srcDir);
    }
    config.srcDir = normalizePath(config.srcDir);
    setStringConfig(config, 'cacheDir', DEFAULT_CACHE_DIR);
    if (!path$$1.isAbsolute(config.cacheDir)) {
        config.cacheDir = path$$1.join(config.rootDir, config.cacheDir);
    }
    config.cacheDir = normalizePath(config.cacheDir);
    setStringConfig(config, 'tsconfig', DEFAULT_TSCONFIG);
    if (!path$$1.isAbsolute(config.tsconfig)) {
        config.tsconfig = path$$1.join(config.rootDir, config.tsconfig);
    }
    config.tsconfig = normalizePath(config.tsconfig);
    setStringConfig(config, 'srcIndexHtml', normalizePath(path$$1.join(config.srcDir, DEFAULT_INDEX_HTML$1)));
    if (!path$$1.isAbsolute(config.srcIndexHtml)) {
        config.srcIndexHtml = path$$1.join(config.rootDir, config.srcIndexHtml);
    }
    config.srcIndexHtml = normalizePath(config.srcIndexHtml);
    if (config.writeLog) {
        setStringConfig(config, 'buildLogFilePath', DEFAULT_BUILD_LOG_FILE_NAME);
        if (!path$$1.isAbsolute(config.buildLogFilePath)) {
            config.buildLogFilePath = path$$1.join(config.rootDir, config.buildLogFilePath);
        }
        config.buildLogFilePath = normalizePath(config.buildLogFilePath);
        config.logger.buildLogFilePath = config.buildLogFilePath;
    }
}
const DEFAULT_BUILD_LOG_FILE_NAME = 'stencil-build.log';
const DEFAULT_CACHE_DIR = '.stencil';
const DEFAULT_INDEX_HTML$1 = 'index.html';
const DEFAULT_SRC_DIR = 'src';
const DEFAULT_TSCONFIG = 'tsconfig.json';

function validatePlugins(config) {
    config.plugins = (config.plugins || []).filter(p => !!p);
}

function validateWorkers(config) {
    let cpus = 1;
    if (config.sys && config.sys.details && typeof config.sys.details.cpus === 'number') {
        cpus = config.sys.details.cpus;
    }
    if (typeof config.maxConcurrentWorkers !== 'number') {
        config.maxConcurrentWorkers = cpus;
    }
    if (config.flags && typeof config.flags.maxWorkers === 'number') {
        config.maxConcurrentWorkers = config.flags.maxWorkers;
    }
    config.maxConcurrentWorkers = Math.max(Math.min(config.maxConcurrentWorkers, cpus), 1);
    if (typeof config.maxConcurrentTasksPerWorker !== 'number') {
        config.maxConcurrentTasksPerWorker = DEFAULT_MAX_TASKS_PER_WORKER;
    }
    config.maxConcurrentTasksPerWorker = Math.max(Math.min(config.maxConcurrentTasksPerWorker, 20), 1);
}
const DEFAULT_MAX_TASKS_PER_WORKER = 2;

function validateRollupConfig(config) {
    const cleanRollupConfig = getCleanRollupConfig(config.rollupConfig);
    config.rollupConfig = cleanRollupConfig;
}
function getCleanRollupConfig(rollupConfig) {
    let cleanRollupConfig = DEFAULT_ROLLUP_CONFIG;
    if (!rollupConfig || !isObject(rollupConfig)) {
        return cleanRollupConfig;
    }
    if (rollupConfig.inputOptions && isObject(rollupConfig.inputOptions)) {
        cleanRollupConfig = Object.assign({}, cleanRollupConfig, { inputOptions: pluck(rollupConfig.inputOptions, ['context', 'moduleContext']) });
    }
    if (rollupConfig.outputOptions && isObject(rollupConfig.outputOptions)) {
        cleanRollupConfig = Object.assign({}, cleanRollupConfig, { outputOptions: pluck(rollupConfig.outputOptions, ['globals']) });
    }
    return cleanRollupConfig;
}
const DEFAULT_ROLLUP_CONFIG = {
    inputOptions: {},
    outputOptions: {}
};

/**
 * DEPRECATED "config.collections" since 0.6.0, 2018-02-13
 */
function _deprecatedValidateConfigCollections(config) {
    if (!Array.isArray(config.collections)) {
        return;
    }
    const deprecatedCollections = config.collections;
    if (deprecatedCollections.length > 0) {
        const errorMsg = [
            `As of v0.6.0, "config.collections" has been deprecated in favor of standard ES module imports. `,
            `Instead of listing collections within the stencil config, collections should now be `,
            `imported by the app's root component or module. The benefit of this is to not only simplify `,
            `the config by using a standards approach for imports, but to also automatically import the `,
            `collection's types to improve development. Please remove "config.collections" `,
            `from the "stencil.config.js" file, and add `,
            deprecatedCollections.length === 1 ? `this import ` : `these imports `,
            `to your root component or root module:  `
        ];
        deprecatedCollections.forEach(collection => {
            errorMsg.push(`import '${collection.name}';  `);
        });
        config.logger.error(errorMsg.join(''));
    }
}

function validateConfig(config, setEnvVariables) {
    if (!config) {
        throw new Error(`invalid build config`);
    }
    if (config._isValidated) {
        // don't bother if we've already validated this config
        return config;
    }
    if (!config.logger) {
        throw new Error(`config.logger required`);
    }
    if (!config.rootDir) {
        throw new Error('config.rootDir required');
    }
    if (!config.sys) {
        throw new Error('config.sys required');
    }
    config.flags = config.flags || {};
    if (config.flags.debug) {
        config.logLevel = 'debug';
    }
    else if (config.flags.logLevel) {
        config.logLevel = config.flags.logLevel;
    }
    else if (typeof config.logLevel !== 'string') {
        config.logLevel = 'info';
    }
    config.logger.level = config.logLevel;
    setBooleanConfig(config, 'writeLog', 'log', false);
    setBooleanConfig(config, 'buildAppCore', null, true);
    // default devMode false
    if (config.flags.prod) {
        config.devMode = false;
    }
    else if (config.flags.dev) {
        config.devMode = true;
    }
    else {
        setBooleanConfig(config, 'devMode', null, DEFAULT_DEV_MODE);
    }
    // get a good namespace
    validateNamespace(config);
    // figure out all of the config paths and absolute paths
    validatePaths(config);
    // setup the outputTargets
    validateOutputTargets(config);
    // validate how many workers we can use
    validateWorkers(config);
    // default devInspector to whatever devMode is
    setBooleanConfig(config, 'devInspector', null, config.devMode);
    // default watch false
    setBooleanConfig(config, 'watch', 'watch', false);
    setBooleanConfig(config, 'minifyCss', null, !config.devMode);
    setBooleanConfig(config, 'minifyJs', null, !config.devMode);
    setBooleanConfig(config, 'buildEs5', 'es5', !config.devMode);
    setBooleanConfig(config, 'hashFileNames', null, !(config.devMode || config.watch));
    setNumberConfig(config, 'hashedFileNameLength', null, DEFAULT_HASHED_FILENAME_LENTH);
    if (config.hashFileNames) {
        if (config.hashedFileNameLength < MIN_HASHED_FILENAME_LENTH) {
            throw new Error(`config.hashedFileNameLength must be at least ${MIN_HASHED_FILENAME_LENTH} characters`);
        }
        if (config.hashedFileNameLength > MAX_HASHED_FILENAME_LENTH) {
            throw new Error(`config.hashedFileNameLength cannot be more than ${MAX_HASHED_FILENAME_LENTH} characters`);
        }
    }
    validateCopy(config);
    validatePlugins(config);
    validateAssetVerioning(config);
    validateDevServer(config);
    if (!config.watchIgnoredRegex) {
        config.watchIgnoredRegex = DEFAULT_WATCH_IGNORED_REGEX;
    }
    setStringConfig(config, 'hydratedCssClass', DEFAULT_HYDRATED_CSS_CLASS);
    setBooleanConfig(config, 'generateDocs', 'docs', false);
    setBooleanConfig(config, 'enableCache', 'cache', true);
    if (!Array.isArray(config.includeSrc)) {
        config.includeSrc = DEFAULT_INCLUDES.map(include => {
            return config.sys.path.join(config.srcDir, include);
        });
    }
    if (!Array.isArray(config.excludeSrc)) {
        config.excludeSrc = DEFAULT_EXCLUDES.slice();
    }
    /**
     * DEPRECATED "config.collections" since 0.6.0, 2018-02-13
     */
    _deprecatedValidateConfigCollections(config);
    setArrayConfig(config, 'plugins');
    setArrayConfig(config, 'bundles');
    // set to true so it doesn't bother going through all this again on rebuilds
    config._isValidated = true;
    if (setEnvVariables !== false) {
        setProcessEnvironment(config);
    }
    validateRollupConfig(config);
    return config;
}
function setProcessEnvironment(config) {
    process.env.NODE_ENV = config.devMode ? 'development' : 'production';
}
const DEFAULT_DEV_MODE = false;
const DEFAULT_HASHED_FILENAME_LENTH = 8;
const MIN_HASHED_FILENAME_LENTH = 4;
const MAX_HASHED_FILENAME_LENTH = 32;
const DEFAULT_INCLUDES = ['**/*.ts', '**/*.tsx'];
const DEFAULT_EXCLUDES = ['**/test/**', '**/*.spec.*'];
const DEFAULT_WATCH_IGNORED_REGEX = /(?:^|[\\\/])(\.(?!\.)[^\\\/]+)$/i;
const DEFAULT_HYDRATED_CSS_CLASS = 'hydrated';

function cleanDiagnostics(diagnostics) {
    const cleaned = [];
    const maxErrors = Math.min(diagnostics.length, MAX_ERRORS);
    const dups = {};
    for (var i = 0; i < maxErrors; i++) {
        const d = diagnostics[i];
        const key = d.absFilePath + d.code + d.messageText + d.type;
        if (dups[key]) {
            continue;
        }
        dups[key] = true;
        if (d.messageText) {
            if (typeof d.messageText.message === 'string') {
                d.messageText = d.messageText.message;
            }
            else if (typeof d.messageText === 'string' && d.messageText.indexOf('Error: ') === 0) {
                d.messageText = d.messageText.substr(7);
            }
        }
        cleaned.push(d);
    }
    return cleaned;
}
function splitLineBreaks(sourceText) {
    if (!sourceText)
        return [];
    sourceText = sourceText.replace(/\\r/g, '\n');
    return sourceText.split('\n');
}
const MAX_ERRORS = 15;

function genereateHmr(config, compilerCtx, buildCtx) {
    if (!config.devServer || !config.devServer.hotReplacement || !buildCtx.isRebuild) {
        return null;
    }
    const hmr = {};
    if (buildCtx.scriptsAdded.length > 0) {
        hmr.scriptsAdded = buildCtx.scriptsAdded.slice();
    }
    if (buildCtx.scriptsDeleted.length > 0) {
        hmr.scriptsDeleted = buildCtx.scriptsDeleted.slice();
    }
    const excludeHmr = excludeHmrFiles(config, config.devServer.excludeHmr, buildCtx.filesChanged);
    if (excludeHmr.length > 0) {
        hmr.excludeHmr = excludeHmr.slice();
    }
    if (buildCtx.hasIndexHtmlChanges) {
        hmr.indexHtmlUpdated = true;
    }
    if (buildCtx.hasServiceWorkerChanges) {
        hmr.serviceWorkerUpdated = true;
    }
    const componentsUpdated = getComponentsUpdated(compilerCtx, buildCtx);
    if (componentsUpdated) {
        hmr.componentsUpdated = componentsUpdated;
    }
    if (Object.keys(buildCtx.stylesUpdated).length > 0) {
        hmr.inlineStylesUpdated = buildCtx.stylesUpdated.map(s => {
            return {
                styleTag: s.styleTag,
                styleMode: s.styleMode,
                styleText: s.styleText,
                isScoped: s.isScoped
            };
        }).sort((a, b) => {
            if (a.styleTag < b.styleTag)
                return -1;
            if (a.styleTag > b.styleTag)
                return 1;
            return 0;
        });
    }
    const externalStylesUpdated = getExternalStylesUpdated(config, buildCtx);
    if (externalStylesUpdated) {
        hmr.externalStylesUpdated = externalStylesUpdated;
    }
    const externalImagesUpdated = getImagesUpdated(config, buildCtx);
    if (externalImagesUpdated) {
        hmr.imagesUpdated = externalImagesUpdated;
    }
    if (Object.keys(hmr).length === 0) {
        return null;
    }
    hmr.versionId = Date.now().toString().substring(6);
    return hmr;
}
function getComponentsUpdated(compilerCtx, buildCtx) {
    // find all of the components that would be affected from the file changes
    if (!buildCtx.filesChanged) {
        return null;
    }
    const filesToLookForImporters = buildCtx.filesChanged.filter(f => {
        return f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx');
    });
    if (filesToLookForImporters.length === 0) {
        return null;
    }
    const changedScriptFiles = [];
    const checkedFiles = [];
    const allModuleFiles = Object.keys(compilerCtx.moduleFiles)
        .map(tsFilePath => compilerCtx.moduleFiles[tsFilePath])
        .filter(moduleFile => moduleFile.localImports && moduleFile.localImports.length > 0);
    while (filesToLookForImporters.length > 0) {
        const scriptFile = filesToLookForImporters.shift();
        addTsFileImporters(allModuleFiles, filesToLookForImporters, checkedFiles, changedScriptFiles, scriptFile);
    }
    const tags = changedScriptFiles.reduce((tags, changedTsFile) => {
        const moduleFile = compilerCtx.moduleFiles[changedTsFile];
        if (moduleFile && moduleFile.cmpMeta && moduleFile.cmpMeta.tagNameMeta) {
            if (!tags.includes(moduleFile.cmpMeta.tagNameMeta)) {
                tags.push(moduleFile.cmpMeta.tagNameMeta);
            }
        }
        return tags;
    }, []);
    if (tags.length === 0) {
        return null;
    }
    return tags.sort();
}
function addTsFileImporters(allModuleFiles, filesToLookForImporters, checkedFiles, changedScriptFiles, scriptFile) {
    if (!changedScriptFiles.includes(scriptFile)) {
        // add it to our list of files to transpile
        changedScriptFiles.push(scriptFile);
    }
    if (checkedFiles.includes(scriptFile)) {
        // already checked this file
        return;
    }
    checkedFiles.push(scriptFile);
    // get all the ts files that import this ts file
    const tsFilesThatImportsThisTsFile = allModuleFiles.reduce((arr, moduleFile) => {
        moduleFile.localImports.forEach(localImport => {
            let checkFile = localImport;
            if (checkFile === scriptFile) {
                arr.push(moduleFile.sourceFilePath);
                return;
            }
            checkFile = localImport + '.tsx';
            if (checkFile === scriptFile) {
                arr.push(moduleFile.sourceFilePath);
                return;
            }
            checkFile = localImport + '.ts';
            if (checkFile === scriptFile) {
                arr.push(moduleFile.sourceFilePath);
                return;
            }
            checkFile = localImport + '.js';
            if (checkFile === scriptFile) {
                arr.push(moduleFile.sourceFilePath);
                return;
            }
        });
        return arr;
    }, []);
    // add all the files that import this ts file to the list of ts files we need to look through
    tsFilesThatImportsThisTsFile.forEach(tsFileThatImportsThisTsFile => {
        // if we add to this array, then the while look will keep working until it's empty
        filesToLookForImporters.push(tsFileThatImportsThisTsFile);
    });
}
function getExternalStylesUpdated(config, buildCtx) {
    if (!buildCtx.isRebuild) {
        return null;
    }
    const outputTargets = config.outputTargets.filter(o => o.type === 'www');
    if (outputTargets.length === 0) {
        return null;
    }
    const cssFiles = buildCtx.filesWritten.filter(f => f.endsWith('.css'));
    if (cssFiles.length === 0) {
        return null;
    }
    return cssFiles.map(cssFile => {
        return config.sys.path.basename(cssFile);
    }).sort();
}
function getImagesUpdated(config, buildCtx) {
    const outputTargets = config.outputTargets.filter(o => o.type === 'www');
    if (outputTargets.length === 0) {
        return null;
    }
    const imageFiles = buildCtx.filesChanged.reduce((arr, filePath) => {
        if (IMAGE_EXT.some(ext => filePath.toLowerCase().endsWith(ext))) {
            const fileName = config.sys.path.basename(filePath);
            if (!arr.includes(fileName)) {
                arr.push(fileName);
            }
        }
        return arr;
    }, []);
    if (imageFiles.length === 0) {
        return null;
    }
    return imageFiles.sort();
}
function excludeHmrFiles(config, excludeHmr, filesChanged) {
    const excludeFiles = [];
    if (!excludeHmr || excludeHmr.length === 0) {
        return excludeFiles;
    }
    excludeHmr.forEach(excludeHmr => {
        return filesChanged.map(fileChanged => {
            let shouldExclude = false;
            if (config.sys.isGlob(excludeHmr)) {
                shouldExclude = config.sys.minimatch(fileChanged, excludeHmr);
            }
            else {
                shouldExclude = (normalizePath(excludeHmr) === normalizePath(fileChanged));
            }
            if (shouldExclude) {
                config.logger.debug(`excludeHmr: ${fileChanged}`);
                excludeFiles.push(config.sys.path.basename(fileChanged));
            }
            return shouldExclude;
        }).some(r => r);
    });
    return excludeFiles.sort();
}
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg'];

function generateBuildResults(config, compilerCtx, buildCtx) {
    const timeSpan = buildCtx.createTimeSpan(`generateBuildResults started`, true);
    const buildResults = {
        buildId: buildCtx.buildId,
        bundleBuildCount: buildCtx.bundleBuildCount,
        diagnostics: cleanDiagnostics(buildCtx.diagnostics),
        dirsAdded: buildCtx.dirsAdded.slice().sort(),
        dirsDeleted: buildCtx.dirsDeleted.slice().sort(),
        duration: Date.now() - buildCtx.startTime,
        filesAdded: buildCtx.filesAdded.slice().sort(),
        filesChanged: buildCtx.filesChanged.slice().sort(),
        filesDeleted: buildCtx.filesDeleted.slice().sort(),
        filesUpdated: buildCtx.filesUpdated.slice().sort(),
        filesWritten: buildCtx.filesWritten.sort(),
        hasError: hasError(buildCtx.diagnostics),
        hasSlot: buildCtx.hasSlot,
        hasSuccessfulBuild: compilerCtx.hasSuccessfulBuild,
        hasSvg: buildCtx.hasSvg,
        isRebuild: buildCtx.isRebuild,
        styleBuildCount: buildCtx.styleBuildCount,
        transpileBuildCount: buildCtx.transpileBuildCount,
        components: [],
        entries: generateBuildResultsEntries(config, buildCtx)
    };
    const hmr = genereateHmr(config, compilerCtx, buildCtx);
    if (hmr) {
        buildResults.hmr = hmr;
    }
    buildResults.entries.forEach(en => {
        buildResults.components.push(...en.components);
    });
    timeSpan.finish(`generateBuildResults finished`);
    return buildResults;
}
function generateBuildResultsEntries(config, buildCtx) {
    const entries = buildCtx.entryModules.map(en => {
        return getEntryModule(config, buildCtx, en);
    });
    return entries;
}
function getEntryModule(config, buildCtx, en) {
    en.modeNames = en.modeNames || [];
    en.entryBundles = en.entryBundles || [];
    en.moduleFiles = en.moduleFiles || [];
    const entryCmps = [];
    buildCtx.entryPoints.forEach(ep => {
        entryCmps.push(...ep);
    });
    const buildEntry = getBuildEntry(config, entryCmps, en);
    const modes = en.modeNames.slice();
    if (modes.length > 1 || (modes.length === 1 && modes[0] !== DEFAULT_STYLE_MODE)) {
        buildEntry.modes = modes.sort();
    }
    en.moduleFiles.forEach(m => {
        const encap = m.cmpMeta.encapsulationMeta === 2 /* ScopedCss */ ? 'scoped' : m.cmpMeta.encapsulationMeta === 1 /* ShadowDom */ ? 'shadow' : 'none';
        if (!buildEntry.encapsulations.includes(encap)) {
            buildEntry.encapsulations.push(encap);
        }
    });
    buildEntry.encapsulations.sort();
    return buildEntry;
}
function getBuildEntry(config, entryCmps, en) {
    const buildEntry = {
        entryId: en.entryKey,
        components: en.moduleFiles.map(m => {
            const entryCmp = entryCmps.find(ec => {
                return ec.tag === m.cmpMeta.tagNameMeta;
            });
            const dependencyOf = ((entryCmp && entryCmp.dependencyOf) || []).slice().sort();
            const buildCmp = {
                tag: m.cmpMeta.tagNameMeta,
                dependencies: m.cmpMeta.dependencies.slice(),
                dependencyOf: dependencyOf
            };
            return buildCmp;
        }),
        bundles: en.entryBundles.map(entryBundle => {
            return getBuildBundle(config, entryBundle);
        }),
        inputs: en.moduleFiles.map(m => {
            return normalizePath(config.sys.path.relative(config.rootDir, m.jsFilePath));
        }).sort(),
        encapsulations: []
    };
    return buildEntry;
}
function getBuildBundle(config, entryBundle) {
    const buildBundle = {
        fileName: entryBundle.fileName,
        outputs: entryBundle.outputs.map(filePath => {
            return normalizePath(config.sys.path.relative(config.rootDir, filePath));
        }).sort()
    };
    buildBundle.size = entryBundle.text.length;
    if (typeof entryBundle.sourceTarget === 'string') {
        buildBundle.target = entryBundle.sourceTarget;
    }
    if (entryBundle.modeName !== DEFAULT_STYLE_MODE) {
        buildBundle.mode = entryBundle.modeName;
    }
    if (entryBundle.isScopedStyles) {
        buildBundle.scopedStyles = entryBundle.isScopedStyles;
    }
    return buildBundle;
}

var __awaiter$3 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function generateBuildStats(config, compilerCtx, buildCtx, buildResults) {
    return __awaiter$3(this, void 0, void 0, function* () {
        const statsTargets = config.outputTargets.filter(o => o.type === 'stats');
        yield Promise.all(statsTargets.map((outputTarget) => __awaiter$3(this, void 0, void 0, function* () {
            yield generateStatsOutputTarget(config, compilerCtx, buildCtx, buildResults, outputTarget);
        })));
    });
}
function generateStatsOutputTarget(config, compilerCtx, buildCtx, buildResults, outputTarget) {
    return __awaiter$3(this, void 0, void 0, function* () {
        try {
            let jsonData;
            if (buildResults.hasError) {
                jsonData = {
                    diagnostics: buildResults.diagnostics
                };
            }
            else {
                const stats = {
                    compiler: {
                        name: config.sys.compiler.name,
                        version: config.sys.compiler.version
                    },
                    app: {
                        namespace: config.namespace,
                        fsNamespace: config.fsNamespace,
                        components: buildResults.components.length,
                        entries: buildResults.entries.length,
                        bundles: buildResults.entries.reduce((total, en) => {
                            total += en.bundles.length;
                            return total;
                        }, 0)
                    },
                    options: {
                        minifyJs: config.minifyJs,
                        minifyCss: config.minifyCss,
                        hashFileNames: config.hashFileNames,
                        hashedFileNameLength: config.hashedFileNameLength,
                        buildEs5: config.buildEs5
                    },
                    components: buildResults.components,
                    entries: buildResults.entries,
                    sourceGraph: {},
                    collections: buildCtx.collections.map(c => {
                        return {
                            name: c.collectionName,
                            source: normalizePath(config.sys.path.relative(config.rootDir, c.moduleDir)),
                            tags: c.moduleFiles.map(m => m.cmpMeta.tagNameMeta).sort()
                        };
                    }).sort((a, b) => {
                        if (a.name < b.name)
                            return -1;
                        if (a.name > b.name)
                            return 1;
                        return 0;
                    })
                };
                const moduleFiles = compilerCtx.rootTsFiles.map(rootTsFile => {
                    return compilerCtx.moduleFiles[rootTsFile];
                });
                moduleFiles
                    .sort((a, b) => {
                    if (a.sourceFilePath < b.sourceFilePath)
                        return -1;
                    if (a.sourceFilePath > b.sourceFilePath)
                        return 1;
                    return 0;
                }).forEach(moduleFile => {
                    const key = normalizePath(config.sys.path.relative(config.rootDir, moduleFile.sourceFilePath));
                    stats.sourceGraph[key] = moduleFile.localImports.map(localImport => {
                        return normalizePath(config.sys.path.relative(config.rootDir, localImport));
                    }).sort();
                });
                jsonData = stats;
            }
            yield compilerCtx.fs.writeFile(outputTarget.file, JSON.stringify(jsonData, null, 2));
            yield compilerCtx.fs.commit();
        }
        catch (e) { }
    });
}

var __awaiter$4 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

var __awaiter$5 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

var __awaiter$6 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

var __awaiter$7 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function formatConstructorEncapsulation(encapsulation) {
    if (encapsulation) {
        if (encapsulation === 1 /* ShadowDom */) {
            return 'shadow';
        }
        else if (encapsulation === 2 /* ScopedCss */) {
            return 'scoped';
        }
    }
    return null;
}
function formatComponentConstructorProperties(membersMeta, stringify, excludeInternal) {
    if (!membersMeta) {
        return null;
    }
    const memberNames = Object.keys(membersMeta).sort((a, b) => {
        if (a.toLowerCase() < b.toLowerCase())
            return -1;
        if (a.toLowerCase() > b.toLowerCase())
            return 1;
        return 0;
    });
    if (!memberNames.length) {
        return null;
    }
    const properties = {};
    memberNames.forEach(memberName => {
        const prop = formatComponentConstructorProperty(membersMeta[memberName], stringify, excludeInternal);
        if (prop !== null) {
            properties[memberName] = prop;
        }
    });
    if (!Object.keys(properties).length) {
        return null;
    }
    if (stringify) {
        let str = JSON.stringify(properties);
        str = str.replace(`"TYPE_String"`, `String`);
        str = str.replace(`"TYPE_Boolean"`, `Boolean`);
        str = str.replace(`"TYPE_Number"`, `Number`);
        return str;
    }
    return properties;
}
function formatComponentConstructorProperty(memberMeta, stringify, excludeInternal) {
    const property = {};
    if (memberMeta.memberType === 5 /* State */) {
        if (excludeInternal)
            return null;
        property.state = true;
    }
    else if (memberMeta.memberType === 7 /* Element */) {
        if (excludeInternal)
            return null;
        property.elementRef = true;
    }
    else if (memberMeta.memberType === 6 /* Method */) {
        property.method = true;
    }
    else if (memberMeta.memberType === 4 /* PropConnect */) {
        if (excludeInternal)
            return null;
        property.connect = memberMeta.ctrlId;
    }
    else if (memberMeta.memberType === 3 /* PropContext */) {
        if (excludeInternal)
            return null;
        property.context = memberMeta.ctrlId;
    }
    else {
        if (memberMeta.propType === 2 /* String */) {
            if (stringify) {
                property.type = 'TYPE_String';
            }
            else {
                property.type = String;
            }
        }
        else if (memberMeta.propType === 3 /* Boolean */) {
            if (stringify) {
                property.type = 'TYPE_Boolean';
            }
            else {
                property.type = Boolean;
            }
        }
        else if (memberMeta.propType === 4 /* Number */) {
            if (stringify) {
                property.type = 'TYPE_Number';
            }
            else {
                property.type = Number;
            }
        }
        else {
            property.type = 'Any';
        }
        if (typeof memberMeta.attribName === 'string') {
            property.attr = memberMeta.attribName;
            if (memberMeta.reflectToAttrib) {
                property.reflectToAttr = true;
            }
        }
        if (memberMeta.memberType === 2 /* PropMutable */) {
            property.mutable = true;
        }
    }
    if (memberMeta.watchCallbacks && memberMeta.watchCallbacks.length > 0) {
        property.watchCallbacks = memberMeta.watchCallbacks.slice();
    }
    return property;
}
function formatComponentConstructorEvents(eventsMeta) {
    if (!eventsMeta || !eventsMeta.length) {
        return null;
    }
    return eventsMeta.map(ev => formatComponentConstructorEvent(ev));
}
function formatComponentConstructorEvent(eventMeta) {
    const constructorEvent = {
        name: eventMeta.eventName,
        method: eventMeta.eventMethodName,
        bubbles: true,
        cancelable: true,
        composed: true
    };
    // default bubbles true
    if (typeof eventMeta.eventBubbles === 'boolean') {
        constructorEvent.bubbles = eventMeta.eventBubbles;
    }
    // default cancelable true
    if (typeof eventMeta.eventCancelable === 'boolean') {
        constructorEvent.cancelable = eventMeta.eventCancelable;
    }
    // default composed true
    if (typeof eventMeta.eventComposed === 'boolean') {
        constructorEvent.composed = eventMeta.eventComposed;
    }
    return constructorEvent;
}
function formatComponentConstructorListeners(listenersMeta, stringify) {
    if (!listenersMeta || !listenersMeta.length) {
        return null;
    }
    const listeners = listenersMeta.map(ev => formatComponentConstructorListener(ev));
    if (stringify) {
        return JSON.stringify(listeners);
    }
    return listeners;
}
function formatComponentConstructorListener(listenMeta) {
    const constructorListener = {
        name: listenMeta.eventName,
        method: listenMeta.eventMethodName
    };
    // default capture falsy
    if (listenMeta.eventCapture === true) {
        constructorListener.capture = true;
    }
    // default disabled falsy
    if (listenMeta.eventDisabled === true) {
        constructorListener.disabled = true;
    }
    // default passive falsy
    if (listenMeta.eventPassive === true) {
        constructorListener.passive = true;
    }
    return constructorListener;
}
function getStylePlaceholder(tagName) {
    return `/**style-placeholder:${tagName}:**/`;
}
function getStyleIdPlaceholder(tagName) {
    return `/**style-id-placeholder:${tagName}:**/`;
}

var __awaiter$8 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

var __awaiter$9 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

var __awaiter$a = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

var __awaiter$b = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

var __awaiter$c = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

var __awaiter$d = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const COMPONENTS_DTS = 'components.d.ts';

class FsWatchNormalizer {
    constructor(config, events) {
        this.config = config;
        this.events = events;
        this.dirsAdded = [];
        this.dirsDeleted = [];
        this.filesAdded = [];
        this.filesDeleted = [];
        this.filesUpdated = [];
    }
    fileUpdate(filePath) {
        filePath = normalizePath(filePath);
        if (shouldIgnore$1(filePath)) {
            return;
        }
        if (!this.filesUpdated.includes(filePath)) {
            this.log('file updated', filePath);
            this.filesUpdated.push(filePath);
            this.queue();
        }
    }
    fileAdd(filePath) {
        filePath = normalizePath(filePath);
        if (shouldIgnore$1(filePath)) {
            return;
        }
        if (!this.filesAdded.includes(filePath)) {
            this.log('file added', filePath);
            this.filesAdded.push(filePath);
            this.queue();
        }
    }
    fileDelete(filePath) {
        filePath = normalizePath(filePath);
        if (shouldIgnore$1(filePath)) {
            return;
        }
        if (!this.filesDeleted.includes(filePath)) {
            this.log('file deleted', filePath);
            this.filesDeleted.push(filePath);
            this.queue();
        }
    }
    dirAdd(dirPath) {
        dirPath = normalizePath(dirPath);
        if (!this.dirsAdded.includes(dirPath)) {
            this.log('directory added', dirPath);
            this.dirsAdded.push(dirPath);
            this.queue();
        }
    }
    dirDelete(dirPath) {
        dirPath = normalizePath(dirPath);
        if (!this.dirsDeleted.includes(dirPath)) {
            this.log('directory deleted', dirPath);
            this.dirsDeleted.push(dirPath);
            this.queue();
        }
    }
    queue() {
        // let's chill out for a few moments to see if anything else
        // comes in as something that changed in the file system
        clearTimeout(this.flushTmrId);
        this.flushTmrId = setTimeout(this.flush.bind(this), 40);
    }
    flush() {
        // create the watch results from all that we've learned today
        const fsWatchResults = {
            dirsAdded: this.dirsAdded.slice(),
            dirsDeleted: this.dirsDeleted.slice(),
            filesAdded: this.filesAdded.slice(),
            filesDeleted: this.filesDeleted.slice(),
            filesUpdated: this.filesUpdated.slice()
        };
        // reset the data for next time
        this.dirsAdded.length = 0;
        this.dirsDeleted.length = 0;
        this.filesAdded.length = 0;
        this.filesDeleted.length = 0;
        this.filesUpdated.length = 0;
        // send out the event of what we've learend
        this.events.emit('fsChange', fsWatchResults);
    }
    subscribe() {
        this.events.subscribe('fileUpdate', this.fileUpdate.bind(this));
        this.events.subscribe('fileAdd', this.fileAdd.bind(this));
        this.events.subscribe('fileDelete', this.fileDelete.bind(this));
        this.events.subscribe('dirAdd', this.dirAdd.bind(this));
        this.events.subscribe('dirDelete', this.dirDelete.bind(this));
    }
    log(msg, filePath) {
        const relPath = this.config.sys.path.relative(this.config.rootDir, filePath);
        this.config.logger.debug(`watch, ${msg}: ${relPath}, ${Date.now().toString().substring(5)}`);
    }
}
function shouldIgnore$1(filePath) {
    return filePath.endsWith(COMPONENTS_DTS);
}

function initFsWatch(config, compilerCtx, buildCtx) {
    // only create the watcher if this is a watch build
    // and we haven't created a watch listener already
    if (compilerCtx.hasWatch || !config.watch) {
        return false;
    }
    buildCtx.debug(`initFsWatch: ${config.sys.path.relative(config.rootDir, config.srcDir)}`);
    const fsWatchNormalizer = new FsWatchNormalizer(config, compilerCtx.events);
    fsWatchNormalizer.subscribe();
    compilerCtx.hasWatch = true;
    if (config.sys.createFsWatcher) {
        const fsWatcher = config.sys.createFsWatcher(compilerCtx.events, config.srcDir, {
            ignored: config.watchIgnoredRegex,
            ignoreInitial: true
        });
        if (fsWatcher && config.configPath) {
            config.configPath = normalizePath(config.configPath);
            fsWatcher.add(config.configPath);
        }
    }
    return true;
}

function writeCacheStats(config, compilerCtx, buildCtx) {
    if (!config.enableCacheStats) {
        return;
    }
    const statsPath = pathJoin(config, config.rootDir, 'stencil-cache-stats.json');
    config.logger.warn(`cache stats enabled for debugging, which is horrible for build times. Only enableCacheStats when debugging memory issues.`);
    const timeSpan = config.logger.createTimeSpan(`cache stats started: ${statsPath}`);
    let statsData = {};
    try {
        const dataStr = compilerCtx.fs.disk.readFileSync(statsPath);
        statsData = JSON.parse(dataStr);
    }
    catch (e) { }
    statsData['compilerCtx'] = statsData['compilerCtx'] || {};
    getObjectSize(statsData['compilerCtx'], compilerCtx);
    statsData['compilerCtx.cache.cacheFs.items'] = statsData['compilerCtx.cache.cacheFs.items'] || {};
    getObjectSize(statsData['compilerCtx.cache.cacheFs.items'], compilerCtx.cache['cacheFs']['items']);
    statsData['buildCtx'] = statsData['buildCtx'] || {};
    getObjectSize(statsData['buildCtx'], buildCtx);
    compilerCtx.fs.disk.writeFileSync(statsPath, JSON.stringify(statsData, null, 2));
    timeSpan.finish(`cache stats finished`);
}
function getObjectSize(data, obj) {
    if (obj) {
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object') {
                const size = objectSizeEstimate(obj[key]);
                if (size > 20000) {
                    data[key] = data[key] || [];
                    data[key].push(size);
                }
            }
        });
    }
}
function objectSizeEstimate(obj) {
    if (!obj) {
        return 0;
    }
    const objectList = [];
    const stack = [obj];
    let bytes = 0;
    while (stack.length) {
        const value = stack.pop();
        if (typeof value === 'boolean') {
            bytes += 4;
        }
        else if (typeof value === 'string') {
            bytes += value.length * 2;
        }
        else if (typeof value === 'number') {
            bytes += 8;
        }
        else if (typeof value === 'object' && !objectList.includes(value)) {
            objectList.push(value);
            for (const i in value) {
                stack.push(value[i]);
            }
        }
    }
    return bytes;
}

var __awaiter$e = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function buildFinish(config, compilerCtx, buildCtx, aborted) {
    return __awaiter$e(this, void 0, void 0, function* () {
        if (buildCtx.hasFinished && buildCtx.buildResults) {
            // we've already marked this build as finished and
            // already created the build results, just return these
            return buildCtx.buildResults;
        }
        buildCtx.debug(`${aborted ? 'aborted' : 'finished'} build, ${buildCtx.timestamp}`);
        // create the build results data
        buildCtx.buildResults = generateBuildResults(config, compilerCtx, buildCtx);
        // log any errors/warnings
        if (!buildCtx.hasFinished) {
            // haven't set this build as finished yet
            if (!buildCtx.hasPrintedResults) {
                config.logger.printDiagnostics(buildCtx.buildResults.diagnostics);
            }
            if (!compilerCtx.hasLoggedServerUrl && config.devServer && config.devServer.browserUrl && config.flags.serve) {
                // we've opened up the dev server
                // let's print out the dev server url
                config.logger.info(`dev server: ${config.logger.cyan(config.devServer.browserUrl)}`);
                compilerCtx.hasLoggedServerUrl = true;
            }
            if (buildCtx.isRebuild && buildCtx.buildResults.hmr && !aborted && buildCtx.isActiveBuild) {
                // this is a rebuild, and we've got hmr data
                // and this build hasn't been aborted
                logHmr(config, buildCtx);
            }
            // create a nice pretty message stating what happend
            const buildText = buildCtx.isRebuild ? 'rebuild' : 'build';
            const watchText = config.watch ? ', watching for changes...' : '';
            let buildStatus = 'finished';
            let statusColor = 'green';
            if (buildCtx.hasError) {
                // gosh darn, build had errors
                // ಥ_ಥ
                compilerCtx.lastBuildHadError = true;
                buildStatus = 'failed';
                statusColor = 'red';
            }
            else {
                // successful build!
                // ┏(°.°)┛ ┗(°.°)┓ ┗(°.°)┛ ┏(°.°)┓
                compilerCtx.hasSuccessfulBuild = true;
                compilerCtx.lastBuildHadError = false;
            }
            if (!aborted) {
                // print out the time it took to build
                // and add the duration to the build results
                buildCtx.timeSpan.finish(`${buildText} ${buildStatus}${watchText}`, statusColor, true, true);
                buildCtx.hasPrintedResults = true;
                // write the build stats
                yield generateBuildStats(config, compilerCtx, buildCtx, buildCtx.buildResults);
                // emit a buildFinish event for anyone who cares
                compilerCtx.events.emit('buildFinish', buildCtx.buildResults);
            }
            // write all of our logs to disk if config'd to do so
            // do this even if there are errors or not the active build
            config.logger.writeLogs(buildCtx.isRebuild);
            if (config.watch) {
                // this is a watch build
                // setup watch if we haven't done so already
                initFsWatch(config, compilerCtx, buildCtx);
            }
            else {
                // not a watch build, so lets destroy anything left open
                config.sys.destroy();
            }
        }
        // write cache stats only for memory debugging
        writeCacheStats(config, compilerCtx, buildCtx);
        // it's official, this build has finished
        buildCtx.hasFinished = true;
        if (buildCtx.isActiveBuild) {
            compilerCtx.isActivelyBuilding = false;
        }
        return buildCtx.buildResults;
    });
}
function logHmr(config, buildCtx) {
    // this is a rebuild, and we've got hmr data
    // and this build hasn't been aborted
    const hmr = buildCtx.buildResults.hmr;
    if (hmr.componentsUpdated) {
        cleanupUpdateMsg(config, `updated component`, hmr.componentsUpdated);
    }
    if (hmr.inlineStylesUpdated) {
        const inlineStyles = hmr.inlineStylesUpdated.map(s => s.styleTag).reduce((arr, v) => {
            if (!arr.includes(v)) {
                arr.push(v);
            }
            return arr;
        }, []);
        cleanupUpdateMsg(config, `updated style`, inlineStyles);
    }
    if (hmr.externalStylesUpdated) {
        cleanupUpdateMsg(config, `updated stylesheet`, hmr.externalStylesUpdated);
    }
    if (hmr.imagesUpdated) {
        cleanupUpdateMsg(config, `updated image`, hmr.imagesUpdated);
    }
}
function cleanupUpdateMsg(config, msg, fileNames) {
    if (fileNames.length > 0) {
        let fileMsg = '';
        if (fileNames.length > 7) {
            const remaining = fileNames.length - 6;
            fileNames = fileNames.slice(0, 6);
            fileMsg = fileNames.join(', ') + `, +${remaining} others`;
        }
        else {
            fileMsg = fileNames.join(', ');
        }
        if (fileNames.length > 1) {
            msg += 's';
        }
        config.logger.info(`${msg}: ${config.logger.cyan(fileMsg)}`);
    }
}

var __awaiter$f = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class BuildContext {
    constructor(config, compilerCtx) {
        this.config = config;
        this.compilerCtx = compilerCtx;
        this.appFileBuildCount = 0;
        this.buildId = -1;
        this.buildMessages = [];
        this.buildResults = null;
        this.bundleBuildCount = 0;
        this.collections = [];
        this.components = [];
        this.data = {};
        this.diagnostics = [];
        this.dirsAdded = [];
        this.dirsDeleted = [];
        this.entryModules = [];
        this.entryPoints = [];
        this.filesAdded = [];
        this.filesChanged = [];
        this.filesDeleted = [];
        this.filesUpdated = [];
        this.filesWritten = [];
        this.global = null;
        this.graphData = null;
        this.hasConfigChanges = false;
        this.hasCopyChanges = false;
        this.hasFinished = false;
        this.hasIndexHtmlChanges = false;
        this.hasPrintedResults = false;
        this.hasServiceWorkerChanges = false;
        this.hasScriptChanges = true;
        this.hasSlot = null;
        this.hasStyleChanges = true;
        this.hasSvg = null;
        this.indexBuildCount = 0;
        this.isRebuild = false;
        this.requiresFullBuild = true;
        this.scriptsAdded = [];
        this.scriptsDeleted = [];
        this.startTime = Date.now();
        this.styleBuildCount = 0;
        this.stylesUpdated = [];
        this.timeSpan = null;
        this.transpileBuildCount = 0;
    }
    start() {
        this.compilerCtx.isActivelyBuilding = true;
        // get the build id from the incremented activeBuildId
        ++this.compilerCtx.activeBuildId;
        if (this.compilerCtx.activeBuildId >= 100) {
            // reset the build id back to 0
            this.compilerCtx.activeBuildId = 0;
        }
        this.buildId = this.compilerCtx.activeBuildId;
        // print out a good message
        const msg = `${this.isRebuild ? 'rebuild' : 'build'}, ${this.config.fsNamespace}, ${this.config.devMode ? 'dev' : 'prod'} mode, started`;
        // create a timespan for this build
        this.timeSpan = this.createTimeSpan(msg);
        // create a build timestamp for this build
        this.timestamp = getBuildTimestamp();
        // debug log our new build
        this.debug(`start build, ${this.timestamp}`);
    }
    createTimeSpan(msg, debug) {
        if ((this.isActiveBuild && !this.hasFinished) || debug) {
            if (debug) {
                msg = `${this.config.logger.cyan('[' + this.buildId + ']')} ${msg}`;
            }
            const timeSpan = this.config.logger.createTimeSpan(msg, debug, this.buildMessages);
            if (!debug && this.compilerCtx.events) {
                this.compilerCtx.events.emit('buildLog', {
                    messages: this.buildMessages.slice()
                });
            }
            return {
                finish: (finishedMsg, color, bold, newLineSuffix) => {
                    if ((this.isActiveBuild && !this.hasFinished) || debug) {
                        if (debug) {
                            finishedMsg = `${this.config.logger.cyan('[' + this.buildId + ']')} ${finishedMsg}`;
                        }
                        timeSpan.finish(finishedMsg, color, bold, newLineSuffix);
                        if (!debug) {
                            this.compilerCtx.events.emit('buildLog', {
                                messages: this.buildMessages.slice()
                            });
                        }
                    }
                }
            };
        }
        return {
            finish: () => { }
        };
    }
    debug(msg) {
        this.config.logger.debug(`${this.config.logger.cyan('[' + this.buildId + ']')} ${msg}`);
    }
    get isActiveBuild() {
        return (this.compilerCtx.activeBuildId === this.buildId);
    }
    get hasError() {
        if (hasError(this.diagnostics)) {
            // remember if the last build had an error or not
            // this is useful if the next build should do a full build or not
            this.compilerCtx.lastBuildHadError = true;
            return true;
        }
        return false;
    }
    abort() {
        return __awaiter$f(this, void 0, void 0, function* () {
            return buildFinish(this.config, this.compilerCtx, this, true);
        });
    }
    finish() {
        return __awaiter$f(this, void 0, void 0, function* () {
            return buildFinish(this.config, this.compilerCtx, this, false);
        });
    }
    validateTypesBuild() {
        return __awaiter$f(this, void 0, void 0, function* () {
            if (this.hasError || !this.isActiveBuild) {
                // no need to wait on this one since
                // we already aborted this build
                return;
            }
            if (!this.validateTypesPromise) {
                // there is no pending validate types promise
                // so it probably already finished
                // so no need to wait on anything
                return;
            }
            if (!this.config.watch) {
                // this is not a watch build, so we need to make
                // sure that the type validation has finished
                this.debug(`build, non-watch, waiting on validateTypes`);
                yield this.validateTypesPromise;
                this.debug(`build, non-watch, finished waiting on validateTypes`);
            }
        });
    }
}
function getBuildTimestamp() {
    const d = new Date();
    // YYYY-MM-DDThh:mm:ss
    let timestamp = d.getUTCFullYear() + '-';
    timestamp += ('0' + d.getUTCMonth()).slice(-2) + '-';
    timestamp += ('0' + d.getUTCDate()).slice(-2) + 'T';
    timestamp += ('0' + d.getUTCHours()).slice(-2) + ':';
    timestamp += ('0' + d.getUTCMinutes()).slice(-2) + ':';
    timestamp += ('0' + d.getUTCSeconds()).slice(-2);
    return timestamp;
}

var __awaiter$g = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function mockStencilSystem() {
    return new TestingSystem();
}

var __awaiter$h = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const DEFAULT_COMPILER_OPTIONS = {
    // to allow jsx to work
    jsx: ts.JsxEmit.React,
    // the factory function to use
    jsxFactory: 'h',
    // transpileModule does not write anything to disk so there is no need
    // to verify that there are no conflicts between input and output paths.
    suppressOutputPathCheck: true,
    // // Clear out other settings that would not be used in transpiling this module
    lib: [
        'lib.dom.d.ts',
        'lib.es5.d.ts',
        'lib.es2015.d.ts',
        'lib.es2016.d.ts',
        'lib.es2017.d.ts'
    ],
    // We are not doing a full typecheck, we are not resolving the whole context,
    // so pass --noResolve to avoid reporting missing file errors.
    // noResolve: true,
    allowSyntheticDefaultImports: true,
    // must always allow decorators
    experimentalDecorators: true,
    // transpile down to es2017
    target: ts.ScriptTarget.ES2017,
    // create es2015 modules
    module: ts.ModuleKind.ESNext,
    // resolve using NodeJs style
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    // ensure that we do emit something
    noEmitOnError: false
};

var __awaiter$i = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Check if class has component decorator
 * @param classNode
 */
function isComponentClass(classNode) {
    if (!Array.isArray(classNode.decorators)) {
        return false;
    }
    const componentDecoratorIndex = classNode.decorators.findIndex(dec => (ts.isCallExpression(dec.expression) && ts.isIdentifier(dec.expression.expression) && dec.expression.expression.text === 'Component'));
    return (componentDecoratorIndex !== -1);
}
/**
 * Convert a js value into typescript AST
 * @param val array, object, string, boolean, or number
 * @returns Typescript Object Literal, Array Literal, String Literal, Boolean Literal, Numeric Literal
 */
function convertValueToLiteral(val) {
    if (val === String) {
        return ts.createIdentifier('String');
    }
    if (val === Number) {
        return ts.createIdentifier('Number');
    }
    if (val === Boolean) {
        return ts.createIdentifier('Boolean');
    }
    if (Array.isArray(val)) {
        return arrayToArrayLiteral(val);
    }
    if (typeof val === 'object') {
        return objectToObjectLiteral(val);
    }
    return ts.createLiteral(val);
}
/**
 * Convert a js object into typescript AST
 * @param obj key value object
 * @returns Typescript Object Literal Expression
 */
function objectToObjectLiteral(obj) {
    if (Object.keys(obj).length === 0) {
        return ts.createObjectLiteral([]);
    }
    const newProperties = Object.keys(obj).map((key) => {
        return ts.createPropertyAssignment(ts.createLiteral(key), convertValueToLiteral(obj[key]));
    });
    return ts.createObjectLiteral(newProperties, true);
}
/**
 * Convert a js array into typescript AST
 * @param list array
 * @returns Typescript Array Literal Expression
 */
function arrayToArrayLiteral(list) {
    const newList = list.map(convertValueToLiteral);
    return ts.createArrayLiteral(newList);
}

function addComponentMetadata(moduleFiles) {
    return (transformContext) => {
        function visitClass(classNode, cmpMeta) {
            const staticMembers = addStaticMeta(cmpMeta);
            const newMembers = Object.keys(staticMembers).map(memberName => {
                return createGetter(memberName, staticMembers[memberName]);
            });
            return ts.updateClassDeclaration(classNode, classNode.decorators, classNode.modifiers, classNode.name, classNode.typeParameters, classNode.heritageClauses, [...classNode.members, ...newMembers]);
        }
        function visit(node, cmpMeta) {
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    return visitClass(node, cmpMeta);
                default:
                    return ts.visitEachChild(node, (node) => {
                        return visit(node, cmpMeta);
                    }, transformContext);
            }
        }
        return (tsSourceFile) => {
            const moduleFile = moduleFiles[tsSourceFile.fileName];
            if (moduleFile && moduleFile.cmpMeta) {
                return visit(tsSourceFile, moduleFile.cmpMeta);
            }
            return tsSourceFile;
        };
    };
}
function addStaticMeta(cmpMeta) {
    const staticMembers = {};
    staticMembers.is = convertValueToLiteral(cmpMeta.tagNameMeta);
    const encapsulation = formatConstructorEncapsulation(cmpMeta.encapsulationMeta);
    if (encapsulation) {
        staticMembers.encapsulation = convertValueToLiteral(encapsulation);
    }
    if (cmpMeta.hostMeta && Object.keys(cmpMeta.hostMeta).length > 0) {
        staticMembers.host = convertValueToLiteral(cmpMeta.hostMeta);
    }
    const propertiesMeta = formatComponentConstructorProperties(cmpMeta.membersMeta);
    if (propertiesMeta && Object.keys(propertiesMeta).length > 0) {
        staticMembers.properties = convertValueToLiteral(propertiesMeta);
    }
    const eventsMeta = formatComponentConstructorEvents(cmpMeta.eventsMeta);
    if (eventsMeta && eventsMeta.length > 0) {
        staticMembers.events = convertValueToLiteral(eventsMeta);
    }
    const listenerMeta = formatComponentConstructorListeners(cmpMeta.listenersMeta);
    if (listenerMeta && listenerMeta.length > 0) {
        staticMembers.listeners = convertValueToLiteral(listenerMeta);
    }
    if (cmpMeta.stylesMeta) {
        const styleModes = Object.keys(cmpMeta.stylesMeta);
        if (styleModes.length > 0) {
            // awesome, we know we've got styles!
            // let's add the placeholder which we'll use later
            // after we generate the css
            staticMembers.style = convertValueToLiteral(getStylePlaceholder(cmpMeta.tagNameMeta));
            if (!cmpMeta.stylesMeta[DEFAULT_STYLE_MODE]) {
                // if there's only one style, then there's no need for styleId
                // but if there are numerous style modes, then we'll need to add this
                staticMembers.styleMode = convertValueToLiteral(getStyleIdPlaceholder(cmpMeta.tagNameMeta));
            }
        }
    }
    return staticMembers;
}
function createGetter(name, returnExpression) {
    return ts.createGetAccessor(undefined, [ts.createToken(ts.SyntaxKind.StaticKeyword)], name, undefined, undefined, ts.createBlock([
        ts.createReturn(returnExpression)
    ]));
}

var __awaiter$j = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function parseCollectionData(config, collectionName, collectionDir, collectionJsonStr) {
    const collectionData = JSON.parse(collectionJsonStr);
    const collection = {
        collectionName: collectionName,
        dependencies: parseCollectionDependencies(collectionData),
        compiler: {
            name: collectionData.compiler.name,
            version: collectionData.compiler.version,
            typescriptVersion: collectionData.compiler.typescriptVersion
        },
        bundles: []
    };
    parseComponents(config, collectionDir, collectionData, collection);
    parseGlobal(config, collectionDir, collectionData, collection);
    parseBundles(collectionData, collection);
    return collection;
}
function parseComponents(config, collectionDir, collectionData, collection) {
    const componentsData = collectionData.components;
    if (!componentsData || !Array.isArray(componentsData)) {
        collection.moduleFiles = [];
        return;
    }
    collection.moduleFiles = componentsData.map(cmpData => {
        return parseComponentDataToModuleFile(config, collection, collectionDir, cmpData);
    });
}
function parseCollectionDependencies(collectionData) {
    const dependencies = [];
    if (Array.isArray(collectionData.collections)) {
        collectionData.collections.forEach(c => {
            dependencies.push(c.name);
        });
    }
    return dependencies;
}
function excludeFromCollection(config, cmpData) {
    // this is a component from a collection dependency
    // however, this project may also become a collection
    // for example, "ionicons" is a dependency of "ionic"
    // and "ionic" is it's own stand-alone collection, so within
    // ionic's collection we want ionicons to just work
    // cmpData is a component from a collection dependency
    // if this component is listed in this config's bundles
    // then we'll need to ensure it also becomes apart of this collection
    const isInBundle = config.bundles && config.bundles.some(bundle => {
        return bundle.components && bundle.components.some(tag => tag === cmpData.tag);
    });
    // if it's not in the config bundle then it's safe to exclude
    // this component from going into this build's collection
    return !isInBundle;
}
function parseComponentDataToModuleFile(config, collection, collectionDir, cmpData) {
    const moduleFile = {
        sourceFilePath: normalizePath(config.sys.path.join(collectionDir, cmpData.componentPath)),
        cmpMeta: {},
        isCollectionDependency: true,
        excludeFromCollection: excludeFromCollection(config, cmpData),
        localImports: [],
        externalImports: [],
        potentialCmpRefs: []
    };
    const cmpMeta = moduleFile.cmpMeta;
    parseTag(cmpData, cmpMeta);
    parseComponentDependencies(cmpData, cmpMeta);
    parseComponentClass(cmpData, cmpMeta);
    parseModuleJsFilePath(config, collectionDir, cmpData, moduleFile);
    parseStyles(config, collectionDir, cmpData, cmpMeta);
    parseAssetsDir(config, collectionDir, cmpData, cmpMeta);
    parseProps(config, collection, cmpData, cmpMeta);
    parseStates(cmpData, cmpMeta);
    parseListeners(cmpData, cmpMeta);
    parseMethods(cmpData, cmpMeta);
    parseContextMember(cmpData, cmpMeta);
    parseConnectMember(cmpData, cmpMeta);
    parseHostElementMember(cmpData, cmpMeta);
    parseEvents(cmpData, cmpMeta);
    parseHost(cmpData, cmpMeta);
    parseEncapsulation(cmpData, cmpMeta);
    // DEPRECATED: 2017-12-27
    parseWillChangeDeprecated(cmpData, cmpMeta);
    parseDidChangeDeprecated(cmpData, cmpMeta);
    return moduleFile;
}
function parseTag(cmpData, cmpMeta) {
    cmpMeta.tagNameMeta = cmpData.tag;
}
function parseModuleJsFilePath(config, collectionDir, cmpData, moduleFile) {
    // convert the path that's relative to the collection file
    // into an absolute path to the component's js file path
    if (typeof cmpData.componentPath !== 'string') {
        throw new Error(`parseModuleJsFilePath, "componentPath" missing on cmpData: ${cmpData.tag}`);
    }
    moduleFile.jsFilePath = normalizePath(config.sys.path.join(collectionDir, cmpData.componentPath));
    // remember the original component path from its collection
    moduleFile.originalCollectionComponentPath = cmpData.componentPath;
}
function parseComponentDependencies(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.dependencies)) {
        cmpMeta.dependencies = [];
    }
    else {
        cmpMeta.dependencies = cmpData.dependencies.sort();
    }
}
function parseComponentClass(cmpData, cmpMeta) {
    cmpMeta.componentClass = cmpData.componentClass;
}
function parseStyles(config, collectionDir, cmpData, cmpMeta) {
    const stylesData = cmpData.styles;
    cmpMeta.stylesMeta = {};
    if (stylesData) {
        Object.keys(stylesData).forEach(modeName => {
            modeName = modeName.toLowerCase();
            cmpMeta.stylesMeta[modeName] = parseStyle(config, collectionDir, cmpData, stylesData[modeName]);
        });
    }
}
function parseStyle(config, collectionDir, cmpData, modeStyleData) {
    const modeStyle = {
        styleStr: modeStyleData.style
    };
    if (modeStyleData.stylePaths) {
        modeStyle.externalStyles = modeStyleData.stylePaths.map(stylePath => {
            const externalStyle = {};
            externalStyle.absolutePath = normalizePath(config.sys.path.join(collectionDir, stylePath));
            externalStyle.cmpRelativePath = normalizePath(config.sys.path.relative(config.sys.path.dirname(cmpData.componentPath), stylePath));
            externalStyle.originalCollectionPath = normalizePath(stylePath);
            return externalStyle;
        });
    }
    return modeStyle;
}
function parseAssetsDir(config, collectionDir, cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.assetPaths)) {
        return;
    }
    cmpMeta.assetsDirsMeta = cmpData.assetPaths.map(assetsPath => {
        const assetsMeta = {
            absolutePath: normalizePath(config.sys.path.join(collectionDir, assetsPath)),
            cmpRelativePath: normalizePath(config.sys.path.relative(config.sys.path.dirname(cmpData.componentPath), assetsPath)),
            originalCollectionPath: normalizePath(assetsPath)
        };
        return assetsMeta;
    }).sort((a, b) => {
        if (a.cmpRelativePath < b.cmpRelativePath)
            return -1;
        if (a.cmpRelativePath > b.cmpRelativePath)
            return 1;
        return 0;
    });
}
function parseProps(config, collection, cmpData, cmpMeta) {
    const propsData = cmpData.props;
    if (invalidArrayData(propsData)) {
        return;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    propsData.forEach(propData => {
        cmpMeta.membersMeta[propData.name] = {};
        if (propData.mutable) {
            cmpMeta.membersMeta[propData.name].memberType = 2 /* PropMutable */;
        }
        else {
            cmpMeta.membersMeta[propData.name].memberType = 1 /* Prop */;
        }
        // the standard is the first character of the type is capitalized
        // however, lowercase and normalize for good measure
        const type = typeof propData.type === 'string' ? propData.type.toLowerCase().trim() : null;
        if (type === BOOLEAN_KEY.toLowerCase()) {
            cmpMeta.membersMeta[propData.name].propType = 3 /* Boolean */;
        }
        else if (type === NUMBER_KEY.toLowerCase()) {
            cmpMeta.membersMeta[propData.name].propType = 4 /* Number */;
        }
        else if (type === STRING_KEY.toLowerCase()) {
            cmpMeta.membersMeta[propData.name].propType = 2 /* String */;
        }
        else if (type === ANY_KEY.toLowerCase()) {
            cmpMeta.membersMeta[propData.name].propType = 1 /* Any */;
        }
        else if (!collection.compiler || !collection.compiler.version || config.sys.semver.lt(collection.compiler.version, '0.0.6-23')) {
            // older compilers didn't remember "any" type
            cmpMeta.membersMeta[propData.name].propType = 1 /* Any */;
        }
        if (cmpMeta.membersMeta[propData.name].propType) {
            // deprecated 0.7.3, 2018-03-19
            cmpMeta.membersMeta[propData.name].attribName = propData.name;
        }
        if (typeof propData.attr === 'string') {
            cmpMeta.membersMeta[propData.name].attribName = propData.attr;
        }
        if (!invalidArrayData(propData.watch)) {
            cmpMeta.membersMeta[propData.name].watchCallbacks = propData.watch.slice().sort();
        }
    });
}
function parseWillChangeDeprecated(cmpData, cmpMeta) {
    // DEPRECATED: 2017-12-27
    // previous way of storing change, 0.1.0 and below
    const propWillChangeData = cmpData.propsWillChange;
    if (invalidArrayData(propWillChangeData)) {
        return;
    }
    propWillChangeData.forEach((willChangeData) => {
        const propName = willChangeData.name;
        const methodName = willChangeData.method;
        cmpMeta.membersMeta = cmpMeta.membersMeta || {};
        cmpMeta.membersMeta[propName] = cmpMeta.membersMeta[propName] || {};
        cmpMeta.membersMeta[propName].watchCallbacks = cmpMeta.membersMeta[propName].watchCallbacks || [];
        cmpMeta.membersMeta[propName].watchCallbacks.push(methodName);
    });
}
function parseDidChangeDeprecated(cmpData, cmpMeta) {
    // DEPRECATED: 2017-12-27
    // previous way of storing change, 0.1.0 and below
    const propDidChangeData = cmpData.propsDidChange;
    if (invalidArrayData(propDidChangeData)) {
        return;
    }
    propDidChangeData.forEach((didChangeData) => {
        const propName = didChangeData.name;
        const methodName = didChangeData.method;
        cmpMeta.membersMeta = cmpMeta.membersMeta || {};
        cmpMeta.membersMeta[propName] = cmpMeta.membersMeta[propName] || {};
        cmpMeta.membersMeta[propName].watchCallbacks = cmpMeta.membersMeta[propName].watchCallbacks || [];
        cmpMeta.membersMeta[propName].watchCallbacks.push(methodName);
    });
}
function parseStates(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.states)) {
        return;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    cmpData.states.forEach(stateData => {
        cmpMeta.membersMeta[stateData.name] = {
            memberType: 5 /* State */
        };
    });
}
function parseListeners(cmpData, cmpMeta) {
    const listenersData = cmpData.listeners;
    if (invalidArrayData(listenersData)) {
        return;
    }
    cmpMeta.listenersMeta = listenersData.map(listenerData => {
        const listener = {
            eventName: listenerData.event,
            eventMethodName: listenerData.method,
            eventPassive: (listenerData.passive !== false),
            eventDisabled: (listenerData.enabled === false),
            eventCapture: (listenerData.capture !== false)
        };
        return listener;
    });
}
function parseMethods(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.methods)) {
        return;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    cmpData.methods.forEach(methodData => {
        cmpMeta.membersMeta[methodData.name] = {
            memberType: 6 /* Method */
        };
    });
}
function parseContextMember(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.context)) {
        return;
    }
    cmpData.context.forEach(methodData => {
        if (methodData.id) {
            cmpMeta.membersMeta = cmpMeta.membersMeta || {};
            cmpMeta.membersMeta[methodData.name] = {
                memberType: 3 /* PropContext */,
                ctrlId: methodData.id
            };
        }
    });
}
function parseConnectMember(cmpData, cmpMeta) {
    if (invalidArrayData(cmpData.connect)) {
        return;
    }
    cmpData.connect.forEach(methodData => {
        if (methodData.tag) {
            cmpMeta.membersMeta = cmpMeta.membersMeta || {};
            cmpMeta.membersMeta[methodData.name] = {
                memberType: 4 /* PropConnect */,
                ctrlId: methodData.tag
            };
        }
    });
}
function parseHostElementMember(cmpData, cmpMeta) {
    if (!cmpData.hostElement) {
        return;
    }
    cmpMeta.membersMeta = cmpMeta.membersMeta || {};
    cmpMeta.membersMeta[cmpData.hostElement.name] = {
        memberType: 7 /* Element */
    };
}
function parseEvents(cmpData, cmpMeta) {
    const eventsData = cmpData.events;
    if (invalidArrayData(eventsData)) {
        return;
    }
    cmpMeta.eventsMeta = eventsData.map(eventData => ({
        eventName: eventData.event,
        eventMethodName: (eventData.method) ? eventData.method : eventData.event,
        eventBubbles: (eventData.bubbles !== false),
        eventCancelable: (eventData.cancelable !== false),
        eventComposed: (eventData.composed !== false)
    }));
}
function parseHost(cmpData, cmpMeta) {
    if (!cmpData.host) {
        return;
    }
    cmpMeta.hostMeta = cmpData.host;
}
function parseEncapsulation(cmpData, cmpMeta) {
    if (cmpData.shadow === true) {
        cmpMeta.encapsulationMeta = 1 /* ShadowDom */;
    }
    else if (cmpData.scoped === true) {
        cmpMeta.encapsulationMeta = 2 /* ScopedCss */;
    }
    else {
        cmpMeta.encapsulationMeta = 0 /* NoEncapsulation */;
    }
}
function parseGlobal(config, collectionDir, collectionData, collection) {
    if (typeof collectionData.global !== 'string')
        return;
    collection.global = {
        sourceFilePath: normalizePath(config.sys.path.join(collectionDir, collectionData.global)),
        jsFilePath: normalizePath(config.sys.path.join(collectionDir, collectionData.global)),
        localImports: [],
        externalImports: [],
        potentialCmpRefs: []
    };
}
function parseBundles(collectionData, collection) {
    if (invalidArrayData(collectionData.bundles)) {
        collection.bundles = [];
        return;
    }
    collection.bundles = collectionData.bundles.map(b => {
        return {
            components: b.components.slice().sort()
        };
    });
}
function invalidArrayData(arr) {
    return (!arr || !Array.isArray(arr) || arr.length === 0);
}
const BOOLEAN_KEY = 'Boolean';
const NUMBER_KEY = 'Number';
const STRING_KEY = 'String';
const ANY_KEY = 'Any';

function parseCollectionModule(config, compilerCtx, pkgJsonFilePath, pkgData) {
    // note this MUST be synchronous because this is used during transpile
    const collectionName = pkgData.name;
    let collection = compilerCtx.collections.find(c => c.collectionName === collectionName);
    if (collection) {
        // we've already cached the collection, no need for another resolve/readFile/parse
        // thought being that /node_modules/ isn't changing between watch builds
        return collection;
    }
    // get the root directory of the dependency
    const collectionPackageRootDir = config.sys.path.dirname(pkgJsonFilePath);
    // figure out the full path to the collection collection file
    const collectionFilePath = pathJoin(config, collectionPackageRootDir, pkgData.collection);
    const relPath = config.sys.path.relative(config.rootDir, collectionFilePath);
    config.logger.debug(`load collection: ${collectionName}, ${relPath}`);
    // we haven't cached the collection yet, let's read this file
    // sync on purpose :(
    const collectionJsonStr = compilerCtx.fs.readFileSync(collectionFilePath);
    // get the directory where the collection collection file is sitting
    const collectionDir = normalizePath(config.sys.path.dirname(collectionFilePath));
    // parse the json string into our collection data
    collection = parseCollectionData(config, collectionName, collectionDir, collectionJsonStr);
    if (pkgData.module && pkgData.module !== pkgData.main) {
        collection.hasExports = true;
    }
    // remember the source of this collection node_module
    collection.moduleDir = collectionPackageRootDir;
    // append any collection data
    collection.moduleFiles.forEach(collectionModuleFile => {
        if (!compilerCtx.moduleFiles[collectionModuleFile.jsFilePath]) {
            compilerCtx.moduleFiles[collectionModuleFile.jsFilePath] = collectionModuleFile;
        }
    });
    // cache it for later yo
    compilerCtx.collections.push(collection);
    return collection;
}

function getCollections(config, compilerCtx, collections, moduleFile, importNode) {
    if (!importNode.moduleSpecifier || !compilerCtx || !collections) {
        return;
    }
    const moduleId = importNode.moduleSpecifier.text;
    // see if we can add this collection dependency
    addCollection(config, compilerCtx, collections, moduleFile, config.rootDir, moduleId);
}
function addCollection(config, compilerCtx, collections, moduleFile, resolveFromDir, moduleId) {
    if (moduleId.startsWith('.') || moduleId.startsWith('/')) {
        // not a node module import, so don't bother
        return;
    }
    moduleFile.externalImports = moduleFile.externalImports || [];
    if (!moduleFile.externalImports.includes(moduleId)) {
        moduleFile.externalImports.push(moduleId);
        moduleFile.externalImports.sort();
    }
    if (compilerCtx.resolvedCollections.includes(moduleId)) {
        // we've already handled this collection moduleId before
        return;
    }
    // cache that we've already parsed this
    compilerCtx.resolvedCollections.push(moduleId);
    let pkgJsonFilePath;
    try {
        // get the full package.json file path
        pkgJsonFilePath = normalizePath(config.sys.resolveModule(resolveFromDir, moduleId));
    }
    catch (e) {
        // it's someone else's job to handle unresolvable paths
        return;
    }
    if (pkgJsonFilePath === 'package.json') {
        // the resolved package is actually this very same package, so whatever
        return;
    }
    // open up and parse the package.json
    // sync on purpose :(
    const pkgJsonStr = compilerCtx.fs.readFileSync(pkgJsonFilePath);
    const pkgData = JSON.parse(pkgJsonStr);
    if (!pkgData.collection || !pkgData.types) {
        // this import is not a stencil collection
        return;
    }
    // this import is a stencil collection
    // let's parse it and gather all the module data about it
    // internally it'll cached collection data if we've already done this
    const collection = parseCollectionModule(config, compilerCtx, pkgJsonFilePath, pkgData);
    // check if we already added this collection to the build context
    const alreadyHasCollection = collections.some(c => {
        return c.collectionName === collection.collectionName;
    });
    if (alreadyHasCollection) {
        // we already have this collection in our build context
        return;
    }
    // let's add the collection to the build context
    collections.push(collection);
    if (Array.isArray(collection.dependencies)) {
        // this collection has more collections
        // let's keep digging down and discover all of them
        collection.dependencies.forEach(dependencyModuleId => {
            const resolveFromDir = config.sys.path.dirname(pkgJsonFilePath);
            addCollection(config, compilerCtx, collections, moduleFile, resolveFromDir, dependencyModuleId);
        });
    }
}

function evalText(text) {
    const fnStr = `return ${text};`;
    return new Function(fnStr)();
}
const getDeclarationParameters = (decorator) => {
    if (!ts.isCallExpression(decorator.expression)) {
        return [];
    }
    return decorator.expression.arguments.map((arg) => {
        return evalText(arg.getText().trim());
    });
};
function isDecoratorNamed(name) {
    return (dec) => {
        return (ts.isCallExpression(dec.expression) && dec.expression.expression.getText() === name);
    };
}
function isPropertyWithDecorators(member) {
    return ts.isPropertyDeclaration(member)
        && Array.isArray(member.decorators)
        && member.decorators.length > 0;
}
function isMethodWithDecorators(member) {
    return ts.isMethodDeclaration(member)
        && Array.isArray(member.decorators)
        && member.decorators.length > 0;
}
function serializeSymbol(checker, symbol) {
    return {
        name: symbol.getName(),
        documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
        type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration))
    };
}
function isMethod(member, methodName) {
    if (ts.isMethodDeclaration(member)) {
        return member.getFirstToken().getText() === methodName;
    }
    return false;
}
function getAttributeTypeInfo(baseNode, sourceFile) {
    return getAllTypeReferences(baseNode)
        .reduce((allReferences, rt) => {
        allReferences[rt] = getTypeReferenceLocation(rt, sourceFile);
        return allReferences;
    }, {});
}
function getAllTypeReferences(node) {
    const referencedTypes = [];
    function visit(node) {
        switch (node.kind) {
            case ts.SyntaxKind.TypeReference:
                const typeNode = node;
                if (ts.isIdentifier(typeNode.typeName)) {
                    const name = typeNode.typeName;
                    referencedTypes.push(name.escapedText.toString());
                }
                if (typeNode.typeArguments) {
                    typeNode.typeArguments
                        .filter(ta => ts.isTypeReferenceNode(ta))
                        .forEach((tr) => {
                        const name = tr.typeName;
                        referencedTypes.push(name.escapedText.toString());
                    });
                }
            /* tslint:disable */
            default:
                return ts.forEachChild(node, (node) => {
                    return visit(node);
                });
        }
        /* tslint:enable */
    }
    visit(node);
    return referencedTypes;
}
function getTypeReferenceLocation(typeName, sourceFile) {
    const sourceFileObj = sourceFile.getSourceFile();
    // Loop through all top level imports to find any reference to the type for 'import' reference location
    const importTypeDeclaration = sourceFileObj.statements.find(st => {
        const statement = ts.isImportDeclaration(st) &&
            st.importClause &&
            ts.isImportClause(st.importClause) &&
            st.importClause.namedBindings &&
            ts.isNamedImports(st.importClause.namedBindings) &&
            Array.isArray(st.importClause.namedBindings.elements) &&
            st.importClause.namedBindings.elements.find(nbe => nbe.name.getText() === typeName);
        if (!statement) {
            return false;
        }
        return true;
    });
    if (importTypeDeclaration) {
        const localImportPath = importTypeDeclaration.moduleSpecifier.text;
        return {
            referenceLocation: 'import',
            importReferenceLocation: localImportPath
        };
    }
    // Loop through all top level exports to find if any reference to the type for 'local' reference location
    const isExported = sourceFileObj.statements.some(st => {
        // Is the interface defined in the file and exported
        const isInterfaceDeclarationExported = ((ts.isInterfaceDeclaration(st) &&
            st.name.getText() === typeName) &&
            Array.isArray(st.modifiers) &&
            st.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));
        const isTypeAliasDeclarationExported = ((ts.isTypeAliasDeclaration(st) &&
            st.name.getText() === typeName) &&
            Array.isArray(st.modifiers) &&
            st.modifiers.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword));
        // Is the interface exported through a named export
        const isTypeInExportDeclaration = ts.isExportDeclaration(st) &&
            ts.isNamedExports(st.exportClause) &&
            st.exportClause.elements.some(nee => nee.name.getText() === typeName);
        return isInterfaceDeclarationExported || isTypeAliasDeclarationExported || isTypeInExportDeclaration;
    });
    if (isExported) {
        return {
            referenceLocation: 'local'
        };
    }
    // This is most likely a global type, if it is a local that is not exported then typescript will inform the dev
    return {
        referenceLocation: 'global',
    };
}

function getStylesMeta(componentOptions) {
    let stylesMeta = {};
    if (typeof componentOptions.styles === 'string') {
        // styles: 'div { padding: 10px }'
        componentOptions.styles = componentOptions.styles.trim();
        if (componentOptions.styles.length > 0) {
            stylesMeta = {
                [DEFAULT_STYLE_MODE]: {
                    styleStr: componentOptions.styles
                }
            };
        }
    }
    if (typeof componentOptions.styleUrl === 'string' && componentOptions.styleUrl.trim()) {
        // styleUrl: 'my-styles.css'
        stylesMeta = {
            [DEFAULT_STYLE_MODE]: {
                externalStyles: [{
                        originalComponentPath: componentOptions.styleUrl.trim()
                    }]
            }
        };
    }
    else if (Array.isArray(componentOptions.styleUrls)) {
        // styleUrls: ['my-styles.css', 'my-other-styles']
        stylesMeta = {
            [DEFAULT_STYLE_MODE]: {
                externalStyles: componentOptions.styleUrls.map(styleUrl => {
                    const externalStyle = {
                        originalComponentPath: styleUrl.trim()
                    };
                    return externalStyle;
                })
            }
        };
    }
    else {
        // styleUrls: {
        //   ios: 'badge.ios.css',
        //   md: 'badge.md.css',
        //   wp: 'badge.wp.css'
        // }
        Object.keys(componentOptions.styleUrls || {}).reduce((stylesMeta, styleType) => {
            const styleUrls = componentOptions.styleUrls;
            const sUrls = [].concat(styleUrls[styleType]);
            stylesMeta[styleType] = {
                externalStyles: sUrls.map(sUrl => {
                    const externalStyle = {
                        originalComponentPath: sUrl
                    };
                    return externalStyle;
                })
            };
            return stylesMeta;
        }, stylesMeta);
    }
    return stylesMeta;
}

function getComponentDecoratorMeta(diagnostics, checker, node) {
    if (!node.decorators) {
        return undefined;
    }
    const componentDecorator = node.decorators.find(isDecoratorNamed('Component'));
    if (!componentDecorator) {
        return undefined;
    }
    const [componentOptions] = getDeclarationParameters(componentDecorator);
    if (!componentOptions.tag || componentOptions.tag.trim() === '') {
        throw new Error(`tag missing in component decorator: ${JSON.stringify(componentOptions, null, 2)}`);
    }
    const symbol = checker.getSymbolAtLocation(node.name);
    const cmpMeta = {
        tagNameMeta: componentOptions.tag,
        stylesMeta: getStylesMeta(componentOptions),
        assetsDirsMeta: [],
        hostMeta: getHostMeta(diagnostics, componentOptions.host),
        dependencies: [],
        jsdoc: serializeSymbol(checker, symbol)
    };
    // normalizeEncapsulation
    cmpMeta.encapsulationMeta =
        componentOptions.shadow ? 1 /* ShadowDom */ :
            componentOptions.scoped ? 2 /* ScopedCss */ :
                0 /* NoEncapsulation */;
    // assetsDir: './somedir'
    if (componentOptions.assetsDir) {
        const assetsMeta = {
            originalComponentPath: componentOptions.assetsDir
        };
        cmpMeta.assetsDirsMeta.push(assetsMeta);
    }
    // assetsDirs: ['./somedir', '../someotherdir']
    if (Array.isArray(componentOptions.assetsDirs)) {
        cmpMeta.assetsDirsMeta = cmpMeta.assetsDirsMeta.concat(componentOptions.assetsDirs.map(assetDir => ({ originalComponentPath: assetDir })));
    }
    return cmpMeta;
}
function getHostMeta(diagnostics, hostData) {
    hostData = hostData || {};
    Object.keys(hostData).forEach(key => {
        const type = typeof hostData[key];
        if (type !== 'string' && type !== 'number' && type !== 'boolean') {
            // invalid data
            delete hostData[key];
            let itsType = 'object';
            if (type === 'function') {
                itsType = 'function';
            }
            else if (Array.isArray(hostData[key])) {
                itsType = 'Array';
            }
            const diagnostic = buildWarn(diagnostics);
            diagnostic.messageText = [
                `The @Component decorator's host property "${key}" has a type of "${itsType}". `,
                `However, a @Component decorator's "host" can only take static data, `,
                `such as a string, number or boolean. `,
                `Please use the "hostData()" method instead `,
                `if attributes or properties need to be dynamically added to `,
                `the host element.`
            ].join('');
        }
    });
    return hostData;
}

function getElementDecoratorMeta(checker, classNode) {
    return classNode.members
        .filter(isPropertyWithDecorators)
        .reduce((membersMeta, member) => {
        const elementDecorator = member.decorators.find(isDecoratorNamed('Element'));
        if (elementDecorator) {
            membersMeta[member.name.getText()] = {
                memberType: 7 /* Element */
            };
        }
        return membersMeta;
    }, {});
}

function getEventDecoratorMeta(diagnostics, checker, classNode, sourceFile) {
    return classNode.members
        .filter(isPropertyWithDecorators)
        .reduce((membersMeta, member) => {
        const elementDecorator = member.decorators.find(isDecoratorNamed('Event'));
        if (elementDecorator == null) {
            return membersMeta;
        }
        const [eventOptions] = getDeclarationParameters(elementDecorator);
        const metadata = convertOptionsToMeta(diagnostics, eventOptions, member.name.getText());
        if (member.type) {
            const genericType = gatherEventEmitterGeneric(member.type);
            if (genericType) {
                metadata.eventType = {
                    text: genericType.getText()
                };
                if (ts.isTypeReferenceNode(genericType)) {
                    metadata.eventType.typeReferences = getAttributeTypeInfo(member, sourceFile);
                }
            }
        }
        if (metadata) {
            const symbol = checker.getSymbolAtLocation(member.name);
            metadata.jsdoc = serializeSymbol(checker, symbol);
            metadata.jsdoc.name = metadata.eventName;
            membersMeta.push(metadata);
        }
        return membersMeta;
    }, []);
}
function convertOptionsToMeta(diagnostics, rawEventOpts = {}, memberName) {
    if (!memberName) {
        return null;
    }
    return {
        eventMethodName: memberName,
        eventName: getEventName(diagnostics, rawEventOpts, memberName),
        eventBubbles: typeof rawEventOpts.bubbles === 'boolean' ? rawEventOpts.bubbles : true,
        eventCancelable: typeof rawEventOpts.cancelable === 'boolean' ? rawEventOpts.cancelable : true,
        eventComposed: typeof rawEventOpts.composed === 'boolean' ? rawEventOpts.composed : true
    };
}
function getEventName(diagnostics, rawEventOpts, memberName) {
    if (typeof rawEventOpts.eventName === 'string' && rawEventOpts.eventName.trim().length > 0) {
        // always use the event name if given
        return rawEventOpts.eventName.trim();
    }
    // event name wasn't provided
    // so let's default to use the member name
    validateEventEmitterMemeberName(diagnostics, memberName);
    return memberName;
}
function validateEventEmitterMemeberName(diagnostics, memberName) {
    const firstChar = memberName.charAt(0);
    if (/[A-Z]/.test(firstChar)) {
        const diagnostic = buildWarn(diagnostics);
        diagnostic.messageText = [
            `In order to be compatible with all event listeners on elements, the `,
            `@Event() "${memberName}" cannot start with a capital letter. `,
            `Please lowercase the first character for the event to best work with all listeners.`
        ].join('');
    }
}
function gatherEventEmitterGeneric(type) {
    if (ts.isTypeReferenceNode(type) &&
        ts.isIdentifier(type.typeName) &&
        type.typeName.text === 'EventEmitter' &&
        type.typeArguments &&
        type.typeArguments.length > 0) {
        const eeGen = type.typeArguments[0];
        return eeGen;
    }
    return null;
}

function getListenDecoratorMeta(checker, classNode) {
    const listeners = [];
    classNode.members
        .filter(isMethodWithDecorators)
        .forEach(member => {
        member.decorators
            .filter(isDecoratorNamed('Listen'))
            .map(dec => getDeclarationParameters(dec))
            .forEach(([listenText, listenOptions]) => {
            listenText.split(',').forEach(eventName => {
                const symbol = checker.getSymbolAtLocation(member.name);
                const jsdoc = serializeSymbol(checker, symbol);
                listeners.push(Object.assign({}, validateListener(eventName.trim(), listenOptions, member.name.getText()), { jsdoc }));
            });
        });
    });
    return listeners;
}
function validateListener(eventName, rawListenOpts = {}, methodName) {
    let rawEventName = eventName;
    let splt = eventName.split(':');
    if (splt.length > 2) {
        throw new Error(`@Listen can only contain one colon: ${eventName}`);
    }
    if (splt.length > 1) {
        const prefix = splt[0].toLowerCase().trim();
        if (!isValidElementRefPrefix(prefix)) {
            throw new Error(`invalid @Listen prefix "${prefix}" for "${eventName}"`);
        }
        rawEventName = splt[1].toLowerCase().trim();
    }
    splt = rawEventName.split('.');
    if (splt.length > 2) {
        throw new Error(`@Listen can only contain one period: ${eventName}`);
    }
    if (splt.length > 1) {
        const suffix = splt[1].toLowerCase().trim();
        if (!isValidKeycodeSuffix(suffix)) {
            throw new Error(`invalid @Listen suffix "${suffix}" for "${eventName}"`);
        }
        rawEventName = splt[0].toLowerCase().trim();
    }
    const listenMeta = {
        eventName: eventName,
        eventMethodName: methodName
    };
    listenMeta.eventCapture = (typeof rawListenOpts.capture === 'boolean') ? rawListenOpts.capture : false;
    listenMeta.eventPassive = (typeof rawListenOpts.passive === 'boolean') ? rawListenOpts.passive :
        // if the event name is kown to be a passive event then set it to true
        (PASSIVE_TRUE_DEFAULTS.indexOf(rawEventName.toLowerCase()) > -1);
    // default to enabled=true if it wasn't provided
    listenMeta.eventDisabled = (rawListenOpts.enabled === false);
    return listenMeta;
}
function isValidElementRefPrefix(prefix) {
    return (VALID_ELEMENT_REF_PREFIXES.indexOf(prefix) > -1);
}
function isValidKeycodeSuffix(prefix) {
    return (VALID_KEYCODE_SUFFIX.indexOf(prefix) > -1);
}
const PASSIVE_TRUE_DEFAULTS = [
    'dragstart', 'drag', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop',
    'mouseenter', 'mouseover', 'mousemove', 'mousedown', 'mouseup', 'mouseleave', 'mouseout', 'mousewheel',
    'pointerover', 'pointerenter', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerout', 'pointerleave',
    'resize',
    'scroll',
    'touchstart', 'touchmove', 'touchend', 'touchenter', 'touchleave', 'touchcancel',
    'wheel',
];
const VALID_ELEMENT_REF_PREFIXES = [
    'child', 'parent', 'body', 'document', 'window'
];
const VALID_KEYCODE_SUFFIX = [
    'enter', 'escape', 'space', 'tab', 'up', 'right', 'down', 'left'
];

function validatePublicName(diagnostics, componentClass, memberName, decorator, memberType) {
    if (isReservedMember(memberName)) {
        const diagnostic = buildWarn(diagnostics);
        diagnostic.messageText = [
            `The ${decorator} name "${memberName}" used within the "${componentClass}" class is a reserved public name. `,
            `Please rename the "${memberName}" ${memberType} so it does not conflict with an existing standardized prototype member. `,
            `Reusing ${memberType} names that are already defined on the element's prototype may cause `,
            `unexpected runtime errors or user-interface issues on various browsers, so it's best to avoid them entirely.`
        ].join('');
    }
}
const READ_ONLY_PROPERTIES = [
    'attributes',
    'baseURI',
    'childElementCount',
    'childNodes',
    'children',
    'classList',
    'clientHeight',
    'clientLeft',
    'clientTop',
    'clientWidth',
    'contentEditable',
    'dataset',
    'firstChild',
    'firstElementChild',
    'host',
    'is',
    'isConnected',
    'isContentEditable',
    'lastChild',
    'lastElementChild',
    'localName',
    'namespaceURI',
    'nextElementSibling',
    'nextSibling',
    'nodeName',
    'nodePrincipal',
    'nodeType',
    'nodeValue',
    'offsetHeight',
    'offsetLeft',
    'offsetParent',
    'offsetTop',
    'offsetWidth',
    'ownerDocument',
    'parentElement',
    'parentNode',
    'prefix',
    'previousElementSibling',
    'previousSibling',
    'rootNode',
    'runtimeStyle',
    'scrollHeight',
    'scrollLeft',
    'scrollLeftMax',
    'scrollTop',
    'scrollTopMax',
    'scrollWidth',
    'shadowRoot',
    'slot',
    'tagName',
    'title',
];
const METHODS = [
    'addEventListener',
    'after',
    'animate',
    'append',
    'appendChild',
    'attachEvent',
    'attachShadow',
    'before',
    'blur',
    'click',
    'cloneNode',
    'closest',
    'compareDocumentPosition',
    'contains',
    'detachEvent',
    'dispatchEvent',
    'fireEvent',
    'focus',
    'getAttribute',
    'getAttributeNames',
    'getAttributeNode',
    'getAttributeNodeNS',
    'getAttributeNS',
    'getBoundingClientRect',
    'getClientRects',
    'getElementsByClassName',
    'getElementsByTagName',
    'getElementsByTagNameNS',
    'getRootNode',
    'getUserData',
    'hasAttribute',
    'hasAttributeNS',
    'hasAttributes',
    'hasChildNodes',
    'insertAdjacentElement',
    'insertAdjacentHTML',
    'insertAdjacentText',
    'insertBefore',
    'isDefaultNamespace',
    'isEqualNode',
    'isSameNode',
    'isSupported',
    'lookupNamespaceURI',
    'lookupPrefix',
    'matches',
    'normalize',
    'prepend',
    'querySelector',
    'querySelectorAll',
    'querySelectorAll',
    'releasePointerCapture',
    'removeChild',
    'remove',
    'removeAttribute',
    'removeAttributeNode',
    'removeAttributeNS',
    'removeEventListener',
    'replaceChild',
    'replaceWith',
    'requestFullscreen',
    'requestPointerLock',
    'scrollIntoView',
    'scrollIntoViewIfNeeded',
    'setAttribute',
    'setAttributeNode',
    'setAttributeNodeNS',
    'setAttributeNS',
    'setCapture',
    'setPointerCapture',
];
const EVENT_HANDLERS = [
    'onabort',
    'onanimationend',
    'onanimationendcapture',
    'onanimationiteration',
    'onanimationiterationcapture',
    'onanimationstart',
    'onanimationstartcapture',
    'onauxclick',
    'onbeforecopy',
    'onbeforecut',
    'onbeforepaste',
    'onblur',
    'onblurcapture',
    'oncancel',
    'oncanplaythrough',
    'onchange',
    'onchangecapture',
    'onclick',
    'onclickcapture',
    'onclose',
    'oncompositionend',
    'oncompositionendcapture',
    'oncompositionstart',
    'oncompositionstartcapture',
    'oncompositionupdate',
    'oncompositionupdatecapture',
    'oncontextmenu',
    'oncontextmenucapture',
    'oncopy',
    'oncopycapture',
    'oncuechange',
    'oncut',
    'oncutcapture',
    'ondblclick',
    'ondblclickcapture',
    'ondrag',
    'ondragcapture',
    'ondragend',
    'ondragendcapture',
    'ondragenter',
    'ondragentercapture',
    'ondragexit',
    'ondragexitcapture',
    'ondragleave',
    'ondragleavecapture',
    'ondragover',
    'ondragovercapture',
    'ondragstart',
    'ondragstartcapture',
    'ondrop',
    'ondropcapture',
    'ondurationchange',
    'onemptied',
    'onended',
    'onerror',
    'onerrorcapture',
    'onfocus',
    'onfocuscapture',
    'onfullscreenchange',
    'onfullscreenerror',
    'ongotpointercapture',
    'oninput',
    'oninputcapture',
    'oninvalid',
    'oninvalidcapture',
    'onkeydown',
    'onkeydowncapture',
    'onkeypress',
    'onkeypresscapture',
    'onkeyup',
    'onkeyupcapture',
    'onload',
    'onloadcapture',
    'onloadeddata',
    'onloadedmetadata',
    'onloadstart',
    'onlostpointercapture',
    'onmousedown',
    'onmousedowncapture',
    'onmouseenter',
    'onmouseleave',
    'onmousemove',
    'onmousemovecapture',
    'onmouseout',
    'onmouseoutcapture',
    'onmouseover',
    'onmouseovercapture',
    'onmouseup',
    'onmouseupcapture',
    'onpaste',
    'onpastecapture',
    'onpause',
    'onplay',
    'onplaying',
    'onpointercancel',
    'onpointerdown',
    'onpointerenter',
    'onpointerleave',
    'onpointermove',
    'onpointerout',
    'onpointerover',
    'onpointerup',
    'onprogress',
    'onratechange',
    'onreset',
    'onresetcapture',
    'onresize',
    'onscroll',
    'onscrollcapture',
    'onsearch',
    'onseeked',
    'onseeking',
    'onselectstart',
    'onstalled',
    'onsubmit',
    'onsubmitcapture',
    'onsuspend',
    'ontimeupdate',
    'ontoggle',
    'ontouchcancel',
    'ontouchcancelcapture',
    'ontouchend',
    'ontouchendcapture',
    'ontouchmove',
    'ontouchmovecapture',
    'ontouchstart',
    'ontouchstartcapture',
    'ontransitionend',
    'ontransitionendcapture',
    'onvolumechange',
    'onwaiting',
    'onwebkitfullscreenchange',
    'onwebkitfullscreenerror',
    'onwheel',
    'onwheelcapture',
];
const RESERVED_PUBLIC_MEMBERS = [
    ...READ_ONLY_PROPERTIES,
    ...METHODS,
    ...EVENT_HANDLERS
].map(p => p.toLowerCase());
function isReservedMember(memberName) {
    memberName = memberName.toLowerCase();
    return RESERVED_PUBLIC_MEMBERS.includes(memberName);
}

function getMethodDecoratorMeta(diagnostics, checker, classNode, sourceFile, componentClass) {
    return classNode.members
        .filter(isMethodWithDecorators)
        .reduce((membersMeta, member) => {
        const methodDecorator = member.decorators.find(isDecoratorNamed('Method'));
        if (methodDecorator == null) {
            return membersMeta;
        }
        const symbol = checker.getSymbolAtLocation(member.name);
        const methodName = member.name.getText();
        const methodSignature = checker.getSignatureFromDeclaration(member);
        const flags = ts.TypeFormatFlags.WriteArrowStyleSignature;
        const returnType = checker.getReturnTypeOfSignature(methodSignature);
        const typeString = checker.signatureToString(methodSignature, classNode, flags, ts.SignatureKind.Call);
        let methodReturnTypes = {};
        const returnTypeNode = checker.typeToTypeNode(returnType);
        if (returnTypeNode) {
            methodReturnTypes = getAttributeTypeInfo(returnTypeNode, sourceFile);
        }
        validatePublicName(diagnostics, componentClass, methodName, '@Method()', 'method');
        membersMeta[methodName] = {
            memberType: 6 /* Method */,
            attribType: {
                text: typeString,
                typeReferences: Object.assign({}, methodReturnTypes, getAttributeTypeInfo(member, sourceFile))
            },
            jsdoc: serializeSymbol(checker, symbol)
        };
        return membersMeta;
    }, {});
}

class BuildEvents {
    constructor() {
        this.evCallbacks = {};
    }
    subscribe(eventName, cb) {
        const evName = getEventName$1(eventName);
        if (!this.evCallbacks[evName]) {
            this.evCallbacks[evName] = [];
        }
        this.evCallbacks[evName].push(cb);
        return () => {
            this.unsubscribe(evName, cb);
        };
    }
    unsubscribe(eventName, cb) {
        const evName = getEventName$1(eventName);
        if (this.evCallbacks[evName]) {
            const index = this.evCallbacks[evName].indexOf(cb);
            if (index > -1) {
                this.evCallbacks[evName].splice(index, 1);
            }
        }
    }
    unsubscribeAll() {
        this.evCallbacks = {};
    }
    emit(eventName, ...args) {
        const evName = getEventName$1(eventName);
        const evCallbacks = this.evCallbacks[evName];
        if (evCallbacks) {
            evCallbacks.forEach(cb => {
                try {
                    cb.apply(this, args);
                }
                catch (e) {
                    console.log(e);
                }
            });
        }
    }
}
function getEventName$1(evName) {
    return evName.trim().toLowerCase();
}

function getModuleFile(compilerCtx, sourceFilePath) {
    sourceFilePath = normalizePath(sourceFilePath);
    return compilerCtx.moduleFiles[sourceFilePath] = compilerCtx.moduleFiles[sourceFilePath] || {
        sourceFilePath: sourceFilePath,
        localImports: [],
        externalImports: [],
        potentialCmpRefs: []
    };
}
function getCompilerCtx(config, compilerCtx) {
    // reusable data between builds
    compilerCtx = compilerCtx || {};
    compilerCtx.isActivelyBuilding = false;
    compilerCtx.fs = compilerCtx.fs || new InMemoryFileSystem(config.sys.fs, config.sys);
    if (!compilerCtx.cache) {
        compilerCtx.cache = new Cache(config, new InMemoryFileSystem(config.sys.fs, config.sys));
        compilerCtx.cache.initCacheDir();
    }
    compilerCtx.events = compilerCtx.events || new BuildEvents();
    compilerCtx.appFiles = compilerCtx.appFiles || {};
    compilerCtx.moduleFiles = compilerCtx.moduleFiles || {};
    compilerCtx.collections = compilerCtx.collections || [];
    compilerCtx.resolvedCollections = compilerCtx.resolvedCollections || [];
    compilerCtx.compiledModuleJsText = compilerCtx.compiledModuleJsText || {};
    compilerCtx.compiledModuleLegacyJsText = compilerCtx.compiledModuleLegacyJsText || {};
    compilerCtx.lastBuildStyles = compilerCtx.lastBuildStyles || new Map();
    compilerCtx.cachedStyleMeta = compilerCtx.cachedStyleMeta || new Map();
    compilerCtx.lastComponentStyleInput = compilerCtx.lastComponentStyleInput || new Map();
    if (typeof compilerCtx.activeBuildId !== 'number') {
        compilerCtx.activeBuildId = -1;
    }
    return compilerCtx;
}

function getPropDecoratorMeta(diagnostics, checker, classNode, sourceFile, componentClass) {
    return classNode.members
        .filter(member => Array.isArray(member.decorators) && member.decorators.length > 0)
        .reduce((allMembers, prop) => {
        const memberData = {};
        const propDecorator = prop.decorators.find(isDecoratorNamed('Prop'));
        if (propDecorator == null) {
            return allMembers;
        }
        const propOptions = getPropOptions(propDecorator, diagnostics);
        const memberName = prop.name.text;
        const symbol = checker.getSymbolAtLocation(prop.name);
        if (propOptions && typeof propOptions.connect === 'string') {
            // @Prop({ connect: 'ion-alert-controller' })
            memberData.memberType = 4 /* PropConnect */;
            memberData.ctrlId = propOptions.connect;
        }
        else if (propOptions && typeof propOptions.context === 'string') {
            // @Prop({ context: 'config' })
            memberData.memberType = 3 /* PropContext */;
            memberData.ctrlId = propOptions.context;
        }
        else {
            // @Prop()
            const type = checker.getTypeAtLocation(prop);
            validatePublicName(diagnostics, componentClass, memberName, '@Prop()', 'property');
            memberData.memberType = getMemberType(propOptions);
            memberData.attribName = getAttributeName(propOptions, memberName);
            memberData.attribType = getAttribType(diagnostics, sourceFile, prop);
            memberData.reflectToAttrib = getReflectToAttr(propOptions);
            memberData.propType = propTypeFromTSType(type, memberData.attribType.text);
            memberData.jsdoc = serializeSymbol(checker, symbol);
        }
        allMembers[memberName] = memberData;
        return allMembers;
    }, {});
}
function getPropOptions(propDecorator, diagnostics) {
    const suppliedOptions = propDecorator.expression.arguments
        .map(arg => {
        try {
            const fnStr = `return ${arg.getText()};`;
            return new Function(fnStr)();
        }
        catch (e) {
            catchError(diagnostics, e, `parse prop options: ${e}`);
        }
    });
    const propOptions = suppliedOptions[0];
    return propOptions;
}
function getMemberType(propOptions) {
    if (propOptions && propOptions.mutable === true) {
        return 2 /* PropMutable */;
    }
    return 1 /* Prop */;
}
function getAttributeName(propOptions, memberName) {
    if (propOptions && typeof propOptions.attr === 'string' && propOptions.attr.trim().length > 0) {
        return propOptions.attr.trim();
    }
    return toDashCase(memberName);
}
function getReflectToAttr(propOptions) {
    if (propOptions && propOptions.reflectToAttr === true) {
        return true;
    }
    return false;
}
function getAttribType(diagnostics, sourceFile, prop) {
    let attribType;
    // If the @Prop() attribute does not have a defined type then infer it
    if (!prop.type) {
        let attribTypeText = inferPropType(prop.initializer);
        if (!attribTypeText) {
            attribTypeText = 'any';
            const diagnostic = buildWarn(diagnostics);
            diagnostic.messageText = `Prop type provided is not supported, defaulting to any: '${prop.getFullText()}'`;
        }
        attribType = {
            text: attribTypeText,
        };
    }
    else {
        attribType = {
            text: prop.type.getText(),
            typeReferences: getAttributeTypeInfo(prop.type, sourceFile)
        };
    }
    return attribType;
}
function inferPropType(expression) {
    if (expression == null) {
        return undefined;
    }
    if (ts.isStringLiteral(expression)) {
        return 'string';
    }
    if (ts.isNumericLiteral(expression)) {
        return 'number';
    }
    if ([ts.SyntaxKind.BooleanKeyword, ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].indexOf(expression.kind) !== -1) {
        return 'boolean';
    }
    if ((ts.SyntaxKind.NullKeyword === expression.kind) ||
        (ts.SyntaxKind.UndefinedKeyword === expression.kind) ||
        (ts.isRegularExpressionLiteral(expression)) ||
        (ts.isArrayLiteralExpression(expression)) ||
        (ts.isObjectLiteralExpression(expression))) {
        return 'any';
    }
    return undefined;
}
function propTypeFromTSType(type, text) {
    const isStr = checkType(type, isString);
    const isNu = checkType(type, isNumber);
    const isBool = checkType(type, isBoolean);
    // if type is more than a primitive type at the same time, we mark it as any
    if (Number(isStr) + Number(isNu) + Number(isBool) > 1) {
        return 1 /* Any */;
    }
    // at this point we know the prop's type is NOT the mix of primitive types
    if (isStr) {
        return 2 /* String */;
    }
    if (isNu) {
        return 4 /* Number */;
    }
    if (isBool) {
        return 3 /* Boolean */;
    }
    if (text === 'any') {
        return 1 /* Any */;
    }
    return 0 /* Unknown */;
}
function checkType(type, check) {
    if (type.flags & ts.TypeFlags.Union) {
        const union = type;
        if (union.types.some(type => checkType(type, check))) {
            return true;
        }
    }
    return check(type);
}
function isBoolean(t) {
    if (t) {
        return !!(t.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLike | ts.TypeFlags.BooleanLike));
    }
    return false;
}
function isNumber(t) {
    if (t) {
        return !!(t.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLike | ts.TypeFlags.NumberLiteral));
    }
    return false;
}
function isString(t) {
    if (t) {
        return !!(t.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLike | ts.TypeFlags.StringLiteral));
    }
    return false;
}

function getStateDecoratorMeta(classNode) {
    return classNode.members
        .filter(isPropertyWithDecorators)
        .reduce((membersMeta, member) => {
        const elementDecorator = member.decorators.find(isDecoratorNamed('State'));
        if (elementDecorator) {
            membersMeta[member.name.getText()] = {
                memberType: 5 /* State */
            };
        }
        return membersMeta;
    }, {});
}

function getWatchDecoratorMeta(diagnostics, classNode, cmpMeta) {
    const methods = classNode.members.filter(isMethodWithDecorators);
    getChangeMetaByName(diagnostics, methods, cmpMeta, 'Watch');
    getChangeMetaByName(diagnostics, methods, cmpMeta, 'PropWillChange');
    getChangeMetaByName(diagnostics, methods, cmpMeta, 'PropDidChange');
}
function getChangeMetaByName(diagnostics, methods, cmpMeta, decoratorName) {
    methods.forEach(({ decorators, name }) => {
        decorators
            .filter(isDecoratorNamed(decoratorName))
            .forEach(propChangeDecorator => {
            const [propName] = getDeclarationParameters(propChangeDecorator);
            if (propName) {
                updateWatchCallback(diagnostics, cmpMeta, propName, name, decoratorName);
            }
        });
    });
}
function updateWatchCallback(diagnostics, cmpMeta, propName, decoratorData, decoratorName) {
    if (!isPropWatchable(cmpMeta, propName)) {
        const error = buildError(diagnostics);
        error.messageText = `@Watch('${propName}') is trying to watch for changes in a property that does not exist.
Make sure only properties decorated with @State() or @Prop() are watched.`;
        return;
    }
    cmpMeta.membersMeta[propName].watchCallbacks = cmpMeta.membersMeta[propName].watchCallbacks || [];
    cmpMeta.membersMeta[propName].watchCallbacks.push(decoratorData.getText());
    if (decoratorName === 'PropWillChange' || decoratorName === 'PropDidChange') {
        const diagnostic = buildWarn(diagnostics);
        diagnostic.messageText = `@${decoratorName}('${propName}') decorator within "${cmpMeta.tagNameMeta}" component has been deprecated. Please update to @Watch('${propName}').`;
    }
}
function isPropWatchable(cmpMeta, propName) {
    const membersMeta = cmpMeta.membersMeta;
    if (!membersMeta) {
        return false;
    }
    const member = membersMeta[propName];
    if (!member) {
        return false;
    }
    const type = member.memberType;
    return type === 5 /* State */ || type === 1 /* Prop */ || type === 2 /* PropMutable */;
}

function normalizeAssetsDir(config, componentFilePath, assetsMetas) {
    return assetsMetas.map((assetMeta) => {
        return Object.assign({}, assetMeta, normalizeAssetDir(config, componentFilePath, assetMeta.originalComponentPath));
    });
}
function normalizeAssetDir(config, componentFilePath, assetsDir) {
    const assetsMeta = {};
    // get the absolute path of the directory which the component is sitting in
    const componentDir = normalizePath(config.sys.path.dirname(componentFilePath));
    // get the relative path from the component file to the assets directory
    assetsDir = normalizePath(assetsDir.trim());
    if (config.sys.path.isAbsolute(assetsDir)) {
        // this path is absolute already!
        // add as the absolute path
        assetsMeta.absolutePath = assetsDir;
        // if this is an absolute path already, let's convert it to be relative
        assetsMeta.cmpRelativePath = config.sys.path.relative(componentDir, assetsDir);
    }
    else {
        // this path is relative to the component
        assetsMeta.cmpRelativePath = assetsDir;
        // create the absolute path to the asset dir
        assetsMeta.absolutePath = pathJoin(config, componentDir, assetsDir);
    }
    return assetsMeta;
}

function normalizeStyles(config, componentFilePath, stylesMeta) {
    const newStylesMeta = {};
    Object.keys(stylesMeta).forEach((modeName) => {
        newStylesMeta[modeName] = {
            externalStyles: []
        };
        const externalStyles = stylesMeta[modeName].externalStyles || [];
        newStylesMeta[modeName].externalStyles = externalStyles.map(externalStyle => {
            const { cmpRelativePath, absolutePath } = normalizeModeStylePaths(config, componentFilePath, externalStyle.originalComponentPath);
            const normalizedExternalStyles = {
                absolutePath: absolutePath,
                cmpRelativePath: cmpRelativePath,
                originalComponentPath: externalStyle.originalComponentPath,
                originalCollectionPath: externalStyle.originalCollectionPath
            };
            return normalizedExternalStyles;
        });
        if (typeof stylesMeta[modeName].styleStr === 'string') {
            newStylesMeta[modeName].styleStr = stylesMeta[modeName].styleStr;
        }
    });
    return newStylesMeta;
}
function normalizeModeStylePaths(config, componentFilePath, stylePath) {
    let cmpRelativePath;
    let absolutePath;
    // get the absolute path of the directory which the component is sitting in
    const componentDir = normalizePath(config.sys.path.dirname(componentFilePath));
    // get the relative path from the component file to the style
    let componentRelativeStylePath = normalizePath(stylePath.trim());
    if (config.sys.path.isAbsolute(componentRelativeStylePath)) {
        // this path is absolute already!
        // add to our list of style absolute paths
        absolutePath = componentRelativeStylePath;
        // if this is an absolute path already, let's convert it to be relative
        componentRelativeStylePath = config.sys.path.relative(componentDir, componentRelativeStylePath);
        // add to our list of style relative paths
        cmpRelativePath = componentRelativeStylePath;
    }
    else {
        // this path is relative to the component
        // add to our list of style relative paths
        cmpRelativePath = componentRelativeStylePath;
        // create the absolute path to the style file
        const absoluteStylePath = normalizePath(config.sys.path.join(componentDir, componentRelativeStylePath));
        // add to our list of style absolute paths
        absolutePath = absoluteStylePath;
    }
    return {
        cmpRelativePath,
        absolutePath
    };
}

function validateComponentClass(diagnostics, cmpMeta, classNode) {
    requiresReturnStatement(diagnostics, cmpMeta, classNode, 'hostData');
    requiresReturnStatement(diagnostics, cmpMeta, classNode, 'render');
}
function requiresReturnStatement(diagnostics, cmpMeta, classNode, methodName) {
    const classElm = classNode.members.find(m => isMethod(m, methodName));
    if (!classElm)
        return;
    let hasReturn = false;
    function visitNode(node) {
        if (node.kind === ts.SyntaxKind.ReturnStatement) {
            hasReturn = true;
        }
        ts.forEachChild(node, visitNode);
    }
    ts.forEachChild(classElm, visitNode);
    if (!hasReturn) {
        const diagnostic = buildWarn(diagnostics);
        diagnostic.messageText = `The "${methodName}()" method within the "${cmpMeta.tagNameMeta}" component is missing a "return" statement.`;
    }
}

function gatherMetadata(config, compilerCtx, buildCtx, typeChecker) {
    return (transformContext) => {
        function visit(node, tsSourceFile, moduleFile) {
            if (node.kind === ts.SyntaxKind.ImportDeclaration) {
                getCollections(config, compilerCtx, buildCtx.collections, moduleFile, node);
            }
            if (ts.isClassDeclaration(node)) {
                const cmpMeta = visitClass(buildCtx.diagnostics, typeChecker, node, tsSourceFile);
                if (cmpMeta) {
                    moduleFile.cmpMeta = cmpMeta;
                    cmpMeta.stylesMeta = normalizeStyles(config, moduleFile.sourceFilePath, cmpMeta.stylesMeta);
                    cmpMeta.assetsDirsMeta = normalizeAssetsDir(config, moduleFile.sourceFilePath, cmpMeta.assetsDirsMeta);
                }
            }
            return ts.visitEachChild(node, (node) => {
                return visit(node, tsSourceFile, moduleFile);
            }, transformContext);
        }
        return (tsSourceFile) => {
            const moduleFile = getModuleFile(compilerCtx, tsSourceFile.fileName);
            moduleFile.externalImports.length = 0;
            moduleFile.localImports.length = 0;
            return visit(tsSourceFile, tsSourceFile, moduleFile);
        };
    };
}
function visitClass(diagnostics, typeChecker, classNode, sourceFile) {
    const cmpMeta = getComponentDecoratorMeta(diagnostics, typeChecker, classNode);
    if (!cmpMeta) {
        return null;
    }
    const componentClass = classNode.name.getText().trim();
    cmpMeta.componentClass = componentClass;
    cmpMeta.membersMeta = Object.assign({}, getElementDecoratorMeta(typeChecker, classNode), getMethodDecoratorMeta(diagnostics, typeChecker, classNode, sourceFile, componentClass), getStateDecoratorMeta(classNode), getPropDecoratorMeta(diagnostics, typeChecker, classNode, sourceFile, componentClass));
    cmpMeta.eventsMeta = getEventDecoratorMeta(diagnostics, typeChecker, classNode, sourceFile);
    cmpMeta.listenersMeta = getListenDecoratorMeta(typeChecker, classNode);
    // watch meta collection MUST happen after prop/state decorator meta collection
    getWatchDecoratorMeta(diagnostics, classNode, cmpMeta);
    // validate the user's component class for any common errors
    validateComponentClass(diagnostics, cmpMeta, classNode);
    // Return Class Declaration with Decorator removed and as default export
    return cmpMeta;
}

/**
 * Ok, so formatting overkill, we know. But whatever, it makes for great
 * error reporting within a terminal. So, yeah, let's code it up, shall we?
 */
function loadTypeScriptDiagnostics(config, resultsDiagnostics, tsDiagnostics) {
    const maxErrors = Math.min(tsDiagnostics.length, MAX_ERRORS);
    for (let i = 0; i < maxErrors; i++) {
        resultsDiagnostics.push(loadDiagnostic(config, tsDiagnostics[i]));
    }
}
function loadDiagnostic(config, tsDiagnostic) {
    const d = {
        level: 'warn',
        type: 'typescript',
        language: 'typescript',
        header: 'TypeScript',
        code: tsDiagnostic.code.toString(),
        messageText: formatMessageText(tsDiagnostic),
        relFilePath: null,
        absFilePath: null,
        lines: []
    };
    if (tsDiagnostic.category === ts.DiagnosticCategory.Error) {
        d.level = 'error';
    }
    if (tsDiagnostic.file) {
        d.absFilePath = normalizePath(tsDiagnostic.file.fileName);
        if (config) {
            d.relFilePath = normalizePath(config.sys.path.relative(config.cwd, d.absFilePath));
            if (!d.relFilePath.includes('/')) {
                d.relFilePath = './' + d.relFilePath;
            }
        }
        const sourceText = tsDiagnostic.file.text;
        const srcLines = splitLineBreaks(sourceText);
        const posData = tsDiagnostic.file.getLineAndCharacterOfPosition(tsDiagnostic.start);
        const errorLine = {
            lineIndex: posData.line,
            lineNumber: posData.line + 1,
            text: srcLines[posData.line],
            errorCharStart: posData.character,
            errorLength: Math.max(tsDiagnostic.length, 1)
        };
        d.lineNumber = errorLine.lineNumber;
        d.columnNumber = errorLine.errorCharStart;
        d.lines.push(errorLine);
        if (errorLine.errorLength === 0 && errorLine.errorCharStart > 0) {
            errorLine.errorLength = 1;
            errorLine.errorCharStart--;
        }
        if (errorLine.lineIndex > 0) {
            const previousLine = {
                lineIndex: errorLine.lineIndex - 1,
                lineNumber: errorLine.lineNumber - 1,
                text: srcLines[errorLine.lineIndex - 1],
                errorCharStart: -1,
                errorLength: -1
            };
            d.lines.unshift(previousLine);
        }
        if (errorLine.lineIndex + 1 < srcLines.length) {
            const nextLine = {
                lineIndex: errorLine.lineIndex + 1,
                lineNumber: errorLine.lineNumber + 1,
                text: srcLines[errorLine.lineIndex + 1],
                errorCharStart: -1,
                errorLength: -1
            };
            d.lines.push(nextLine);
        }
    }
    return d;
}
function formatMessageText(tsDiagnostic) {
    let diagnosticChain = tsDiagnostic.messageText;
    if (typeof diagnosticChain === 'string') {
        return diagnosticChain;
    }
    const ignoreCodes = [];
    const isStencilConfig = tsDiagnostic.file.fileName.includes('stencil.config');
    if (isStencilConfig) {
        ignoreCodes.push(2322);
    }
    let result = '';
    while (diagnosticChain) {
        if (!ignoreCodes.includes(diagnosticChain.code)) {
            result += diagnosticChain.messageText + ' ';
        }
        diagnosticChain = diagnosticChain.next;
    }
    if (isStencilConfig) {
        result = result.replace(`type 'StencilConfig'`, `Stencil Config`);
        result = result.replace(`Object literal may only specify known properties, but `, ``);
        result = result.replace(`Object literal may only specify known properties, and `, ``);
    }
    return result.trim();
}

function removeCollectionImports(compilerCtx) {
    /*
  
      // remove side effect collection imports like:
      import 'ionicons';
  
      // do not remove collection imports with importClauses:
      import * as asdf 'ionicons';
      import { asdf } '@ionic/core';
  
    */
    return (transformContext) => {
        function visitImport(importNode) {
            if (!importNode.importClause && importNode.moduleSpecifier && ts.isStringLiteral(importNode.moduleSpecifier)) {
                // must not have an import clause
                // must have a module specifier and
                // the module specifier must be a string literal
                const moduleImport = importNode.moduleSpecifier.text;
                // test if this side effect import is a collection
                const isCollectionImport = compilerCtx.collections.some(c => {
                    return c.collectionName === moduleImport;
                });
                if (isCollectionImport) {
                    // turns out this is a side effect import is a collection,
                    // we actually don't want to include this in the JS output
                    // we've already gather the types we needed, kthxbai
                    return null;
                }
            }
            return importNode;
        }
        function visit(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ImportDeclaration:
                    return visitImport(node);
                default:
                    return ts.visitEachChild(node, visit, transformContext);
            }
        }
        return (tsSourceFile) => {
            return visit(tsSourceFile);
        };
    };
}

const CLASS_DECORATORS_TO_REMOVE = new Set(['Component']);
// same as the "declare" variables in the root index.ts file
const DECORATORS_TO_REMOVE = new Set([
    'Element',
    'Event',
    'Listen',
    'Method',
    'Prop',
    'PropDidChange',
    'PropWillChange',
    'State',
    'Watch'
]);
/**
 * Remove all decorators that are for metadata purposes
 */
function removeDecorators() {
    return (transformContext) => {
        function visit(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    if (!isComponentClass(node)) {
                        return node;
                    }
                    return visitComponentClass(node);
                default:
                    return ts.visitEachChild(node, visit, transformContext);
            }
        }
        return (tsSourceFile) => visit(tsSourceFile);
    };
}
/**
 * Visit the component class and remove decorators
 * @param classNode
 */
function visitComponentClass(classNode) {
    classNode.decorators = removeDecoratorsByName(classNode.decorators, CLASS_DECORATORS_TO_REMOVE);
    classNode.members.forEach((member) => {
        if (Array.isArray(member.decorators)) {
            member.decorators = removeDecoratorsByName(member.decorators, DECORATORS_TO_REMOVE);
        }
    });
    return classNode;
}
/**
 * Remove a decorator from the an array by name
 * @param decorators array of decorators
 * @param name name to remove
 */
function removeDecoratorsByName(decoratorList, names) {
    const updatedDecoratorList = decoratorList.filter(dec => {
        const toRemove = ts.isCallExpression(dec.expression) &&
            ts.isIdentifier(dec.expression.expression) &&
            names.has(dec.expression.expression.text);
        return !toRemove;
    });
    if (updatedDecoratorList.length === 0 && decoratorList.length > 0) {
        return undefined;
    }
    if (updatedDecoratorList.length !== decoratorList.length) {
        return ts.createNodeArray(updatedDecoratorList);
    }
    return decoratorList;
}

function removeStencilImports() {
    return (transformContext) => {
        function visitImport(importNode) {
            if (importNode.moduleSpecifier &&
                ts.isStringLiteral(importNode.moduleSpecifier) &&
                importNode.moduleSpecifier.text === '@stencil/core') {
                return null;
            }
            return importNode;
        }
        function visit(node) {
            switch (node.kind) {
                case ts.SyntaxKind.ImportDeclaration:
                    return visitImport(node);
                default:
                    return ts.visitEachChild(node, visit, transformContext);
            }
        }
        return (tsSourceFile) => {
            return visit(tsSourceFile);
        };
    };
}

/**
 * This is only used during TESTING
 */
function transpileModuleForTesting(config, options, sourceFilePath, input) {
    const compilerCtx = {
        collections: [],
        moduleFiles: {},
        resolvedCollections: [],
        events: {
            emit: noop,
            subscribe: noop,
            unsubscribe: noop,
            unsubscribeAll: noop
        }
    };
    const buildCtx = new BuildContext(config, compilerCtx);
    sourceFilePath = normalizePath(sourceFilePath);
    const results = {
        sourceFilePath: sourceFilePath,
        code: null,
        diagnostics: [],
        cmpMeta: null
    };
    options.isolatedModules = true;
    // transpileModule does not write anything to disk so there is no need to verify that there are no conflicts between input and output paths.
    options.suppressOutputPathCheck = true;
    // Filename can be non-ts file.
    options.allowNonTsExtensions = true;
    // We are not returning a sourceFile for lib file when asked by the program,
    // so pass --noLib to avoid reporting a file not found error.
    options.noLib = true;
    // Clear out other settings that would not be used in transpiling this module
    options.lib = undefined;
    options.types = undefined;
    options.noEmit = undefined;
    options.noEmitOnError = undefined;
    options.paths = undefined;
    options.rootDirs = undefined;
    options.declaration = undefined;
    options.declarationDir = undefined;
    options.out = undefined;
    options.outFile = undefined;
    // We are not doing a full typecheck, we are not resolving the whole context,
    // so pass --noResolve to avoid reporting missing file errors.
    options.noResolve = true;
    // if jsx is specified then treat file as .tsx
    const inputFileName = sourceFilePath || (options.jsx ? `module.tsx` : `module.ts`);
    const sourceFile = ts.createSourceFile(inputFileName, input, options.target);
    // Create a compilerHost object to allow the compiler to read and write files
    const compilerHost = {
        getSourceFile: (fileName) => fileName === normalizePath(inputFileName) ? sourceFile : undefined,
        writeFile: function (name, text) {
            if (name.endsWith('.map')) {
                results.map = text;
            }
            else {
                results.code = text;
            }
        },
        getDefaultLibFileName: () => `lib.d.ts`,
        useCaseSensitiveFileNames: () => false,
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => '',
        getNewLine: () => ts.sys.newLine,
        fileExists: (fileName) => fileName === inputFileName,
        readFile: () => '',
        directoryExists: () => true,
        getDirectories: () => []
    };
    const program = ts.createProgram([inputFileName], options, compilerHost);
    const typeChecker = program.getTypeChecker();
    // Emit
    program.emit(undefined, undefined, undefined, false, {
        before: [
            gatherMetadata(config, compilerCtx, buildCtx, typeChecker),
            removeDecorators(),
            addComponentMetadata(compilerCtx.moduleFiles)
        ],
        after: [
            removeStencilImports(),
            removeCollectionImports(compilerCtx)
        ]
    });
    const tsDiagnostics = program.getOptionsDiagnostics().concat(program.getSyntacticDiagnostics());
    loadTypeScriptDiagnostics(config, buildCtx.diagnostics, tsDiagnostics);
    results.diagnostics.push(...buildCtx.diagnostics);
    const moduleFile = compilerCtx.moduleFiles[results.sourceFilePath];
    results.cmpMeta = moduleFile ? moduleFile.cmpMeta : null;
    return results;
}

class TestWindowLogger {
    constructor() {
        this.logs = [];
        this.buildLogFilePath = null;
    }
    printLogs() {
        this.logs.forEach(log => {
            console[log.level].apply(console, log.msgs);
        });
        this.logs.length = 0;
    }
    info(...msgs) {
        this.logs.push({
            level: 'info',
            msgs: msgs
        });
    }
    error(...msgs) {
        this.logs.push({
            level: 'error',
            msgs: msgs
        });
    }
    warn(...msgs) {
        this.logs.push({
            level: 'warn',
            msgs: msgs
        });
    }
    debug() { }
    createTimeSpan(_startMsg) {
        return {
            finish: () => { }
        };
    }
    printDiagnostics(_diagnostics) { }
    green(v) {
        return v;
    }
    yellow(v) {
        return v;
    }
    red(v) {
        return v;
    }
    blue(v) {
        return v;
    }
    magenta(v) {
        return v;
    }
    cyan(v) {
        return v;
    }
    gray(v) {
        return v;
    }
    bold(v) {
        return v;
    }
    dim(v) {
        return v;
    }
    writeLogs(_append) { }
}

const sys = mockStencilSystem();
function transpile(input, opts = {}, path$$1) {
    const results = { diagnostics: null, code: null };
    if (!opts.module) {
        opts.module = 'CommonJS';
    }
    const compilerOpts = Object.assign({}, opts);
    if (!path$$1) {
        path$$1 = '/tmp/transpile.tsx';
    }
    const logger = new TestWindowLogger();
    const config = validateConfig({
        sys: sys,
        logger: logger,
        cwd: process.cwd(),
        rootDir: '/',
        srcDir: '/',
        devMode: true,
        _isTesting: true
    });
    const transpileResults = transpileModuleForTesting(config, compilerOpts, path$$1, input);
    results.code = transpileResults.code;
    results.diagnostics = transpileResults.diagnostics;
    logger.printLogs();
    return results;
}

function normalizeHydrateOptions(wwwTarget, opts) {
    const hydrateTarget = Object.assign({}, wwwTarget);
    hydrateTarget.prerenderLocations = wwwTarget.prerenderLocations.map(p => Object.assign({}, p));
    hydrateTarget.hydrateComponents = true;
    const req = opts.req;
    if (req && typeof req.get === 'function') {
        // assuming node express request object
        // https://expressjs.com/
        if (!opts.url)
            opts.url = req.protocol + '://' + req.get('host') + req.originalUrl;
        if (!opts.referrer)
            opts.referrer = req.get('referrer');
        if (!opts.userAgent)
            opts.userAgent = req.get('user-agent');
        if (!opts.cookie)
            opts.cookie = req.get('cookie');
    }
    Object.assign(hydrateTarget, opts);
    return hydrateTarget;
}
function generateHydrateResults(config, hydrateTarget) {
    if (!hydrateTarget.url) {
        hydrateTarget.url = `https://hydrate.stenciljs.com/`;
    }
    // https://nodejs.org/api/url.html
    const urlParse = config.sys.url.parse(hydrateTarget.url);
    const hydrateResults = {
        diagnostics: [],
        url: hydrateTarget.url,
        host: urlParse.host,
        hostname: urlParse.hostname,
        port: urlParse.port,
        path: urlParse.path,
        pathname: urlParse.pathname,
        search: urlParse.search,
        query: urlParse.query,
        hash: urlParse.hash,
        html: hydrateTarget.html,
        styles: null,
        anchors: [],
        components: [],
        styleUrls: [],
        scriptUrls: [],
        imgUrls: []
    };
    createConsole(config, hydrateTarget, hydrateResults);
    return hydrateResults;
}
function createConsole(config, opts, results) {
    const pathname = results.pathname;
    opts.console = opts.console || {};
    if (typeof opts.console.error !== 'function') {
        opts.console.error = function (...args) {
            results.diagnostics.push({
                level: `error`,
                type: `hydrate`,
                header: `runtime console.error: ${pathname}`,
                messageText: args.join(', ')
            });
        };
    }
    if (config.logLevel === 'debug') {
        ['debug', 'info', 'log', 'warn'].forEach(level => {
            if (typeof opts.console[level] !== 'function') {
                opts.console[level] = function (...args) {
                    results.diagnostics.push({
                        level: level,
                        type: 'hydrate',
                        header: `runtime console.${level}: ${pathname}`,
                        messageText: args.join(', ')
                    });
                };
            }
        });
    }
}
function normalizeDirection(doc, hydrateTarget) {
    let dir = doc.body.getAttribute('dir');
    if (dir) {
        dir = dir.trim().toLowerCase();
        if (dir.trim().length > 0) {
            console.warn(`dir="${dir}" should be placed on the <html> instead of <body>`);
        }
    }
    if (hydrateTarget.direction) {
        dir = hydrateTarget.direction;
    }
    else {
        dir = doc.documentElement.getAttribute('dir');
    }
    if (dir) {
        dir = dir.trim().toLowerCase();
        if (dir !== 'ltr' && dir !== 'rtl') {
            console.warn(`only "ltr" and "rtl" are valid "dir" values on the <html> element`);
        }
    }
    if (dir !== 'ltr' && dir !== 'rtl') {
        dir = 'ltr';
    }
    doc.documentElement.dir = dir;
}
function normalizeLanguage(doc, hydrateTarget) {
    let lang = doc.body.getAttribute('lang');
    if (lang) {
        lang = lang.trim().toLowerCase();
        if (lang.trim().length > 0) {
            console.warn(`lang="${lang}" should be placed on <html> instead of <body>`);
        }
    }
    if (hydrateTarget.language) {
        lang = hydrateTarget.language;
    }
    else {
        lang = doc.documentElement.getAttribute('lang');
    }
    if (lang) {
        lang = lang.trim().toLowerCase();
        if (lang.length > 0) {
            doc.documentElement.lang = lang;
        }
    }
}
function collectAnchors(config, doc, results) {
    const anchorElements = doc.querySelectorAll('a');
    for (var i = 0; i < anchorElements.length; i++) {
        const attrs = {};
        const anchorAttrs = anchorElements[i].attributes;
        for (var j = 0; j < anchorAttrs.length; j++) {
            attrs[anchorAttrs[j].nodeName.toLowerCase()] = anchorAttrs[j].nodeValue;
        }
        results.anchors.push(attrs);
    }
    config.logger.debug(`optimize ${results.pathname}, collected anchors: ${results.anchors.length}`);
}
function generateFailureDiagnostic(diagnostic) {
    return `
    <div style="padding: 20px;">
      <div style="font-weight: bold;">${diagnostic.header}</div>
      <div>${diagnostic.messageText}</div>
    </div>
  `;
}

function connectChildElements(config, plt, App, hydrateResults, parentElm) {
    if (parentElm && parentElm.children) {
        for (let i = 0; i < parentElm.children.length; i++) {
            connectElement(config, plt, App, hydrateResults, parentElm.children[i]);
            connectChildElements(config, plt, App, hydrateResults, parentElm.children[i]);
        }
    }
}
function connectElement(config, plt, App, hydrateResults, elm) {
    if (!plt.hasConnectedMap.has(elm)) {
        const tagName = elm.tagName.toLowerCase();
        const cmpMeta = plt.getComponentMeta(elm);
        if (cmpMeta) {
            connectHostElement(config, plt, App, hydrateResults, elm, cmpMeta);
        }
        else if (tagName === 'script') {
            connectScriptElement(hydrateResults, elm);
        }
        else if (tagName === 'link') {
            connectLinkElement(hydrateResults, elm);
        }
        else if (tagName === 'img') {
            connectImgElement(hydrateResults, elm);
        }
        plt.hasConnectedMap.set(elm, true);
    }
}
function connectHostElement(config, plt, App, hydrateResults, elm, cmpMeta) {
    const hostSnapshot = initHostSnapshot(plt.domApi, cmpMeta, elm);
    plt.hostSnapshotMap.set(elm, hostSnapshot);
    if (!cmpMeta.componentConstructor) {
        plt.requestBundle(cmpMeta, elm);
    }
    if (cmpMeta.encapsulationMeta !== 1 /* ShadowDom */) {
        initHostElement(plt, cmpMeta, elm, config.hydratedCssClass);
        connectedCallback(plt, cmpMeta, elm);
    }
    connectComponentOnReady(App, elm);
    const depth = getNodeDepth(elm);
    const cmp = hydrateResults.components.find(c => c.tag === cmpMeta.tagNameMeta);
    if (cmp) {
        cmp.count++;
        if (depth > cmp.depth) {
            cmp.depth = depth;
        }
    }
    else {
        hydrateResults.components.push({
            tag: cmpMeta.tagNameMeta,
            count: 1,
            depth: depth
        });
    }
}
function connectComponentOnReady(App, elm) {
    elm.componentOnReady = function componentOnReady() {
        return new Promise(resolve => {
            App.componentOnReady(elm, resolve);
        });
    };
}
function connectScriptElement(hydrateResults, elm) {
    const src = elm.src;
    if (src && hydrateResults.scriptUrls.indexOf(src) === -1) {
        hydrateResults.scriptUrls.push(src);
    }
}
function connectLinkElement(hydrateResults, elm) {
    const href = elm.href;
    const rel = (elm.rel || '').toLowerCase();
    if (rel === 'stylesheet' && href && hydrateResults.styleUrls.indexOf(href) === -1) {
        hydrateResults.styleUrls.push(href);
    }
}
function connectImgElement(hydrateResults, elm) {
    const src = elm.src;
    if (src && hydrateResults.imgUrls.indexOf(src) === -1) {
        hydrateResults.imgUrls.push(src);
    }
}
function getNodeDepth(elm) {
    let depth = 0;
    while (elm.parentNode) {
        depth++;
        elm = elm.parentNode;
    }
    return depth;
}

function normalizePrerenderLocation(config, outputTarget, windowLocationHref, url) {
    let prerenderLocation = null;
    try {
        if (typeof url !== 'string') {
            return null;
        }
        // remove any quotes that somehow got in the href
        url = url.replace(/\'|\"/g, '');
        // parse the <a href> passed in
        const hrefParseUrl = config.sys.url.parse(url);
        // don't bother for basically empty <a> tags
        if (!hrefParseUrl.pathname) {
            return null;
        }
        // parse the window.location
        const windowLocationUrl = config.sys.url.parse(windowLocationHref);
        // urls must be on the same host
        // but only check they're the same host when the href has a host
        if (hrefParseUrl.hostname && hrefParseUrl.hostname !== windowLocationUrl.hostname) {
            return null;
        }
        // convert it back to a nice in pretty path
        prerenderLocation = {
            url: config.sys.url.resolve(windowLocationHref, url)
        };
        const normalizedUrl = config.sys.url.parse(prerenderLocation.url);
        normalizedUrl.hash = null;
        if (!outputTarget.prerenderPathQuery) {
            normalizedUrl.search = null;
        }
        prerenderLocation.url = config.sys.url.format(normalizedUrl);
        prerenderLocation.path = config.sys.url.parse(prerenderLocation.url).path;
        if (!prerenderLocation.path.startsWith(outputTarget.baseUrl)) {
            if (prerenderLocation.path !== outputTarget.baseUrl.substr(0, outputTarget.baseUrl.length - 1)) {
                return null;
            }
        }
        const filter = (typeof outputTarget.prerenderFilter === 'function') ? outputTarget.prerenderFilter : prerenderFilter;
        const isValidUrl = filter(hrefParseUrl);
        if (!isValidUrl) {
            return null;
        }
        if (hrefParseUrl.hash && outputTarget.prerenderPathHash) {
            prerenderLocation.url += hrefParseUrl.hash;
            prerenderLocation.path += hrefParseUrl.hash;
        }
    }
    catch (e) {
        config.logger.error(`normalizePrerenderLocation`, e);
        return null;
    }
    return prerenderLocation;
}
function prerenderFilter(url) {
    const parts = url.pathname.split('/');
    const basename = parts[parts.length - 1];
    return !basename.includes('.');
}

function getFilePathFromUrl(config, outputTarget, windowLocationHref, url) {
    if (typeof url !== 'string' || url.trim() === '') {
        return null;
    }
    const location = normalizePrerenderLocation(config, outputTarget, windowLocationHref, url);
    if (!location) {
        return null;
    }
    return config.sys.path.join(outputTarget.dir, location.path);
}
function createHashedFileName(fileName, hash) {
    const parts = fileName.split('.');
    parts.splice(parts.length - 1, 0, hash);
    return parts.join('.');
}

var __awaiter$k = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function versionElementAssets(config, compilerCtx, outputTarget, windowLocationHref, doc) {
    return __awaiter$k(this, void 0, void 0, function* () {
        if (!config.assetVersioning.versionHtml) {
            return;
        }
        yield Promise.all(ELEMENT_TYPES.map((elmType) => __awaiter$k(this, void 0, void 0, function* () {
            yield versionElementTypeAssets(config, compilerCtx, outputTarget, windowLocationHref, doc, elmType.selector, elmType.selector);
        })));
    });
}
const ELEMENT_TYPES = [
    { selector: 'link[rel="apple-touch-icon"][href]', attr: 'href' },
    { selector: 'link[rel="icon"][href]', attr: 'href' },
    { selector: 'link[rel="manifest"][href]', attr: 'href' },
    { selector: 'link[rel="stylesheet"][href]', attr: 'href' }
];
function versionElementTypeAssets(config, compilerCtx, outputTarget, windowLocationHref, doc, selector, attrName) {
    return __awaiter$k(this, void 0, void 0, function* () {
        const elements = doc.querySelectorAll(selector);
        const promises = [];
        for (let i = 0; i < elements.length; i++) {
            promises.push(versionElementAsset(config, compilerCtx, outputTarget, windowLocationHref, elements[i], attrName));
        }
        yield Promise.all(promises);
    });
}
function versionElementAsset(config, compilerCtx, outputTarget, windowLocationHref, elm, attrName) {
    return __awaiter$k(this, void 0, void 0, function* () {
        const url = elm.getAttribute(attrName);
        const versionedUrl = yield versionAsset(config, compilerCtx, outputTarget, windowLocationHref, url);
        if (versionedUrl) {
            elm.setAttribute(attrName, versionedUrl);
        }
    });
}
function versionAsset(config, compilerCtx, outputTarget, windowLocationHref, url) {
    return __awaiter$k(this, void 0, void 0, function* () {
        try {
            const orgFilePath = getFilePathFromUrl(config, outputTarget, windowLocationHref, url);
            if (!orgFilePath) {
                return null;
            }
            if (hasFileExtension(orgFilePath, TXT_EXT$1)) {
                const content = yield compilerCtx.fs.readFile(orgFilePath);
                const hash = config.sys.generateContentHash(content, config.hashedFileNameLength);
                const dirName = config.sys.path.dirname(orgFilePath);
                const fileName = config.sys.path.basename(orgFilePath);
                const hashedFileName = createHashedFileName(fileName, hash);
                const hashedFilePath = config.sys.path.join(dirName, hashedFileName);
                yield compilerCtx.fs.writeFile(hashedFilePath, content);
                yield compilerCtx.fs.remove(orgFilePath);
                return hashedFileName;
            }
        }
        catch (e) { }
        return null;
    });
}
const TXT_EXT$1 = ['js', 'css', 'svg', 'json'];

var __awaiter$l = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function versionManifestAssets(config, compilerCtx, outputTarget, windowLocationHref, doc) {
    return __awaiter$l(this, void 0, void 0, function* () {
        if (!config.assetVersioning.versionManifest) {
            return;
        }
        const manifestLink = doc.querySelector('link[rel="manifest"][href]');
        if (!manifestLink) {
            return;
        }
        return versionManifest(config, compilerCtx, outputTarget, windowLocationHref, manifestLink);
    });
}
function versionManifest(config, compilerCtx, outputTarget, windowLocationHref, linkElm) {
    return __awaiter$l(this, void 0, void 0, function* () {
        const url = linkElm.getAttribute('href');
        if (!url) {
            return;
        }
        const orgFilePath = getFilePathFromUrl(config, outputTarget, windowLocationHref, url);
        if (!orgFilePath) {
            return;
        }
        if (!hasFileExtension(orgFilePath, ['json'])) {
            return;
        }
        try {
            const jsonStr = yield compilerCtx.fs.readFile(orgFilePath);
            const manifest = JSON.parse(jsonStr);
            if (Array.isArray(manifest.icons)) {
                yield Promise.all(manifest.icons.map((manifestIcon) => __awaiter$l(this, void 0, void 0, function* () {
                    yield versionManifestIcon(config, compilerCtx, outputTarget, windowLocationHref, manifest, manifestIcon);
                })));
            }
            yield generateVersionedManifest(config, compilerCtx, linkElm, orgFilePath, manifest);
        }
        catch (e) {
            config.logger.error(`versionManifest: ${e}`);
        }
    });
}
function versionManifestIcon(config, compilerCtx, outputTarget, windowLocationHref, manifest, manifestIcon) {
    return __awaiter$l(this, void 0, void 0, function* () {
    });
}
function generateVersionedManifest(config, compilerCtx, linkElm, orgFilePath, manifest) {
    return __awaiter$l(this, void 0, void 0, function* () {
        const jsonStr = JSON.stringify(manifest);
        const dir = config.sys.path.dirname(orgFilePath);
        const orgFileName = config.sys.path.basename(orgFilePath);
        const hash = config.sys.generateContentHash(jsonStr, config.hashedFileNameLength);
        const newFileName = orgFileName.toLowerCase().replace(`.json`, `.${hash}.json`);
        const newFilePath = config.sys.path.join(dir, newFileName);
        yield Promise.all([
            compilerCtx.fs.remove(orgFilePath),
            compilerCtx.fs.writeFile(newFilePath, jsonStr)
        ]);
        let url = linkElm.getAttribute('href');
        url = url.replace(orgFileName, newFileName);
        linkElm.setAttribute('href', url);
    });
}

var __awaiter$m = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function assetVersioning(config, compilerCtx, outputTarget, windowLocationHref, doc) {
    return __awaiter$m(this, void 0, void 0, function* () {
        yield versionElementAssets(config, compilerCtx, outputTarget, windowLocationHref, doc);
        yield versionManifestAssets(config, compilerCtx, outputTarget, windowLocationHref, doc);
    });
}

function collapseHtmlWhitepace(node) {
    // this isn't about reducing HTML filesize (cuz it doesn't really matter after gzip)
    // this is more about having many less nodes for the client side to
    // have to climb through while it's creating vnodes from this HTML
    if (node.nodeType === 1 /* ElementNode */) {
        const attributeList = node.attributes;
        for (let j = attributeList.length - 1; j >= 0; j--) {
            const attr = attributeList[j];
            if (!attr.value) {
                if (SAFE_TO_REMOVE_EMPTY_ATTRS.includes(attr.name)) {
                    node.removeAttribute(attr.name);
                }
            }
        }
    }
    if (WHITESPACE_SENSITIVE_TAGS.includes(node.tagName)) {
        return;
    }
    let lastWhitespaceTextNode = null;
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const childNode = node.childNodes[i];
        if (childNode.nodeType === 3 /* TextNode */ || childNode.nodeType === 8 /* CommentNode */) {
            childNode.nodeValue = childNode.nodeValue.replace(REDUCE_WHITESPACE_REGEX, ' ');
            if (childNode.nodeValue === ' ') {
                if (lastWhitespaceTextNode === null) {
                    childNode.nodeValue = ' ';
                    lastWhitespaceTextNode = childNode;
                }
                else {
                    childNode.parentNode.removeChild(childNode);
                }
                continue;
            }
        }
        else if (childNode.childNodes) {
            collapseHtmlWhitepace(childNode);
        }
        lastWhitespaceTextNode = null;
    }
}
const REDUCE_WHITESPACE_REGEX = /\s\s+/g;
const WHITESPACE_SENSITIVE_TAGS = ['PRE', 'SCRIPT', 'STYLE', 'TEXTAREA'];
const SAFE_TO_REMOVE_EMPTY_ATTRS = [
    'class',
    'style',
];

var __awaiter$n = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function inlineExternalAssets(config, compilerCtx, outputTarget, windowLocationPath, doc) {
    return __awaiter$n(this, void 0, void 0, function* () {
        const linkElements = doc.querySelectorAll('link[href][rel="stylesheet"]');
        for (var i = 0; i < linkElements.length; i++) {
            inlineStyle(config, compilerCtx, outputTarget, windowLocationPath, doc, linkElements[i]);
        }
        const scriptElements = doc.querySelectorAll('script[src]');
        for (i = 0; i < scriptElements.length; i++) {
            yield inlineScript(config, compilerCtx, outputTarget, windowLocationPath, scriptElements[i]);
        }
    });
}
function inlineStyle(config, compilerCtx, outputTarget, windowLocationPath, doc, linkElm) {
    return __awaiter$n(this, void 0, void 0, function* () {
        const content = yield getAssetContent(config, compilerCtx, outputTarget, windowLocationPath, linkElm.href);
        if (!content) {
            return;
        }
        config.logger.debug(`optimize ${windowLocationPath}, inline style: ${config.sys.url.parse(linkElm.href).pathname}`);
        const styleElm = doc.createElement('style');
        styleElm.innerHTML = content;
        linkElm.parentNode.insertBefore(styleElm, linkElm);
        linkElm.parentNode.removeChild(linkElm);
    });
}
function inlineScript(config, compilerCtx, outputTarget, windowLocationPath, scriptElm) {
    return __awaiter$n(this, void 0, void 0, function* () {
        const content = yield getAssetContent(config, compilerCtx, outputTarget, windowLocationPath, scriptElm.src);
        if (!content) {
            return;
        }
        config.logger.debug(`optimize ${windowLocationPath}, inline script: ${scriptElm.src}`);
        scriptElm.innerHTML = content;
        scriptElm.removeAttribute('src');
    });
}
function getAssetContent(config, ctx, outputTarget, windowLocationPath, assetUrl) {
    return __awaiter$n(this, void 0, void 0, function* () {
        if (typeof assetUrl !== 'string' || assetUrl.trim() === '') {
            return null;
        }
        // figure out the url's so we can check the hostnames
        const fromUrl = config.sys.url.parse(windowLocationPath);
        const toUrl = config.sys.url.parse(assetUrl);
        if (fromUrl.hostname !== toUrl.hostname) {
            // not the same hostname, so we wouldn't have the file content
            return null;
        }
        // figure out the local file path
        const filePath = getFilePathFromUrl$1(config, outputTarget, fromUrl, toUrl);
        // doesn't look like we've got it cached in app files
        try {
            // try looking it up directly
            const content = yield ctx.fs.readFile(filePath);
            // rough estimate of size
            const fileSize = content.length;
            if (fileSize > outputTarget.inlineAssetsMaxSize) {
                // welp, considered too big, don't inline
                return null;
            }
            return content;
        }
        catch (e) {
            // never found the content for this file
            return null;
        }
    });
}
function getFilePathFromUrl$1(config, outputTarget, fromUrl, toUrl) {
    const resolvedUrl = '.' + config.sys.url.resolve(fromUrl.pathname, toUrl.pathname);
    return pathJoin(config, outputTarget.dir, resolvedUrl);
}

var __awaiter$o = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function inlineLoaderScript(config, compilerCtx, outputTarget, windowLocationPath, doc) {
    return __awaiter$o(this, void 0, void 0, function* () {
        // create the script url we'll be looking for
        const loaderFileName = getLoaderFileName(config);
        // find the external loader script
        // which is usually in the <head> and a pretty small external file
        // now that we're prerendering the html, and all the styles and html
        // will get hardcoded in the output, it's safe to now put the
        // loader script at the bottom of <body>
        const scriptElm = findExternalLoaderScript(doc, loaderFileName);
        if (scriptElm) {
            // append the loader script content to the bottom of <body>
            yield updateInlineLoaderScriptElement(config, compilerCtx, outputTarget, doc, windowLocationPath, scriptElm);
        }
    });
}
function findExternalLoaderScript(doc, loaderFileName) {
    const scriptElements = doc.getElementsByTagName('script');
    for (let i = 0; i < scriptElements.length; i++) {
        const src = scriptElements[i].getAttribute('src');
        if (isLoaderScriptSrc(loaderFileName, src)) {
            // this is a script element with a src attribute which is
            // pointing to the app's external loader script
            // remove the script from the document, be gone with you
            return scriptElements[i];
        }
    }
    return null;
}
function isLoaderScriptSrc(loaderFileName, scriptSrc) {
    try {
        if (typeof scriptSrc !== 'string' || scriptSrc.trim() === '') {
            return false;
        }
        scriptSrc = scriptSrc.toLowerCase();
        if (scriptSrc.startsWith('http') || scriptSrc.startsWith('file')) {
            return false;
        }
        scriptSrc = scriptSrc.split('?')[0].split('#')[0];
        loaderFileName = loaderFileName.split('?')[0].split('#')[0];
        if (scriptSrc === loaderFileName || scriptSrc.endsWith('/' + loaderFileName)) {
            return true;
        }
    }
    catch (e) { }
    return false;
}
function updateInlineLoaderScriptElement(config, compilerCtx, outputTarget, doc, windowLocationPath, scriptElm) {
    return __awaiter$o(this, void 0, void 0, function* () {
        // get the file path
        const appLoaderPath = getLoaderPath(config, outputTarget);
        // get the loader content
        let content = null;
        try {
            // let's look it up directly
            content = yield compilerCtx.fs.readFile(appLoaderPath);
        }
        catch (e) {
            config.logger.debug(`unable to inline loader: ${appLoaderPath}`, e);
        }
        if (!content) {
            // didn't get good loader content, don't bother
            return;
        }
        config.logger.debug(`optimize ${windowLocationPath}, inline loader`);
        // remove the external src
        scriptElm.removeAttribute('src');
        // only add the data-resources-url attr if we don't already have one
        const existingResourcesUrlAttr = scriptElm.getAttribute('data-resources-url');
        if (!existingResourcesUrlAttr) {
            const resourcesUrl = setDataResourcesUrlAttr(config, outputTarget);
            // add the resource path data attribute
            scriptElm.setAttribute('data-resources-url', resourcesUrl);
        }
        // inline the js content
        scriptElm.innerHTML = content;
        if (outputTarget.hydrateComponents) {
            // remove the script element from where it's currently at in the dom
            scriptElm.parentNode.removeChild(scriptElm);
            // place it back in the dom, but at the bottom of the body
            doc.body.appendChild(scriptElm);
        }
    });
}
function setDataResourcesUrlAttr(config, outputTarget) {
    let resourcesUrl = outputTarget.resourcesUrl;
    if (!resourcesUrl) {
        resourcesUrl = config.sys.path.join(outputTarget.buildDir, config.fsNamespace);
        resourcesUrl = normalizePath(config.sys.path.relative(outputTarget.dir, resourcesUrl));
        if (!resourcesUrl.startsWith('/')) {
            resourcesUrl = '/' + resourcesUrl;
        }
        if (!resourcesUrl.endsWith('/')) {
            resourcesUrl = resourcesUrl + '/';
        }
        resourcesUrl = outputTarget.baseUrl + resourcesUrl.substring(1);
    }
    return resourcesUrl;
}

var __awaiter$p = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Interal minifier, not exposed publicly.
 */
function minifyJs(config, compilerCtx, jsText, sourceTarget, preamble, buildTimestamp) {
    return __awaiter$p(this, void 0, void 0, function* () {
        const opts = { output: {}, compress: {}, mangle: true };
        if (sourceTarget === 'es5') {
            opts.ecma = 5;
            opts.output.ecma = 5;
            opts.compress.ecma = 5;
            opts.compress.arrows = false;
            opts.output.beautify = false;
        }
        else {
            opts.ecma = 6;
            opts.output.ecma = 6;
            opts.compress.ecma = 6;
            opts.toplevel = true;
            opts.compress.arrows = true;
            opts.output.beautify = false;
        }
        if (config.logLevel === 'debug') {
            opts.mangle = {};
            opts.mangle.keep_fnames = true;
            opts.compress.drop_console = false;
            opts.compress.drop_debugger = false;
            opts.output.beautify = true;
            opts.output.indent_level = 2;
            opts.output.comments = 'all';
        }
        else {
            opts.compress.pure_funcs = ['assert', 'console.debug'];
        }
        opts.compress.passes = 2;
        if (preamble) {
            opts.output.preamble = generatePreamble(config, { suffix: buildTimestamp });
        }
        let cacheKey;
        if (compilerCtx) {
            cacheKey = compilerCtx.cache.createKey('minifyJs', '__BUILDID:MINIFYJS__', opts, jsText);
            const cachedContent = yield compilerCtx.cache.get(cacheKey);
            if (cachedContent != null) {
                return {
                    output: cachedContent,
                    diagnostics: []
                };
            }
        }
        const r = yield config.sys.minifyJs(jsText, opts);
        if (compilerCtx) {
            if (r && r.diagnostics.length === 0 && typeof r.output === 'string') {
                yield compilerCtx.cache.put(cacheKey, r.output);
            }
        }
        return r;
    });
}

var __awaiter$q = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function minifyStyle(config, compilerCtx, diagnostics, styleText, filePath) {
    return __awaiter$q(this, void 0, void 0, function* () {
        if (typeof styleText !== 'string' || !styleText.length) {
            //  don't bother with invalid data
            return styleText;
        }
        const cacheKey = compilerCtx.cache.createKey('minifyStyle', '__BUILDID:MINIFYSTYLE__', styleText, MINIFY_CSS_PROD);
        const cachedContent = yield compilerCtx.cache.get(cacheKey);
        if (cachedContent != null) {
            // let's use the cached data we already figured out
            return cachedContent;
        }
        const minifyResults = yield config.sys.minifyCss(styleText, filePath, MINIFY_CSS_PROD);
        minifyResults.diagnostics.forEach(d => {
            // collect up any diagnostics from minifying
            diagnostics.push(d);
        });
        if (typeof minifyResults.output === 'string' && !hasError(diagnostics)) {
            // cool, we got valid minified output
            // only cache if we got a cache key, if not it probably has an @import
            yield compilerCtx.cache.put(cacheKey, minifyResults.output);
            return minifyResults.output;
        }
        return styleText;
    });
}
const MINIFY_CSS_PROD = {
    level: 2
};

var __awaiter$r = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function minifyInlineScripts(config, compilerCtx, doc, diagnostics) {
    return __awaiter$r(this, void 0, void 0, function* () {
        const scripts = doc.querySelectorAll('script');
        const promises = [];
        for (let i = 0; i < scripts.length; i++) {
            promises.push(minifyInlineScript(config, compilerCtx, diagnostics, scripts[i]));
        }
        yield Promise.all(promises);
    });
}
function canMinifyInlineScript(script) {
    if (script.hasAttribute('src')) {
        return false;
    }
    if (typeof script.innerHTML !== 'string') {
        return false;
    }
    script.innerHTML = script.innerHTML.trim();
    if (script.innerHTML.length === 0) {
        return false;
    }
    let type = script.getAttribute('type');
    if (typeof type === 'string') {
        type = type.trim().toLowerCase();
        if (!VALID_SCRIPT_TYPES.includes(type)) {
            return false;
        }
    }
    if (script.innerHTML.includes('  ')) {
        return true;
    }
    if (script.innerHTML.includes('\t')) {
        return true;
    }
    return false;
}
const VALID_SCRIPT_TYPES = ['application/javascript', 'application/ecmascript', ''];
function minifyInlineScript(config, compilerCtx, diagnostics, script) {
    return __awaiter$r(this, void 0, void 0, function* () {
        if (!canMinifyInlineScript(script)) {
            return;
        }
        const minifyResults = yield minifyJs(config, compilerCtx, script.innerHTML, 'es5', false);
        minifyResults.diagnostics.forEach(diagnostic => {
            diagnostics.push(diagnostic);
        });
        if (typeof minifyResults.output === 'string') {
            script.innerHTML = minifyResults.output;
        }
    });
}
function minifyInlineStyles(config, compilerCtx, doc, diagnostics) {
    return __awaiter$r(this, void 0, void 0, function* () {
        const styles = doc.querySelectorAll('style');
        const promises = [];
        for (let i = 0; i < styles.length; i++) {
            promises.push(minifyInlineStyle(config, compilerCtx, diagnostics, styles[i]));
        }
        yield Promise.all(promises);
    });
}
function canMinifyInlineStyle(style) {
    if (typeof style.innerHTML !== 'string') {
        return false;
    }
    style.innerHTML = style.innerHTML.trim();
    if (style.innerHTML.length === 0) {
        return false;
    }
    if (style.innerHTML.includes('/*')) {
        return true;
    }
    if (style.innerHTML.includes('  ')) {
        return true;
    }
    if (style.innerHTML.includes('\t')) {
        return true;
    }
    return false;
}
function minifyInlineStyle(config, compilerCtx, diagnostics, style) {
    return __awaiter$r(this, void 0, void 0, function* () {
        if (canMinifyInlineStyle(style)) {
            style.innerHTML = yield minifyStyle(config, compilerCtx, diagnostics, style.innerHTML);
        }
    });
}

// http://www.w3.org/TR/CSS21/grammar.html
// https://github.com/visionmedia/css-parse/pull/49#issuecomment-30088027
const commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
function parseCss(_config, css, filePath) {
    /**
     * Positional.
     */
    var lineno = 1;
    var column = 1;
    var srcLines;
    /**
     * Update lineno and column based on `str`.
     */
    function updatePosition(str) {
        const lines = str.match(/\n/g);
        if (lines)
            lineno += lines.length;
        const i = str.lastIndexOf('\n');
        column = ~i ? str.length - i : column + str.length;
    }
    /**
     * Mark position and patch `node.position`.
     */
    function position() {
        const start = { line: lineno, column: column };
        return function (node) {
            node.position = new ParsePosition(start);
            whitespace();
            return node;
        };
    }
    /**
     * Store position information for a node
     */
    class ParsePosition {
        constructor(start) {
            this.start = start;
            this.end = { line: lineno, column: column };
            this.source = filePath;
        }
    }
    /**
     * Non-enumerable source string
     */
    ParsePosition.prototype.content = css;
    /**
     * Error `msg`.
     */
    const diagnostics = [];
    function error(msg) {
        if (!srcLines) {
            srcLines = css.split('\n');
        }
        const d = {
            level: 'error',
            type: 'css',
            language: 'css',
            header: 'CSS Parse',
            messageText: msg,
            absFilePath: filePath,
            lines: [{
                    lineIndex: lineno - 1,
                    lineNumber: lineno,
                    errorCharStart: column,
                    text: css[lineno - 1],
                }]
        };
        if (lineno > 1) {
            const previousLine = {
                lineIndex: lineno - 1,
                lineNumber: lineno - 1,
                text: css[lineno - 2],
                errorCharStart: -1,
                errorLength: -1
            };
            d.lines.unshift(previousLine);
        }
        if (lineno + 2 < srcLines.length) {
            const nextLine = {
                lineIndex: lineno,
                lineNumber: lineno + 1,
                text: srcLines[lineno],
                errorCharStart: -1,
                errorLength: -1
            };
            d.lines.push(nextLine);
        }
        diagnostics.push(d);
    }
    /**
     * Parse stylesheet.
     */
    function stylesheet() {
        const rulesList = rules();
        return {
            type: 'stylesheet',
            stylesheet: {
                source: filePath,
                rules: rulesList,
                diagnostics: diagnostics
            }
        };
    }
    /**
     * Opening brace.
     */
    function open() {
        return match(/^{\s*/);
    }
    /**
     * Closing brace.
     */
    function close() {
        return match(/^}/);
    }
    /**
     * Parse ruleset.
     */
    function rules() {
        var node;
        const rules = [];
        whitespace();
        comments(rules);
        while (css.length && css.charAt(0) !== '}' && (node = atrule() || rule())) {
            if (node !== false) {
                rules.push(node);
                comments(rules);
            }
        }
        return rules;
    }
    /**
     * Match `re` and return captures.
     */
    function match(re) {
        const m = re.exec(css);
        if (!m)
            return;
        const str = m[0];
        updatePosition(str);
        css = css.slice(str.length);
        return m;
    }
    /**
     * Parse whitespace.
     */
    function whitespace() {
        match(/^\s*/);
    }
    /**
     * Parse comments;
     */
    function comments(rules) {
        var c;
        rules = rules || [];
        while (c = comment()) {
            if (c !== false) {
                rules.push(c);
            }
        }
        return rules;
    }
    /**
     * Parse comment.
     */
    function comment() {
        const pos = position();
        if ('/' !== css.charAt(0) || '*' !== css.charAt(1))
            return;
        var i = 2;
        while ('' !== css.charAt(i) && ('*' !== css.charAt(i) || '/' !== css.charAt(i + 1)))
            ++i;
        i += 2;
        if ('' === css.charAt(i - 1)) {
            return error('End of comment missing');
        }
        const str = css.slice(2, i - 2);
        column += 2;
        updatePosition(str);
        css = css.slice(i);
        column += 2;
        return pos({
            type: 'comment',
            comment: str
        });
    }
    /**
     * Parse selector.
     */
    function selector() {
        const m = match(/^([^{]+)/);
        if (!m)
            return;
        /* @fix Remove all comments from selectors
         * http://ostermiller.org/findcomment.html */
        return trim(m[0])
            .replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g, '')
            .replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'/g, function (m) {
            return m.replace(/,/g, '\u200C');
        })
            .split(/\s*(?![^(]*\)),\s*/)
            .map(function (s) {
            return s.replace(/\u200C/g, ',');
        });
    }
    /**
     * Parse declaration.
     */
    function declaration() {
        const pos = position();
        // prop
        var prop = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
        if (!prop)
            return;
        prop = trim(prop[0]);
        // :
        if (!match(/^:\s*/))
            return error(`property missing ':'`);
        // val
        const val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);
        const ret = pos({
            type: 'declaration',
            property: prop.replace(commentre, ''),
            value: val ? trim(val[0]).replace(commentre, '') : ''
        });
        // ;
        match(/^[;\s]*/);
        return ret;
    }
    /**
     * Parse declarations.
     */
    function declarations() {
        const decls = [];
        if (!open())
            return error(`missing '{'`);
        comments(decls);
        // declarations
        var decl;
        while (decl = declaration()) {
            if (decl !== false) {
                decls.push(decl);
                comments(decls);
            }
        }
        if (!close())
            return error(`missing '}'`);
        return decls;
    }
    /**
     * Parse keyframe.
     */
    function keyframe() {
        var m;
        const vals = [];
        const pos = position();
        while (m = match(/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/)) {
            vals.push(m[1]);
            match(/^,\s*/);
        }
        if (!vals.length)
            return;
        return pos({
            type: 'keyframe',
            values: vals,
            declarations: declarations()
        });
    }
    /**
     * Parse keyframes.
     */
    function atkeyframes() {
        const pos = position();
        var m = match(/^@([-\w]+)?keyframes\s*/);
        if (!m)
            return;
        const vendor = m[1];
        // identifier
        m = match(/^([-\w]+)\s*/);
        if (!m)
            return error(`@keyframes missing name`);
        const name = m[1];
        if (!open())
            return error(`@keyframes missing '{'`);
        var frame;
        var frames = comments();
        while (frame = keyframe()) {
            frames.push(frame);
            frames = frames.concat(comments());
        }
        if (!close())
            return error(`@keyframes missing '}'`);
        return pos({
            type: 'keyframes',
            name: name,
            vendor: vendor,
            keyframes: frames
        });
    }
    /**
     * Parse supports.
     */
    function atsupports() {
        const pos = position();
        const m = match(/^@supports *([^{]+)/);
        if (!m)
            return;
        const supports = trim(m[1]);
        if (!open())
            return error(`@supports missing '{'`);
        const style = comments().concat(rules());
        if (!close())
            return error(`@supports missing '}'`);
        return pos({
            type: 'supports',
            supports: supports,
            rules: style
        });
    }
    /**
     * Parse host.
     */
    function athost() {
        const pos = position();
        const m = match(/^@host\s*/);
        if (!m)
            return;
        if (!open())
            return error(`@host missing '{'`);
        const style = comments().concat(rules());
        if (!close())
            return error(`@host missing '}'`);
        return pos({
            type: 'host',
            rules: style
        });
    }
    /**
     * Parse media.
     */
    function atmedia() {
        const pos = position();
        const m = match(/^@media *([^{]+)/);
        if (!m)
            return;
        const media = trim(m[1]);
        if (!open())
            return error(`@media missing '{'`);
        const style = comments().concat(rules());
        if (!close())
            return error(`@media missing '}'`);
        return pos({
            type: 'media',
            media: media,
            rules: style
        });
    }
    /**
     * Parse custom-media.
     */
    function atcustommedia() {
        const pos = position();
        const m = match(/^@custom-media\s+(--[^\s]+)\s*([^{;]+);/);
        if (!m)
            return;
        return pos({
            type: 'custom-media',
            name: trim(m[1]),
            media: trim(m[2])
        });
    }
    /**
     * Parse paged media.
     */
    function atpage() {
        const pos = position();
        const m = match(/^@page */);
        if (!m)
            return;
        const sel = selector() || [];
        if (!open())
            return error(`@page missing '{'`);
        var decls = comments();
        // declarations
        var decl;
        while (decl = declaration()) {
            decls.push(decl);
            decls = decls.concat(comments());
        }
        if (!close())
            return error(`@page missing '}'`);
        return pos({
            type: 'page',
            selectors: sel,
            declarations: decls
        });
    }
    /**
     * Parse document.
     */
    function atdocument() {
        const pos = position();
        const m = match(/^@([-\w]+)?document *([^{]+)/);
        if (!m)
            return;
        const vendor = trim(m[1]);
        const doc = trim(m[2]);
        if (!open())
            return error(`@document missing '{'`);
        const style = comments().concat(rules());
        if (!close())
            return error(`@document missing '}'`);
        return pos({
            type: 'document',
            document: doc,
            vendor: vendor,
            rules: style
        });
    }
    /**
     * Parse font-face.
     */
    function atfontface() {
        const pos = position();
        const m = match(/^@font-face\s*/);
        if (!m)
            return;
        if (!open())
            return error(`@font-face missing '{'`);
        var decls = comments();
        // declarations
        var decl;
        while (decl = declaration()) {
            decls.push(decl);
            decls = decls.concat(comments());
        }
        if (!close())
            return error(`@font-face missing '}'`);
        return pos({
            type: 'font-face',
            declarations: decls
        });
    }
    /**
     * Parse import
     */
    const atimport = _compileAtrule('import');
    /**
     * Parse charset
     */
    const atcharset = _compileAtrule('charset');
    /**
     * Parse namespace
     */
    const atnamespace = _compileAtrule('namespace');
    /**
     * Parse non-block at-rules
     */
    function _compileAtrule(name) {
        const re = new RegExp('^@' + name + '\\s*([^;]+);');
        return function () {
            const pos = position();
            const m = match(re);
            if (!m)
                return;
            const ret = { type: name };
            ret[name] = m[1].trim();
            return pos(ret);
        };
    }
    /**
     * Parse at rule.
     */
    function atrule() {
        if (css[0] !== '@')
            return;
        return atkeyframes()
            || atmedia()
            || atcustommedia()
            || atsupports()
            || atimport()
            || atcharset()
            || atnamespace()
            || atdocument()
            || atpage()
            || athost()
            || atfontface();
    }
    /**
     * Parse rule.
     */
    function rule() {
        const pos = position();
        const sel = selector();
        if (!sel)
            return error('selector missing');
        comments();
        return pos({
            type: 'rule',
            selectors: sel,
            declarations: declarations()
        });
    }
    return addParent(stylesheet());
}
/**
 * Trim `str`.
 */
function trim(str) {
    return str ? str.trim() : '';
}
/**
 * Adds non-enumerable parent node reference to each node.
 */
function addParent(obj, parent) {
    const isNode = obj && typeof obj.type === 'string';
    const childParent = isNode ? obj : parent;
    for (const k in obj) {
        const value = obj[k];
        if (Array.isArray(value)) {
            value.forEach(function (v) { addParent(v, childParent); });
        }
        else if (value && typeof value === 'object') {
            addParent(value, childParent);
        }
    }
    if (isNode) {
        Object.defineProperty(obj, 'parent', {
            configurable: true,
            writable: true,
            enumerable: false,
            value: parent || null
        });
    }
    return obj;
}

function getSelectors(sel) {
    // reusing global SELECTORS since this is a synchronous operation
    SELECTORS.all.length = SELECTORS.tags.length = SELECTORS.classNames.length = SELECTORS.ids.length = SELECTORS.attrs.length = 0;
    sel = sel.replace(/\./g, ' .')
        .replace(/\#/g, ' #')
        .replace(/\[/g, ' [')
        .replace(/\>/g, ' > ')
        .replace(/\+/g, ' + ')
        .replace(/\~/g, ' ~ ')
        .replace(/\*/g, ' * ')
        .replace(/\:not\((.*?)\)/g, ' ');
    const items = sel.split(' ');
    for (var i = 0; i < items.length; i++) {
        items[i] = items[i].split(':')[0];
        if (items[i].length === 0)
            continue;
        if (items[i].charAt(0) === '.') {
            SELECTORS.classNames.push(items[i].substr(1));
        }
        else if (items[i].charAt(0) === '#') {
            SELECTORS.ids.push(items[i].substr(1));
        }
        else if (items[i].charAt(0) === '[') {
            items[i] = items[i].substr(1).split('=')[0].split(']')[0].trim();
            SELECTORS.attrs.push(items[i].toLowerCase());
        }
        else if (/[a-z]/g.test(items[i].charAt(0))) {
            SELECTORS.tags.push(items[i].toLowerCase());
        }
    }
    SELECTORS.classNames = SELECTORS.classNames.sort((a, b) => {
        if (a.length < b.length)
            return -1;
        if (a.length > b.length)
            return 1;
        return 0;
    });
    return SELECTORS;
}
const SELECTORS = {
    all: [],
    tags: [],
    classNames: [],
    ids: [],
    attrs: []
};

/**
 * CSS stringify adopted from rework/css by
 * TJ Holowaychuk (@tj)
 * Licensed under the MIT License
 * https://github.com/reworkcss/css/blob/master/LICENSE
 */
class StringifyCss {
    constructor(opts) {
        this.usedSelectors = opts.usedSelectors;
    }
    /**
     * Visit `node`.
     */
    visit(node) {
        return this[node.type](node);
    }
    /**
     * Map visit over array of `nodes`, optionally using a `delim`
     */
    mapVisit(nodes, delim) {
        var buf = '';
        delim = delim || '';
        for (var i = 0, length = nodes.length; i < length; i++) {
            buf += this.visit(nodes[i]);
            if (delim && i < length - 1)
                buf += delim;
        }
        return buf;
    }
    /**
     * Compile `node`.
     */
    compile(node) {
        return node.stylesheet
            .rules.map(this.visit, this)
            .join('');
    }
    comment() {
        return '';
    }
    /**
     * Visit import node.
     */
    import(node) {
        return '@import ' + node.import + ';';
    }
    /**
     * Visit media node.
     */
    media(node) {
        const mediaCss = this.mapVisit(node.rules);
        if (mediaCss === '') {
            return '';
        }
        return '@media ' + node.media + '{' + this.mapVisit(node.rules) + '}';
    }
    /**
     * Visit document node.
     */
    document(node) {
        const documentCss = this.mapVisit(node.rules);
        if (documentCss === '') {
            return '';
        }
        const doc = '@' + (node.vendor || '') + 'document ' + node.document;
        return doc + '{' + documentCss + '}';
    }
    /**
     * Visit charset node.
     */
    charset(node) {
        return '@charset ' + node.charset + ';';
    }
    /**
     * Visit namespace node.
     */
    namespace(node) {
        return '@namespace ' + node.namespace + ';';
    }
    /**
     * Visit supports node.
     */
    supports(node) {
        const supportsCss = this.mapVisit(node.rules);
        if (supportsCss === '') {
            return '';
        }
        return '@supports ' + node.supports + '{' + supportsCss + '}';
    }
    /**
     * Visit keyframes node.
     */
    keyframes(node) {
        const keyframesCss = this.mapVisit(node.keyframes);
        if (keyframesCss === '') {
            return '';
        }
        return '@' + (node.vendor || '') + 'keyframes ' + node.name + '{' + keyframesCss + '}';
    }
    /**
     * Visit keyframe node.
     */
    keyframe(node) {
        const decls = node.declarations;
        return node.values.join(',') + '{' + this.mapVisit(decls) + '}';
    }
    /**
     * Visit page node.
     */
    page(node) {
        const sel = node.selectors.length
            ? node.selectors.join(', ')
            : '';
        return '@page ' + sel + '{' + this.mapVisit(node.declarations) + '}';
    }
    /**
     * Visit font-face node.
     */
    ['font-face'](node) {
        const fontCss = this.mapVisit(node.declarations);
        if (fontCss === '') {
            return '';
        }
        return '@font-face{' + fontCss + '}';
    }
    /**
     * Visit host node.
     */
    host(node) {
        return '@host{' + this.mapVisit(node.rules) + '}';
    }
    /**
     * Visit custom-media node.
     */
    ['custom-media'](node) {
        return '@custom-media ' + node.name + ' ' + node.media + ';';
    }
    /**
     * Visit rule node.
     */
    rule(node) {
        const decls = node.declarations;
        if (!decls.length)
            return '';
        var i, j;
        for (i = node.selectors.length - 1; i >= 0; i--) {
            const sel = getSelectors(node.selectors[i]);
            if (this.usedSelectors) {
                var include = true;
                // classes
                var jlen = sel.classNames.length;
                if (jlen > 0) {
                    for (j = 0; j < jlen; j++) {
                        if (this.usedSelectors.classNames.indexOf(sel.classNames[j]) === -1) {
                            include = false;
                            break;
                        }
                    }
                }
                // tags
                if (include) {
                    jlen = sel.tags.length;
                    if (jlen > 0) {
                        for (j = 0; j < jlen; j++) {
                            if (this.usedSelectors.tags.indexOf(sel.tags[j]) === -1) {
                                include = false;
                                break;
                            }
                        }
                    }
                }
                // attrs
                if (include) {
                    jlen = sel.attrs.length;
                    if (jlen > 0) {
                        for (j = 0; j < jlen; j++) {
                            if (this.usedSelectors.attrs.indexOf(sel.attrs[j]) === -1) {
                                include = false;
                                break;
                            }
                        }
                    }
                }
                // ids
                if (include) {
                    jlen = sel.ids.length;
                    if (jlen > 0) {
                        for (j = 0; j < jlen; j++) {
                            if (this.usedSelectors.ids.indexOf(sel.ids[j]) === -1) {
                                include = false;
                                break;
                            }
                        }
                    }
                }
                if (!include) {
                    node.selectors.splice(i, 1);
                }
            }
        }
        if (node.selectors.length === 0)
            return '';
        return `${node.selectors}{${this.mapVisit(decls)}}`;
    }
    /**
     * Visit declaration node.
     */
    declaration(node) {
        return node.property + ':' + node.value + ';';
    }
}

function removeUnusedStyles(config, usedSelectors, cssContent, diagnostics) {
    let cleanedCss = cssContent;
    try {
        // parse the css from being applied to the document
        const cssAst = parseCss(config, cssContent);
        if (cssAst.stylesheet.diagnostics.length) {
            cssAst.stylesheet.diagnostics.forEach(d => {
                diagnostics.push(d);
            });
            return cleanedCss;
        }
        try {
            // convert the parsed css back into a string
            // but only keeping what was found in our active selectors
            const stringify = new StringifyCss({ usedSelectors });
            cleanedCss = stringify.compile(cssAst);
        }
        catch (e) {
            diagnostics.push({
                level: 'error',
                type: 'css',
                header: 'CSS Stringify',
                messageText: e
            });
        }
    }
    catch (e) {
        diagnostics.push({
            level: 'error',
            type: 'css',
            header: 'CSS Parse',
            messageText: e
        });
    }
    return cleanedCss;
}

class UsedSelectors {
    constructor(elm) {
        this.tags = [];
        this.classNames = [];
        this.ids = [];
        this.attrs = [];
        this.collectSelectors(elm);
    }
    collectSelectors(elm) {
        var i;
        if (elm && elm.tagName) {
            // tags
            const tagName = elm.tagName.toLowerCase();
            if (this.tags.indexOf(tagName) === -1) {
                this.tags.push(tagName);
            }
            // classes
            const classList = elm.classList;
            for (i = 0; i < classList.length; i++) {
                const className = classList[i];
                if (this.classNames.indexOf(className) === -1) {
                    this.classNames.push(className);
                }
            }
            // attributes
            const attributes = elm.attributes;
            for (i = 0; i < attributes.length; i++) {
                const attr = attributes[i];
                const attrName = attr.name.toLowerCase();
                if (!attrName || attrName === 'class' || attrName === 'id' || attrName === 'style')
                    continue;
                if (this.attrs.indexOf(attrName) === -1) {
                    this.attrs.push(attrName);
                }
            }
            // ids
            var idValue = elm.getAttribute('id');
            if (idValue) {
                idValue = idValue.trim();
                if (idValue && this.ids.indexOf(idValue) === -1) {
                    this.ids.push(idValue);
                }
            }
            // drill down
            for (i = 0; i < elm.children.length; i++) {
                this.collectSelectors(elm.children[i]);
            }
        }
    }
}

function optimizeSsrStyles(config, outputTarget, doc, diagnostics) {
    const ssrStyleElm = mergeSsrStyles(doc);
    if (ssrStyleElm == null) {
        return;
    }
    if (outputTarget.removeUnusedStyles !== false) {
        // removeUnusedStyles is the default
        try {
            // pick out all of the selectors that are actually
            // being used in the html document
            const usedSelectors = new UsedSelectors(doc.documentElement);
            // remove any selectors that are not used in this document
            ssrStyleElm.innerHTML = removeUnusedStyles(config, usedSelectors, ssrStyleElm.innerHTML, diagnostics);
        }
        catch (e) {
            diagnostics.push({
                level: 'error',
                type: 'hydrate',
                header: 'HTML Selector Parse',
                messageText: e
            });
        }
    }
}
function mergeSsrStyles(doc) {
    // get all the styles that were added during prerendering
    const ssrStyleElms = doc.head.querySelectorAll(`style[data-styles]`);
    if (ssrStyleElms.length === 0) {
        // this doc doesn't have any ssr styles
        return null;
    }
    const styleText = [];
    let ssrStyleElm;
    for (let i = ssrStyleElms.length - 1; i >= 0; i--) {
        // iterate backwards for funzies
        ssrStyleElm = ssrStyleElms[i];
        // collect up all the style text from each style element
        styleText.push(ssrStyleElm.innerHTML);
        // remove this style element from the document
        ssrStyleElm.parentNode.removeChild(ssrStyleElm);
        if (i === 0) {
            // this is the first style element, let's use this
            // same element as the main one we'll load up
            // merge all of the styles we collected into one
            ssrStyleElm.innerHTML = styleText.reverse().join('').trim();
            if (ssrStyleElm.innerHTML.length > 0) {
                // let's keep the first style element
                // and make it the first element in the head
                doc.head.insertBefore(ssrStyleElm, doc.head.firstChild);
                // return the ssr style element we loaded up
                return ssrStyleElm;
            }
        }
    }
    return null;
}

function updateCanonicalLink(config, doc, windowLocationPath) {
    // https://webmasters.googleblog.com/2009/02/specify-your-canonical.html
    // <link rel="canonical" href="http://www.example.com/product.php?item=swedish-fish" />
    if (typeof windowLocationPath !== 'string') {
        return;
    }
    const canonicalLink = doc.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
        return;
    }
    const existingHref = canonicalLink.getAttribute('href');
    const updatedRref = updateCanonicalLinkHref(config, existingHref, windowLocationPath);
    canonicalLink.setAttribute('href', updatedRref);
}
function updateCanonicalLinkHref(config, href, windowLocationPath) {
    const parsedUrl = config.sys.url.parse(windowLocationPath);
    if (typeof href === 'string') {
        href = href.trim();
        if (href.endsWith('/')) {
            href = href.substr(0, href.length - 1);
        }
    }
    else {
        href = '';
    }
    return `${href}${parsedUrl.path}`;
}

var __awaiter$s = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function optimizeHtml(config, compilerCtx, hydrateTarget, windowLocationPath, doc, diagnostics) {
    return __awaiter$s(this, void 0, void 0, function* () {
        const promises = [];
        if (hydrateTarget.hydrateComponents) {
            doc.documentElement.setAttribute('data-ssr', (typeof hydrateTarget.timestamp === 'string' ? hydrateTarget.timestamp : ''));
        }
        if (hydrateTarget.canonicalLink) {
            try {
                updateCanonicalLink(config, doc, windowLocationPath);
            }
            catch (e) {
                diagnostics.push({
                    level: 'error',
                    type: 'hydrate',
                    header: 'Insert Canonical Link',
                    messageText: e
                });
            }
        }
        if (hydrateTarget.inlineStyles) {
            try {
                optimizeSsrStyles(config, hydrateTarget, doc, diagnostics);
            }
            catch (e) {
                diagnostics.push({
                    level: 'error',
                    type: 'hydrate',
                    header: 'Inline Component Styles',
                    messageText: e
                });
            }
        }
        if (hydrateTarget.inlineLoaderScript) {
            // remove the script to the external loader script request
            // inline the loader script at the bottom of the html
            promises.push(inlineLoaderScript(config, compilerCtx, hydrateTarget, windowLocationPath, doc));
        }
        if (hydrateTarget.inlineAssetsMaxSize > 0) {
            promises.push(inlineExternalAssets(config, compilerCtx, hydrateTarget, windowLocationPath, doc));
        }
        if (hydrateTarget.collapseWhitespace && !config.devMode && config.logLevel !== 'debug') {
            // collapseWhitespace is the default
            try {
                config.logger.debug(`optimize ${windowLocationPath}, collapse html whitespace`);
                collapseHtmlWhitepace(doc.documentElement);
            }
            catch (e) {
                diagnostics.push({
                    level: 'error',
                    type: 'hydrate',
                    header: 'Reduce HTML Whitespace',
                    messageText: e
                });
            }
        }
        // need to wait on to see if external files are inlined
        yield Promise.all(promises);
        // reset for new promises
        promises.length = 0;
        if (config.minifyCss) {
            promises.push(minifyInlineStyles(config, compilerCtx, doc, diagnostics));
        }
        if (config.minifyJs) {
            promises.push(minifyInlineScripts(config, compilerCtx, doc, diagnostics));
        }
        if (config.assetVersioning) {
            promises.push(assetVersioning(config, compilerCtx, hydrateTarget, windowLocationPath, doc));
        }
        yield Promise.all(promises);
    });
}

var __awaiter$t = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function hydrateHtml(config, compilerCtx, outputTarget, cmpRegistry, opts) {
    return new Promise(resolve => {
        // validate the hydrate options and add any missing info
        const hydrateTarget = normalizeHydrateOptions(outputTarget, opts);
        // create the results object we're gonna return
        const hydrateResults = generateHydrateResults(config, hydrateTarget);
        // create a emulated window
        // attach data the request to the window
        const dom = config.sys.createDom();
        const win = dom.parse(hydrateTarget);
        const doc = win.document;
        // normalize dir and lang before connecting elements
        // so that the info is their incase they read it at runtime
        normalizeDirection(doc, hydrateTarget);
        normalizeLanguage(doc, hydrateTarget);
        // create the app global
        const App = {};
        // create the platform
        const plt = createPlatformServer(config, hydrateTarget, win, doc, App, cmpRegistry, hydrateResults.diagnostics, hydrateTarget.isPrerender, compilerCtx);
        // fire off this function when the app has finished loading
        // and all components have finished hydrating
        plt.onAppLoad = (rootElm, failureDiagnostic) => __awaiter$t(this, void 0, void 0, function* () {
            if (config._isTesting) {
                hydrateResults.__testPlatform = plt;
            }
            if (failureDiagnostic) {
                hydrateResults.html = generateFailureDiagnostic(failureDiagnostic);
                dom.destroy();
                resolve(hydrateResults);
                return;
            }
            // all synchronous operations next
            if (rootElm) {
                try {
                    // optimize this document!!
                    yield optimizeHtml(config, compilerCtx, hydrateTarget, hydrateResults.url, doc, hydrateResults.diagnostics);
                    // gather up all of the <a> tag information in the doc
                    if (hydrateTarget.isPrerender && hydrateTarget.hydrateComponents) {
                        collectAnchors(config, doc, hydrateResults);
                    }
                    // serialize this dom back into a string
                    if (hydrateTarget.serializeHtml !== false) {
                        hydrateResults.html = dom.serialize();
                    }
                }
                catch (e) {
                    // gahh, something's up
                    hydrateResults.diagnostics.push({
                        level: 'error',
                        type: 'hydrate',
                        header: 'DOM Serialize',
                        messageText: e
                    });
                    // idk, some error, just use the original html
                    hydrateResults.html = hydrateTarget.html;
                }
            }
            if (hydrateTarget.destroyDom !== false) {
                // always destroy the dom unless told otherwise
                dom.destroy();
            }
            else {
                // we didn't destroy the dom
                // so let's return the root element
                hydrateResults.root = rootElm;
            }
            // cool, all good here, even if there are errors
            // we're passing back the result object
            resolve(hydrateResults);
        });
        if (hydrateTarget.hydrateComponents === false) {
            plt.onAppLoad(win.document.body);
            return;
        }
        // patch the render function that we can add SSR ids
        // and to connect any elements it may have just appened to the DOM
        let ssrIds = 0;
        const pltRender = plt.render;
        plt.render = function render(hostElm, oldVNode, newVNode, useNativeShadowDom, encapsulation) {
            let ssrId;
            let existingSsrId;
            if (hydrateTarget.ssrIds !== false) {
                // this may have been patched more than once
                // so reuse the ssr id if it already has one
                if (oldVNode && oldVNode.elm) {
                    existingSsrId = oldVNode.elm.getAttribute(SSR_VNODE_ID);
                }
                if (existingSsrId) {
                    ssrId = parseInt(existingSsrId, 10);
                }
                else {
                    ssrId = ssrIds++;
                }
            }
            useNativeShadowDom = false;
            newVNode = pltRender(hostElm, oldVNode, newVNode, useNativeShadowDom, encapsulation, ssrId);
            connectChildElements(config, plt, App, hydrateResults, newVNode.elm);
            return newVNode;
        };
        // loop through each node and start connecting/hydrating
        // any elements that are host elements to components
        // this kicks off all the async hydrating
        connectChildElements(config, plt, App, hydrateResults, win.document.body);
        if (hydrateResults.components.length === 0) {
            // what gives, never found ANY host elements to connect!
            // ok we're just done i guess, idk
            hydrateResults.html = hydrateTarget.html;
            resolve(hydrateResults);
        }
    });
}

var __awaiter$u = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function getAppRegistry(config, compilerCtx, outputTarget) {
    const registryJsonFilePath = getRegistryJson(config, outputTarget);
    let appRegistry;
    try {
        // open up the app registry json file
        const appRegistryJson = compilerCtx.fs.readFileSync(registryJsonFilePath);
        // parse the json into app registry data
        appRegistry = JSON.parse(appRegistryJson);
    }
    catch (e) {
        throw new Error(`Error parsing app registry, ${registryJsonFilePath}: ${e}`);
    }
    return appRegistry;
}

function loadComponentRegistry(config, compilerCtx, outputTarget) {
    const appRegistry = getAppRegistry(config, compilerCtx, outputTarget);
    const cmpRegistry = {};
    const tagNames = Object.keys(appRegistry.components);
    tagNames.forEach(tagName => {
        const reg = appRegistry.components[tagName];
        cmpRegistry[tagName] = {
            tagNameMeta: tagName,
            bundleIds: reg.bundleIds
        };
        if (reg.encapsulation === 'shadow') {
            cmpRegistry[tagName].encapsulationMeta = 1 /* ShadowDom */;
        }
        else if (reg.encapsulation === 'scoped') {
            cmpRegistry[tagName].encapsulationMeta = 2 /* ScopedCss */;
        }
    });
    return cmpRegistry;
}

var __awaiter$v = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Renderer {
    constructor(config, registry, ctx, outputTarget) {
        this.config = config;
        this.config = validateConfig(config);
        // do not allow more than one worker when prerendering
        config.sys.initWorkers(1, 1);
        // init the build context
        this.ctx = getCompilerCtx(config, ctx);
        this.outputTarget = outputTarget || config.outputTargets.find(o => o.type === 'www');
        // load the component registry from the registry.json file
        this.cmpRegistry = registry || loadComponentRegistry(config, this.ctx, this.outputTarget);
        if (Object.keys(this.cmpRegistry).length === 0) {
            throw new Error(`No registered components found: ${config.namespace}`);
        }
        // load the app global file into the context
        loadAppGlobal(config, this.ctx, this.outputTarget);
    }
    hydrate(hydrateOpts) {
        return __awaiter$v(this, void 0, void 0, function* () {
            let hydrateResults;
            // kick off hydrated, which is an async opertion
            try {
                hydrateResults = yield hydrateHtml(this.config, this.ctx, this.outputTarget, this.cmpRegistry, hydrateOpts);
            }
            catch (e) {
                hydrateResults = {
                    url: hydrateOpts.path,
                    diagnostics: [],
                    html: hydrateOpts.html,
                    styles: null,
                    anchors: [],
                    components: [],
                    styleUrls: [],
                    scriptUrls: [],
                    imgUrls: []
                };
                catchError(hydrateResults.diagnostics, e);
            }
            return hydrateResults;
        });
    }
    get fs() {
        return this.ctx.fs;
    }
    destroy() {
        if (this.config && this.config.sys && this.config.sys.destroy) {
            this.config.sys.destroy();
        }
    }
}
function loadAppGlobal(config, compilerCtx, outputTarget) {
    compilerCtx.appFiles = compilerCtx.appFiles || {};
    if (compilerCtx.appFiles.global) {
        // already loaded the global js content
        return;
    }
    // let's load the app global js content
    const appGlobalPath = getGlobalJsBuildPath(config, outputTarget);
    try {
        compilerCtx.appFiles.global = compilerCtx.fs.readFileSync(appGlobalPath);
    }
    catch (e) {
        config.logger.debug(`missing app global: ${appGlobalPath}`);
    }
}

var __awaiter$w = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// weakmaps to keep these actually private
const loggers = new WeakMap();
const platforms = new WeakMap();
class TestWindow {
    load(opts) {
        return __awaiter$w(this, void 0, void 0, function* () {
            if (this.window) {
                throw new Error(`TestWindow load() cannot be called more than once on the same instance`);
            }
            // validate we've got good options
            validateTestWindowLoadOptions(opts);
            // only create one dom per TestWindow
            const sys = mockStencilSystem();
            const dom = sys.createDom();
            // all subsequent calls reuse the same DOM for this test window
            // for example, the hydrateHtml fn in Renderer end up using this
            // same one rather than creating a new dom entirely
            sys.createDom = () => dom;
            const logger = new TestWindowLogger();
            loggers.set(this, logger);
            const config = validateConfig({
                sys: sys,
                logger: logger,
                rootDir: '/',
                devMode: true,
                _isTesting: true
            });
            let elm = null;
            try {
                const compilerCtx = {};
                const registry = {};
                opts.components.forEach((testCmp) => {
                    if (testCmp) {
                        const cmpMeta = fillCmpMetaFromConstructor(testCmp, {});
                        registry[cmpMeta.tagNameMeta] = cmpMeta;
                        cmpMeta.componentConstructor = testCmp;
                    }
                });
                const renderer = new Renderer(config, registry, compilerCtx);
                const hydrateOpts = {
                    html: opts.html,
                    url: opts.url,
                    userAgent: opts.userAgent,
                    cookie: opts.cookie,
                    direction: opts.direction,
                    language: opts.language,
                    serializeHtml: false,
                    destroyDom: false,
                    isPrerender: false,
                    inlineLoaderScript: false,
                    inlineStyles: false,
                    removeUnusedStyles: false,
                    canonicalLink: false,
                    collapseWhitespace: false,
                    ssrIds: false
                };
                const results = yield renderer.hydrate(hydrateOpts);
                if (results.diagnostics.length) {
                    const msg = results.diagnostics.map(d => d.messageText).join('\n');
                    throw new Error(msg);
                }
                elm = (results.root && results.root.children.length > 1 && results.root.children[1].firstElementChild) || null;
                if (elm) {
                    // trick to get the private platform (shhh)
                    platforms.set(this, results.__testPlatform);
                    delete results.__testPlatform;
                    // get the window from the element just created
                    this.window = elm.ownerDocument.defaultView;
                }
            }
            catch (e) {
                logger.error(e);
            }
            logger.printLogs();
            return elm;
        });
    }
    flush() {
        return __awaiter$w(this, void 0, void 0, function* () {
            const plt = platforms.get(this);
            yield plt.queue.flush();
            const logger = loggers.get(this);
            logger.printLogs();
        });
    }
    get document() {
        return getWindowObj(this, 'document');
    }
    get history() {
        return getWindowObj(this, 'history');
    }
    get location() {
        return getWindowObj(this, 'location');
    }
    get navigator() {
        return getWindowObj(this, 'navigator');
    }
    get CustomEvent() {
        return getWindowObj(this, 'CustomEvent');
    }
    get Event() {
        return getWindowObj(this, 'Event');
    }
    get URL() {
        return getWindowObj(this, 'URL');
    }
}
// shared window which can be reused
let sharedWindow;
function getWindowObj(testWindow, key) {
    if (testWindow.window) {
        // we've already created the window for this TestWindow, use this one
        return testWindow.window[key];
    }
    if (!sharedWindow) {
        // we don't have a window created, so use the shared one
        // but first let's create the shared one (which could get reused)
        const opts = {
            type: 'www',
            url: DEFAULT_URL,
            userAgent: DEFAULT_USER_AGENT
        };
        sharedWindow = mockStencilSystem().createDom().parse(opts);
    }
    // we don't have a window created, so use the shared one
    return sharedWindow[key];
}
function validateTestWindowLoadOptions(opts) {
    if (!opts) {
        throw new Error('missing TestWindow load() options');
    }
    if (!opts.components) {
        throw new Error(`missing TestWindow load() components: ${opts}`);
    }
    if (!Array.isArray(opts.components)) {
        throw new Error(`TestWindow load() components must be an array: ${opts}`);
    }
    if (typeof opts.html !== 'string') {
        throw new Error(`TestWindow load() html must be a string: ${opts}`);
    }
    if (typeof opts.url !== 'string') {
        opts.url = DEFAULT_URL;
    }
    if (typeof opts.userAgent !== 'string') {
        opts.userAgent = DEFAULT_USER_AGENT;
    }
}
const DEFAULT_URL = `http://testwindow.stenciljs.com/`;
const DEFAULT_USER_AGENT = `testwindow`;

function spyOnEvent(el, eventName) {
    const fn = jest.fn();
    el.addEventListener(eventName, (ev) => fn(ev.detail));
    return fn;
}

function testProperties(instance, properties) {
    const keys = Object.keys(properties);
    for (const prop of keys) {
        if (!instance[prop] === properties[prop]) {
            throw new Error(`expected property "${prop}",  but it was not found`);
        }
    }
}
function testClasslist(el, classes) {
    for (const c of classes) {
        if (!el.classList.contains(c)) {
            throw new Error(`expected class "${c}", but it was not found`);
        }
    }
}
function testAttributes(el, attributes) {
    const keys = Object.keys(attributes);
    for (const attr of keys) {
        if (!el.hasAttribute(attr)) {
            throw new Error(`expected attribute "${attr}",  but it was not found`);
        }
        if (el.getAttribute(attr) !== attributes[attr]) {
            throw new Error(`expected attribute "${attr}" to be equal to "${attributes[attr]}, but it is "${el.getAttribute(attr)}"`);
        }
    }
}
function testMatchClasslist(el, classes) {
    if (el.classList.length !== classes.length) {
        throw new Error(`expected ${classes.length} classes, found ${el.classList.length}`);
    }
    testClasslist(el, classes);
}
function testMatchAttributes(el, attributes) {
    const keys = Object.keys(attributes);
    if (el.attributes.length !== keys.length) {
        throw new Error(`expected ${keys.length} classes, found ${el.attributes.length}`);
    }
    testAttributes(el, attributes);
}

function toHaveClasses(element, classlist) {
    try {
        testClasslist(element, classlist);
        return {
            message: () => 'expected to not match classes',
            pass: true,
        };
    }
    catch (msg) {
        return {
            message: () => msg,
            pass: false,
        };
    }
}
function toMatchClasses(element, classlist) {
    try {
        testMatchClasslist(element, classlist);
        return {
            message: () => 'expected to not match classes',
            pass: true,
        };
    }
    catch (msg) {
        return {
            message: () => msg,
            pass: false,
        };
    }
}
function toHaveAttributes(element, attributes) {
    try {
        testAttributes(element, attributes);
        return {
            message: () => 'expected to not match attributes',
            pass: true,
        };
    }
    catch (msg) {
        return {
            message: () => msg,
            pass: false,
        };
    }
}
function toMatchAttributes(element, attributes) {
    try {
        testMatchAttributes(element, attributes);
        return {
            message: () => 'expected to not match attributes',
            pass: true,
        };
    }
    catch (msg) {
        return {
            message: () => msg,
            pass: false,
        };
    }
}
function toHaveProperties(instance, properties) {
    try {
        testProperties(instance, properties);
        return {
            message: () => 'expected to not match properties',
            pass: true,
        };
    }
    catch (msg) {
        return {
            message: () => msg,
            pass: false,
        };
    }
}

var expect = /*#__PURE__*/Object.freeze({
    toHaveClasses: toHaveClasses,
    toMatchClasses: toMatchClasses,
    toHaveAttributes: toHaveAttributes,
    toMatchAttributes: toMatchAttributes,
    toHaveProperties: toHaveProperties
});

var __awaiter$x = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const windows = new WeakMap();
let hasWarnedRender = false;
let hasWarnedFlush = false;
/**
 * DEPRECATED: Please use TestWindow instead.
 */
function render$1(opts) {
    return __awaiter$x(this, void 0, void 0, function* () {
        if (!hasWarnedRender) {
            console.warn([
                `Testing "render()" has been deprecated in favor of using "TestWindow". `,
                `Instead of "render(opts)", please use "const window = new TestWindow(); window.load(opts);". `,
                `This update allows testing to better simulate the standardized window and document objects.`
            ].join('\n'));
            hasWarnedRender = true;
        }
        const window = new TestWindow();
        const elm = yield window.load(opts);
        windows.set(elm, window);
        return elm;
    });
}
/**
 * DEPRECATED: Please use TestWindow instead.
 */
function flush(elm) {
    return __awaiter$x(this, void 0, void 0, function* () {
        if (!hasWarnedFlush) {
            console.warn([
                `Testing "flush()" has been deprecated in favor of using "TestWindow". `,
                `Instead of "flush(elm)", please use the TestWindow "flush()" method.`,
                `This update allows testing to better simulate the standardized window and document objects.`
            ].join('\n'));
            hasWarnedFlush = true;
        }
        const window = windows.get(elm);
        if (window) {
            yield window.flush();
        }
    });
}

exports.expect = expect;
exports.render = render$1;
exports.flush = flush;
exports.h = h;
exports.transpile = transpile;
exports.TestWindow = TestWindow;
exports.spyOnEvent = spyOnEvent;
