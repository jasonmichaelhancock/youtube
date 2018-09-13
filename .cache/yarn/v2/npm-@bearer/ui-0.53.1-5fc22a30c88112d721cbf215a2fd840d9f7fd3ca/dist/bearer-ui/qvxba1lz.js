/*! Built with http://stenciljs.com */
const{h:t}=window.BearerUi;import{b as e}from"./chunk-567c07cb.js";var i=function(t,e){var i={};for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&e.indexOf(n)<0&&(i[n]=t[n]);if(null!=t&&"function"==typeof Object.getOwnPropertySymbols){var s=0;for(n=Object.getOwnPropertySymbols(t);s<n.length;s++)e.indexOf(n[s])<0&&(i[n[s]]=t[n[s]])}return i};class n{constructor(){this.visible=!1,this.btnProps={},this.toggleDisplay=(t=>{t.preventDefault(),this.visible=!this.visible})}clickOutsideHandler(){this.visible=!1}clickInsideHandler(t){t.stopImmediatePropagation()}toggle(t){this.visible=t}componentDidLoad(){!1===this.opened&&(this.visible=!1),this.innerListener&&e.emitter.addListener(this.innerListener,()=>{this.visible=!1})}render(){const e=this.btnProps,{content:n}=e,s=i(e,["content"]),r=Object.assign({},s,{kind:"primary"});return t("div",{class:"root"},t("bearer-button",Object.assign({},r,{onClick:this.toggleDisplay}),n,t("span",{class:"symbol"},"▾")),this.visible&&t("div",{class:"dropdown-down"},t("slot",null)))}static get is(){return"bearer-dropdown-button"}static get encapsulation(){return"shadow"}static get properties(){return{btnProps:{type:"Any",attr:"btn-props"},innerListener:{type:String,attr:"inner-listener"},opened:{type:Boolean,attr:"opened"},toggle:{method:!0},visible:{state:!0}}}static get listeners(){return[{name:"body:click",method:"clickOutsideHandler"},{name:"click",method:"clickInsideHandler"}]}static get style(){return".root{position:relative;display:inline-block}.root .dropdown-down{position:absolute;border:1px solid silver;background-color:#fff;z-index:1;padding:20px 10px 10px;min-width:320px;max-height:80vh;border-radius:3px}.root .symbol{padding-left:10px}"}}export{n as BearerDropdownButton};