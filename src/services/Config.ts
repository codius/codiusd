import { Injector } from 'reduct'

export default class Config {
  readonly port: number
  readonly publicUri: string
  readonly bootstrapPeers: string

  constructor (env: Injector | { [k: string]: string | undefined }) {
    // Load config from environment by default
    if (typeof env === 'function') {
      env = process.env
    }

    this.port = Number(env.CODIUS_PORT) || 3000
    this.publicUri = env.CODIUS_PUBLIC_URI || ('http://localhost:' + this.port)
    this.bootstrapPeers = env.CODIUS_BOOTSTRAP_PEERS
      ? JSON.parse(env.CODIUS_BOOTSTRAP_PEERS)
      : []
  }
}
