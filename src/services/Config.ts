import { Injector } from 'reduct'

export default class Config {
  readonly hyperSock: string
  readonly noop: boolean
  readonly port: number
  readonly publicUri: string
  readonly codiusRoot: string
  readonly bootstrapPeers: string

  constructor (env: Injector | { [k: string]: string | undefined }) {
    // Load config from environment by default
    if (typeof env === 'function') {
      env = process.env
    }

    this.hyperSock = env.CODIUS_HYPER_SOCKET || '/var/run/hyper.sock'
    this.noop = env.CODIUS_HYPER_NOOP === 'true'
    this.port = Number(env.CODIUS_PORT) || 3000
    this.publicUri = env.CODIUS_PUBLIC_URI || ('http://local.codius.org:' + this.port)
    this.codiusRoot = env.CODIUS_ROOT || '/var/lib/codius'
    this.bootstrapPeers = env.CODIUS_BOOTSTRAP_PEERS
      ? JSON.parse(env.CODIUS_BOOTSTRAP_PEERS)
      : []
  }
}
