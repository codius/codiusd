import { Injector } from 'reduct'

const DEFAULT_BOOTSTRAP_PEERS = [
  'https://codius.justmoon.com',
  'https://codius.andros-connector.com',
  'https://codius.africa',
  'https://codius.risky.business',
  'https://codius.feraltc.com',
  'https://codius.tinypolarbear.com'
]

function setPrice () {

  if (process.env.CODIUS_COST_PER_MONTH) {
    return Number(process.env.CODIUS_COST_PER_MONTH)
  } else if (process.env.COST_PER_MONTH) {
    return Number(process.env.COST_PER_MONTH)
  } else if (process.env.CODIUS_XRP_PER_MONTH) {
    return Number(process.env.CODIUS_XRP_PER_MONTH)
  }
  return 10
}

export default class Config {
  readonly hyperSock: string
  readonly noop: boolean
  readonly port: number
  readonly bindIp: string
  readonly publicUri: string
  readonly codiusRoot: string
  readonly memdownPersist: boolean
  readonly bootstrapPeers: string[]
  readonly maxMemoryFraction: number
  readonly ilpPlugin: string | void
  readonly ilpCredentials: string | void
  readonly devMode: boolean
  readonly showAdditionalHostInfo: boolean
  readonly hostCurrency: string
  readonly hostAssetScale: number
  hostCostPerMonth: number
  readonly adminApi: boolean
  readonly adminPort: number
  readonly disableSelfTest: boolean

  constructor (env: Injector | { [k: string]: string | undefined }) {
    // Load config from environment by default
    if (typeof env === 'function') {
      env = process.env
    }

    this.devMode = env.CODIUS_DEV === 'true'

    this.port = Number(env.CODIUS_PORT) || 3000
    if (env.CODIUS_PUBLIC_URI) {
      this.publicUri = env.CODIUS_PUBLIC_URI
    } else if (this.devMode || env.NODE_ENV === 'test') {
      this.publicUri = ('http://local.codius.org:' + this.port)
    } else {
      throw new Error('Codiusd requires CODIUS_PUBLIC_URI to be set')
    }

    this.ilpPlugin = env.ILP_PLUGIN
    this.ilpCredentials = env.ILP_CREDENTIALS
    this.hyperSock = env.CODIUS_HYPER_SOCKET || '/var/run/hyper.sock'
    this.noop = env.CODIUS_HYPER_NOOP === 'true'
    this.bindIp = env.CODIUS_BIND_IP || '127.0.0.1'
    this.codiusRoot = env.CODIUS_ROOT || '/var/lib/codius'
    this.memdownPersist = env.CODIUS_MEMDOWN_PERSIST === 'true'
    this.bootstrapPeers = env.CODIUS_BOOTSTRAP_PEERS
      ? JSON.parse(env.CODIUS_BOOTSTRAP_PEERS)
      : DEFAULT_BOOTSTRAP_PEERS
    this.maxMemoryFraction = Number(env.CODIUS_MAX_MEMORY_FRACTION) || 0.75
    this.showAdditionalHostInfo = env.CODIUS_ADDITIONAL_HOST_INFO === 'true'
    this.hostCurrency = 'XRP'
    this.hostAssetScale = 6
    this.hostCostPerMonth = setPrice()
    this.disableSelfTest = env.CODIUS_DISABLE_SELF_TEST === 'true'
    // Admin API Config
    this.adminApi = env.CODIUS_ADMIN_API === 'true'
    this.adminPort = Number(env.CODIUS_ADMIN_PORT) || 3001

  }
}
