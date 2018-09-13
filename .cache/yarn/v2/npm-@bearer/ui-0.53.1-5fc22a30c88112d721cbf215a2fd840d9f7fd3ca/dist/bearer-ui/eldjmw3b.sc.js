/*! Built with http://stenciljs.com */
const{h:e}=window.BearerUi;import"./chunk-567c07cb.js";class t{constructor(){this._visible=!1,this.direction="top",this.arrow=!0,this.btnProps={},this.toggleDisplay=(e=>{e.preventDefault(),console.log("[BEARER]","Button popover: toggleDisplay",!this.visible),this.visible=!this.visible})}set visible(e){this._visible!==e&&(console.log("[BEARER]","Button popover: visibilityChangeHandler",e),this._visible=e,this.visibilityChange.emit({visible:this._visible}))}get visible(){return this._visible}clickOutsideHandler(){this.visible=!1}clickInsideHandler(e){e.stopImmediatePropagation()}toggle(e){this.visible=e}componentDidLoad(){this.visible=this.opened}render(){return e("div",{class:"root"},e("bearer-button",Object.assign({},this.btnProps,{onClick:this.toggleDisplay})),e("div",{class:`popover fade show bs-popover-${this.direction} direction-${this.direction} ${!this.visible&&"hidden"}`},e("h3",{class:"popover-header"},this.backNav&&e("bearer-navigator-back",{class:"header-arrow"}),e("span",{class:"header"},this.header)),e("div",{class:"popover-body"},e("slot",null)),this.arrow&&e("div",{class:"arrow"})))}static get is(){return"bearer-button-popover"}static get encapsulation(){return"shadow"}static get properties(){return{_visible:{state:!0},arrow:{type:Boolean,attr:"arrow"},backNav:{type:Boolean,attr:"back-nav"},btnProps:{type:"Any",attr:"btn-props"},direction:{type:String,attr:"direction"},header:{type:String,attr:"header"},opened:{type:Boolean,attr:"opened"},toggle:{method:!0}}}static get events(){return[{name:"visibilityChange",method:"visibilityChange",bubbles:!0,cancelable:!0,composed:!0}]}static get listeners(){return[{name:"body:click",method:"clickOutsideHandler"},{name:"click",method:"clickInsideHandler"}]}static get style(){return"*.sc-bearer-button-popover, .sc-bearer-button-popover::after, .sc-bearer-button-popover::before{-webkit-box-sizing:border-box;box-sizing:border-box}html.sc-bearer-button-popover{font-family:sans-serif;line-height:1.15;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;-ms-overflow-style:scrollbar;-webkit-tap-highlight-color:transparent}\@-ms-viewport{width:device-width}article.sc-bearer-button-popover, aside.sc-bearer-button-popover, figcaption.sc-bearer-button-popover, figure.sc-bearer-button-popover, footer.sc-bearer-button-popover, header.sc-bearer-button-popover, hgroup.sc-bearer-button-popover, main.sc-bearer-button-popover, nav.sc-bearer-button-popover, section.sc-bearer-button-popover{display:block}body.sc-bearer-button-popover{margin:0;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Segoe UI Symbol\",\"Noto Color Emoji\";font-size:1em;font-weight:400;line-height:1.5;color:#212529;text-align:left;background-color:#fff}[tabindex=\"-1\"].sc-bearer-button-popover:focus{outline:0!important}hr.sc-bearer-button-popover{-webkit-box-sizing:content-box;box-sizing:content-box;height:0;overflow:visible}h1.sc-bearer-button-popover, h2.sc-bearer-button-popover, h3.sc-bearer-button-popover, h4.sc-bearer-button-popover, h5.sc-bearer-button-popover, h6.sc-bearer-button-popover{margin-top:0;margin-bottom:.5rem}dl.sc-bearer-button-popover, ol.sc-bearer-button-popover, p.sc-bearer-button-popover, ul.sc-bearer-button-popover{margin-top:0;margin-bottom:1rem}abbr[data-original-title].sc-bearer-button-popover, abbr[title].sc-bearer-button-popover{text-decoration:underline;-webkit-text-decoration:underline dotted;text-decoration:underline dotted;cursor:help;border-bottom:0}address.sc-bearer-button-popover{margin-bottom:1rem;font-style:normal;line-height:inherit}ol.sc-bearer-button-popover   ol.sc-bearer-button-popover, ol.sc-bearer-button-popover   ul.sc-bearer-button-popover, ul.sc-bearer-button-popover   ol.sc-bearer-button-popover, ul.sc-bearer-button-popover   ul.sc-bearer-button-popover{margin-bottom:0}dt.sc-bearer-button-popover{font-weight:700}dd.sc-bearer-button-popover{margin-bottom:.5rem;margin-left:0}blockquote.sc-bearer-button-popover, figure.sc-bearer-button-popover{margin:0 0 1rem}dfn.sc-bearer-button-popover{font-style:italic}b.sc-bearer-button-popover, strong.sc-bearer-button-popover{font-weight:bolder}small.sc-bearer-button-popover{font-size:80%}sub.sc-bearer-button-popover, sup.sc-bearer-button-popover{position:relative;font-size:75%;line-height:0;vertical-align:baseline}sub.sc-bearer-button-popover{bottom:-.25em}sup.sc-bearer-button-popover{top:-.5em}a.sc-bearer-button-popover{color:#007bff;text-decoration:none;background-color:transparent;-webkit-text-decoration-skip:objects}a.sc-bearer-button-popover:hover{color:#0056b3;text-decoration:underline}a.sc-bearer-button-popover:not([href]):not([tabindex]), a.sc-bearer-button-popover:not([href]):not([tabindex]):focus, a.sc-bearer-button-popover:not([href]):not([tabindex]):hover{color:inherit;text-decoration:none}a.sc-bearer-button-popover:not([href]):not([tabindex]):focus{outline:0}code.sc-bearer-button-popover, kbd.sc-bearer-button-popover, pre.sc-bearer-button-popover, samp.sc-bearer-button-popover{font-family:SFMono-Regular,Menlo,Monaco,Consolas,\"Liberation Mono\",\"Courier New\",monospace;font-size:1em}pre.sc-bearer-button-popover{margin-top:0;margin-bottom:1rem;overflow:auto;-ms-overflow-style:scrollbar}img.sc-bearer-button-popover{vertical-align:middle;border-style:none}svg.sc-bearer-button-popover{overflow:hidden;vertical-align:middle}table.sc-bearer-button-popover{border-collapse:collapse}caption.sc-bearer-button-popover{padding-top:.75rem;padding-bottom:.75rem;color:#6c757d;text-align:left;caption-side:bottom}th.sc-bearer-button-popover{text-align:inherit}label.sc-bearer-button-popover{display:inline-block;margin-bottom:.5rem}button.sc-bearer-button-popover{border-radius:0}button.sc-bearer-button-popover:focus{outline:dotted 1px;outline:-webkit-focus-ring-color auto 5px}button.sc-bearer-button-popover, input.sc-bearer-button-popover, optgroup.sc-bearer-button-popover, select.sc-bearer-button-popover, textarea.sc-bearer-button-popover{margin:0;font-family:inherit;font-size:inherit;line-height:inherit}button.sc-bearer-button-popover, input.sc-bearer-button-popover{overflow:visible}button.sc-bearer-button-popover, select.sc-bearer-button-popover{text-transform:none}[type=reset].sc-bearer-button-popover, [type=submit].sc-bearer-button-popover, button.sc-bearer-button-popover, html.sc-bearer-button-popover   [type=button].sc-bearer-button-popover{-webkit-appearance:button}[type=button].sc-bearer-button-popover::-moz-focus-inner, [type=reset].sc-bearer-button-popover::-moz-focus-inner, [type=submit].sc-bearer-button-popover::-moz-focus-inner, button.sc-bearer-button-popover::-moz-focus-inner{padding:0;border-style:none}input[type=checkbox].sc-bearer-button-popover, input[type=radio].sc-bearer-button-popover{-webkit-box-sizing:border-box;box-sizing:border-box;padding:0}input[type=date].sc-bearer-button-popover, input[type=datetime-local].sc-bearer-button-popover, input[type=month].sc-bearer-button-popover, input[type=time].sc-bearer-button-popover{-webkit-appearance:listbox}textarea.sc-bearer-button-popover{overflow:auto;resize:vertical}fieldset.sc-bearer-button-popover{min-width:0;padding:0;margin:0;border:0}legend.sc-bearer-button-popover{display:block;width:100%;max-width:100%;padding:0;margin-bottom:.5rem;font-size:1.5rem;line-height:inherit;color:inherit;white-space:normal}progress.sc-bearer-button-popover{vertical-align:baseline}[type=number].sc-bearer-button-popover::-webkit-inner-spin-button, [type=number].sc-bearer-button-popover::-webkit-outer-spin-button{height:auto}[type=search].sc-bearer-button-popover{outline-offset:-2px;-webkit-appearance:none}[type=search].sc-bearer-button-popover::-webkit-search-cancel-button, [type=search].sc-bearer-button-popover::-webkit-search-decoration{-webkit-appearance:none}.sc-bearer-button-popover::-webkit-file-upload-button{font:inherit;-webkit-appearance:button}output.sc-bearer-button-popover{display:inline-block}summary.sc-bearer-button-popover{display:list-item;cursor:pointer}template.sc-bearer-button-popover{display:none}[hidden].sc-bearer-button-popover{display:none!important}.popover.sc-bearer-button-popover{position:absolute;top:0;left:0;z-index:1060;display:block;max-width:276px;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Segoe UI Symbol\",\"Noto Color Emoji\";font-style:normal;font-weight:400;line-height:1.5;text-align:left;text-align:start;text-decoration:none;text-shadow:none;text-transform:none;letter-spacing:normal;word-break:normal;word-spacing:normal;white-space:normal;line-break:auto;font-size:1em;word-wrap:break-word;background-color:#fff;background-clip:padding-box;border:1px solid rgba(0,0,0,.2);border-radius:.3rem}.popover.sc-bearer-button-popover   .arrow.sc-bearer-button-popover{position:absolute;display:block;width:1rem;height:.5rem;margin:0 .3rem}.popover.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .popover.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before{position:absolute;display:block;content:\"\";border-color:transparent;border-style:solid}.bs-popover-auto[x-placement^=top].sc-bearer-button-popover, .bs-popover-top.sc-bearer-button-popover{margin-bottom:.5rem}.bs-popover-auto[x-placement^=top].sc-bearer-button-popover   .arrow.sc-bearer-button-popover, .bs-popover-top.sc-bearer-button-popover   .arrow.sc-bearer-button-popover{bottom:calc((.5rem + 1px) * -1)}.bs-popover-auto[x-placement^=top].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-auto[x-placement^=top].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before, .bs-popover-top.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-top.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before{border-width:.5rem .5rem 0}.bs-popover-auto[x-placement^=top].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before, .bs-popover-top.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before{bottom:0;border-top-color:rgba(0,0,0,.25)}.bs-popover-auto[x-placement^=top].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-top.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after{bottom:1px;border-top-color:#fff}.bs-popover-auto[x-placement^=right].sc-bearer-button-popover, .bs-popover-right.sc-bearer-button-popover{margin-left:.5rem}.bs-popover-auto[x-placement^=right].sc-bearer-button-popover   .arrow.sc-bearer-button-popover, .bs-popover-right.sc-bearer-button-popover   .arrow.sc-bearer-button-popover{left:calc((.5rem + 1px) * -1);width:.5rem;height:1rem;margin:.3rem 0}.bs-popover-auto[x-placement^=right].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-auto[x-placement^=right].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before, .bs-popover-right.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-right.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before{border-width:.5rem .5rem .5rem 0}.bs-popover-auto[x-placement^=right].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before, .bs-popover-right.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before{left:0;border-right-color:rgba(0,0,0,.25)}.bs-popover-auto[x-placement^=right].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-right.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after{left:1px;border-right-color:#fff}.bs-popover-auto[x-placement^=bottom].sc-bearer-button-popover, .bs-popover-bottom.sc-bearer-button-popover{margin-top:.5rem}.bs-popover-auto[x-placement^=bottom].sc-bearer-button-popover   .arrow.sc-bearer-button-popover, .bs-popover-bottom.sc-bearer-button-popover   .arrow.sc-bearer-button-popover{top:calc((.5rem + 1px) * -1)}.bs-popover-auto[x-placement^=bottom].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-auto[x-placement^=bottom].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before, .bs-popover-bottom.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-bottom.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before{border-width:0 .5rem .5rem}.bs-popover-auto[x-placement^=bottom].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before, .bs-popover-bottom.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before{top:0;border-bottom-color:rgba(0,0,0,.25)}.bs-popover-auto[x-placement^=bottom].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-bottom.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after{top:1px;border-bottom-color:#fff}.bs-popover-auto[x-placement^=bottom].sc-bearer-button-popover   .popover-header.sc-bearer-button-popover::before, .bs-popover-bottom.sc-bearer-button-popover   .popover-header.sc-bearer-button-popover::before{position:absolute;top:0;left:50%;display:block;width:1rem;margin-left:-.5rem;content:\"\";border-bottom:1px solid #f7f7f7}.bs-popover-auto[x-placement^=left].sc-bearer-button-popover, .bs-popover-left.sc-bearer-button-popover{margin-right:.5rem}.bs-popover-auto[x-placement^=left].sc-bearer-button-popover   .arrow.sc-bearer-button-popover, .bs-popover-left.sc-bearer-button-popover   .arrow.sc-bearer-button-popover{right:calc((.5rem + 1px) * -1);width:.5rem;height:1rem;margin:.3rem 0}.bs-popover-auto[x-placement^=left].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-auto[x-placement^=left].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before, .bs-popover-left.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-left.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before{border-width:.5rem 0 .5rem .5rem}.bs-popover-auto[x-placement^=left].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before, .bs-popover-left.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::before{right:0;border-left-color:rgba(0,0,0,.25)}.bs-popover-auto[x-placement^=left].sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after, .bs-popover-left.sc-bearer-button-popover   .arrow.sc-bearer-button-popover::after{right:1px;border-left-color:#fff}.popover-header.sc-bearer-button-popover{padding:.5rem .75rem;margin-bottom:0;font-size:1em;color:inherit;background-color:#f7f7f7;border-bottom:1px solid #ebebeb;border-top-left-radius:calc(.3rem - 1px);border-top-right-radius:calc(.3rem - 1px)}.popover-header.sc-bearer-button-popover:empty{display:none}.root.sc-bearer-button-popover{position:relative;display:inline-block}.popover.sc-bearer-button-popover{min-width:250px;min-height:272px;max-height:80vh;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column}.popover.hidden.sc-bearer-button-popover{display:none}.popover.direction-bottom.sc-bearer-button-popover{top:100%;-webkit-transform:translateX(-50%);transform:translateX(-50%);margin-left:50%}.popover.direction-bottom.sc-bearer-button-popover   .arrow.sc-bearer-button-popover{left:50%;-webkit-transform:translateX(-50%);transform:translateX(-50%);margin:0}.popover.direction-bottom.sc-bearer-button-popover   .arrow.sc-bearer-button-popover:after{border-bottom-color:#f7f7f7}.popover.direction-top.sc-bearer-button-popover{bottom:100%;left:0;top:initial;-webkit-transform:translateX(-50%);transform:translateX(-50%);margin-left:50%}.popover.direction-top.sc-bearer-button-popover   .arrow.sc-bearer-button-popover{left:50%;-webkit-transform:translateX(-50%);transform:translateX(-50%);margin:0}.popover.direction-left.sc-bearer-button-popover{top:calc((-50px / 2) - (.5rem / 2));left:initial;right:100%}.popover.direction-left.sc-bearer-button-popover   .arrow.sc-bearer-button-popover{-webkit-transform:translateY(-50%);transform:translateY(-50%);top:50px;margin:0}.popover.direction-right.sc-bearer-button-popover{left:100%;top:calc((-50px / 2) - (.5rem / 2))}.popover.direction-right.sc-bearer-button-popover   .arrow.sc-bearer-button-popover{-webkit-transform:translateY(-50%);transform:translateY(-50%);margin-top:0;top:50px}.popover-body.sc-bearer-button-popover{color:#212529;display:-webkit-box;display:-ms-flexbox;display:flex;overflow:auto;max-height:calc(80vh - 50px);padding:0;-webkit-box-flex:1;-ms-flex:1;flex:1}.header.sc-bearer-button-popover{padding-left:25px}.header-arrow.sc-bearer-button-popover{position:absolute;left:5px}"}}const i="BEARER-NAVIGATOR-AUTH-SCREEN";class s{constructor(){this.screens=[],this.screenData={},this._isVisible=!1,this.direction="right",this.btnProps={content:"Activate"},this.display="popover",this.next=(e=>{e&&(e.preventDefault(),e.stopPropagation()),console.log("[BEARER]","Navigator: next",this.hasNext()),this.hasNext()?this.visibleScreen=Math.min(this._visibleScreenIndex+1,this.screens.length-1):this.complete&&this.complete({complete:this.scenarioCompletedHandler.bind(this),data:this.screenData})}),this.onVisibilityChange=(({detail:{visible:e}})=>{console.log("[BEARER]","Navigator:onVisibilityChange",e),this.isVisible=e}),this.showScreen=(e=>{console.log("[BEARER]","showScreen",e,this.isVisible),e&&this.isVisible&&(e.willAppear(this.screenData),this.navigationTitle=e.getTitle(),e.classList.add("in"))}),this.hideScreen=(e=>{e&&(e.willDisappear(),e.classList.remove("in"))}),this.hasNext=(()=>this._visibleScreenIndex<this.screens.length-1),this.hasPrevious=(()=>this._visibleScreenIndex>0),this.hasAuthScreen=(()=>this.screenNodes.filter(e=>e.tagName===i).length)}scenarioCompletedHandler(){this.screenData={},this.isVisible=!1,this.visibleScreen=this.hasAuthScreen()?1:0,this.el.shadowRoot.querySelector("#button").toggle(!1)}stepCompletedHandler(e){e.preventDefault(),e.stopImmediatePropagation(),this.screenData=Object.assign({},this.screenData,e.detail),this.next(null)}prev(e){e&&(e.preventDefault(),e.stopPropagation()),this.hasPrevious()&&(this.visibleScreen=Math.max(this._visibleScreenIndex-1,0))}set isVisible(e){this._isVisible!==e&&(console.log("[BEARER]","Navigator:isVisibleChanged",e),this._isVisible=e,e&&this.showScreen(this.visibleScreen))}get isVisible(){return this._isVisible}set visibleScreen(e){this._visibleScreenIndex>=0&&this.hideScreen(this.visibleScreen),this._visibleScreenIndex=e,this.showScreen(this.visibleScreen)}get visibleScreen(){return this.screens[this._visibleScreenIndex]}get screenNodes(){return this.el.shadowRoot?this.el.shadowRoot.querySelector("slot:not([name])").assignedNodes().filter(e=>e.willAppear):[]}componentDidLoad(){console.log("[BEARER]","Navigator: componentDidLoad "),this.screens=this.screenNodes,this._visibleScreenIndex=0}render(){return e("bearer-button-popover",{btnProps:this.btnProps,id:"button",direction:this.direction,header:this.navigationTitle,backNav:this.hasPrevious(),onVisibilityChange:this.onVisibilityChange},e("slot",null))}static get is(){return"bearer-navigator"}static get encapsulation(){return"shadow"}static get properties(){return{_isVisible:{state:!0},_visibleScreenIndex:{state:!0},btnProps:{type:"Any",attr:"btn-props"},complete:{type:"Any",attr:"complete"},direction:{type:String,attr:"direction"},display:{type:String,attr:"display"},el:{elementRef:!0},navigationTitle:{state:!0},screenData:{state:!0},screens:{state:!0}}}static get listeners(){return[{name:"scenarioCompleted",method:"scenarioCompletedHandler"},{name:"stepCompleted",method:"stepCompletedHandler"},{name:"navigatorGoBack",method:"prev"}]}}export{t as BearerButtonPopover,s as BearerNavigator};