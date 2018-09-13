/*! Built with http://stenciljs.com */
import{h}from"./bearer-ui.core.js";import{b as Bearer}from"./chunk-567c07cb.js";var BearerSetupDisplay=function(){function e(){this.scenarioId="",this.isSetup=!1,this.setupId=""}return e.prototype.componentDidLoad=function(){var e=this;Bearer.emitter.addListener("setup_success:"+this.scenarioId,function(t){e.setupId=t.referenceId,e.isSetup=!0})},e.prototype.render=function(){return this.isSetup||this.setupId?h("p",null,"Scenario is currently setup with Setup ID: ",h("bearer-badge",{kind:"info"},this.setupId)):h("p",null,h("p",null,"Scenario hasn't been setup yet"))},Object.defineProperty(e,"is",{get:function(){return"bearer-setup-display"},enumerable:!0,configurable:!0}),Object.defineProperty(e,"encapsulation",{get:function(){return"shadow"},enumerable:!0,configurable:!0}),Object.defineProperty(e,"properties",{get:function(){return{isSetup:{state:!0},scenarioId:{type:String,attr:"scenario-id"},setupId:{type:String,attr:"setup-id",mutable:!0}}},enumerable:!0,configurable:!0}),e}();export{BearerSetupDisplay};