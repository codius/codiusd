import { Injector } from 'reduct'

const DEFAULT_BOOTSTRAP_PEERS = [
  'https://codius.justmoon.com',
  'https://codius.andros-connector.com',
  'https://codius.risky.business',
  'https://codius.feraltc.com',
  'https://codius.tinypolarbear.com'
]

export default class Config {
  readonly hyperSock: string
  readonly noop: boolean
  readonly port: number
  readonly bindIp: string
  readonly publicUri: string
  readonly codiusRoot: string
  readonly memdownPersist: boolean
  readonly bootstrapPeers: string
  readonly maxMemoryFraction: number
  readonly ilpPlugin: string | void
  readonly ilpCredentials: string | void
  readonly devMode: boolean

  constructor (env: Injector | { [k: string]: string | undefined }) {
    // Load config from environment by default
    if (typeof env === 'function') {
      env = process.env
    }

    this.ilpPlugin = env.ILP_PLUGIN
    this.ilpCredentials = env.ILP_CREDENTIALS
    this.hyperSock = env.CODIUS_HYPER_SOCKET || '/var/run/hyper.sock'
    this.noop = env.CODIUS_HYPER_NOOP === 'true'
    this.port = Number(env.CODIUS_PORT) || 3000
    this.bindIp = env.CODIUS_BIND_IP || '127.0.0.1'
    this.publicUri = env.CODIUS_PUBLIC_URI || ('http://local.codius.org:' + this.port)
    this.codiusRoot = env.CODIUS_ROOT || '/var/lib/codius'
    this.memdownPersist = env.CODIUS_MEMDOWN_PERSIST === 'true'
    this.devMode = env.CODIUS_DEV === 'true'
    this.bootstrapPeers = env.CODIUS_BOOTSTRAP_PEERS
      ? JSON.parse(env.CODIUS_BOOTSTRAP_PEERS)
      : DEFAULT_BOOTSTRAP_PEERS
    this.maxMemoryFraction = Number(env.CODIUS_MAX_MEMORY_FRACTION) || 0.75
  }
}
