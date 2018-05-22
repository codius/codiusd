import { Injector } from 'reduct'
import Config from './Config'

export default class Identity {
  private config: Config

  constructor (deps: Injector) {
    this.config = deps(Config)
  }

  public getUri () {
    return this.config.publicUri
  }
}
