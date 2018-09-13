import { State, Component, Prop, Method } from '@bearer/core'
import WithAuthentication, { IAuthenticated, WithAuthenticationMethods } from '../../decorators/withAuthentication'

export type FWithAuthenticate = {
  ({ authenticate }: { authenticate: () => Promise<boolean> }): any
}
// TODO: scope  authenticatePromise per scenario/setup
@WithAuthentication()
@Component({
  tag: 'bearer-authorized'
})
export class BearerAuthorized extends WithAuthenticationMethods implements IAuthenticated {
  @State()
  authorized: boolean = null
  @State()
  sessionInitialized: boolean = false

  @Prop()
  renderUnauthorized: FWithAuthenticate
  @Prop()
  renderAuthorized: () => any
  @Prop({ context: 'bearer' })
  bearerContext: any

  private pendingAuthorizationResolve: (authorize: boolean) => void
  private pendingAuthorizationReject: (authorize: boolean) => void

  onAuthorized = () => {
    console.log('[BEARER]', 'onAuthorized', !!this.pendingAuthorizationResolve)
    this.authorized = true
    if (this.pendingAuthorizationResolve) {
      this.pendingAuthorizationResolve(true)
    }
  }

  onRevoked = () => {
    this.authorized = false
    console.log('[BEARER]', 'onRevoked', !!this.pendingAuthorizationReject)
    if (this.pendingAuthorizationReject) {
      this.pendingAuthorizationReject(false)
    }
  }

  onSessionInitialized = () => {
    this.sessionInitialized = true
  }

  @Method()
  authenticate() {
    console.log('[BEARER]', 'bearer-authorized', 'authenticate')
    this.authenticatePromise()
      .then(data => {
        console.log('[BEARER]', 'bearer-authorized', 'authenticated', data)
      })
      .catch(error => {
        console.log('[BEARER]', 'bearer-authenticated', 'error', error)
      })
  }

  @Method()
  revoke() {
    console.log('[BEARER]', 'bearer-authorized', 'revoke')
    this['revokeProto'].bind(this)()
  }

  authenticatePromise = (): Promise<boolean> => {
    const promise = new Promise<boolean>((resolve, reject) => {
      this.pendingAuthorizationResolve = resolve
      this.pendingAuthorizationReject = reject
    })
    this['authorizeProto'].bind(this)()
    return promise
  }

  render() {
    if (!this.sessionInitialized || this.authorized === null) {
      return null
    }
    if (!this.authorized) {
      return this.renderUnauthorized
        ? this.renderUnauthorized({ authenticate: this.authenticatePromise })
        : 'Unauthorized'
    }
    return this.renderAuthorized ? this.renderAuthorized() : <slot />
  }
}
