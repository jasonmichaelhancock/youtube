import Bearer from '@bearer/core';
export default function AuthenticationListener() {
    return function (target) {
        const oldDidLoad = target.prototype.componentDidLoad;
        target.prototype.componentDidLoad = function () {
            console.log('[BEARER]', 'componentDidLoad authentication');
            Bearer.instance.maybeInitialized
                .then(() => {
                if (this.onSessionInitialized) {
                    this.onSessionInitialized();
                }
                console.log('[BEARER]', 'componentDidLoad:maybeInitialized', this.SCENARIO_ID, this.onAuthorized, this.onRevoked);
                this.authorizedListener = Bearer.onAuthorized(this.SCENARIO_ID, () => {
                    this.onAuthorized();
                });
                this.revokedListener = Bearer.onRevoked(this.SCENARIO_ID, () => {
                    this.onRevoked();
                });
                Bearer.instance
                    .hasAuthorized(this.SCENARIO_ID)
                    .then(() => {
                    console.log('[BEARER]', 'authorized');
                    this.onAuthorized();
                })
                    .catch(error => {
                    console.log('[BEARER]', 'unauthorized', { error });
                    this.onRevoked();
                });
            })
                .catch(error => {
                console.error('[BEARER]', 'Could not initialize session', { error });
            });
            if (oldDidLoad) {
                oldDidLoad();
            }
        };
        const componentDidUnload = target.prototype.componentDidUnload;
        target.prototype.componentDidUnload = function () {
            if (this.authorizedListener) {
                this.authorizedListener.remove();
                this.authorizedListener = null;
            }
            if (this.revokedListener) {
                this.revokedListener.remove();
                this.revokedListener = null;
            }
            componentDidUnload();
        };
        target.prototype.SCENARIO_ID = 'BEARER_SCENARIO_ID';
        target.prototype.revokeProto = function () {
            Bearer.instance.revokeAuthorization(this.SCENARIO_ID);
        };
        target.prototype.authorizeProto = function () {
            console.log('[BEARER]', 'authenticate', this.SCENARIO_ID, this.bearerContext.setupId);
            Bearer.instance.askAuthorizations({
                scenarioId: this.SCENARIO_ID,
                setupId: this.bearerContext.setupId
            });
        };
    };
}
export class WithAuthenticationMethods {
}
