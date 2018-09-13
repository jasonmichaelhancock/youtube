import { b as Bearer } from "./chunk-567c07cb.js";
function AuthenticationListener() { return function (e) { var t = e.prototype.componentDidLoad; e.prototype.componentDidLoad = function () {
    var _this = this;
    console.log("[BEARER]", "componentDidLoad authentication"), Bearer.instance.maybeInitialized.then(function () { _this.onSessionInitialized && _this.onSessionInitialized(), console.log("[BEARER]", "componentDidLoad:maybeInitialized", _this.SCENARIO_ID, _this.onAuthorized, _this.onRevoked), _this.authorizedListener = Bearer.onAuthorized(_this.SCENARIO_ID, function () { _this.onAuthorized(); }), _this.revokedListener = Bearer.onRevoked(_this.SCENARIO_ID, function () { _this.onRevoked(); }), Bearer.instance.hasAuthorized(_this.SCENARIO_ID).then(function () { console.log("[BEARER]", "authorized"), _this.onAuthorized(); }).catch(function (e) { console.log("[BEARER]", "unauthorized", { error: e }), _this.onRevoked(); }); }).catch(function (e) { console.error("[BEARER]", "Could not initialize session", { error: e }); }), t && t();
}; var o = e.prototype.componentDidUnload; e.prototype.componentDidUnload = function () { this.authorizedListener && (this.authorizedListener.remove(), this.authorizedListener = null), this.revokedListener && (this.revokedListener.remove(), this.revokedListener = null), o(); }, e.prototype.SCENARIO_ID = "BEARER_SCENARIO_ID", e.prototype.revokeProto = function () { Bearer.instance.revokeAuthorization(this.SCENARIO_ID); }, e.prototype.authorizeProto = function () { console.log("[BEARER]", "authenticate", this.SCENARIO_ID, this.bearerContext.setupId), Bearer.instance.askAuthorizations({ scenarioId: this.SCENARIO_ID, setupId: this.bearerContext.setupId }); }; }; }
var WithAuthenticationMethods = /** @class */ (function () {
    function WithAuthenticationMethods() {
    }
    return WithAuthenticationMethods;
}());
export { AuthenticationListener as a, WithAuthenticationMethods as b };
