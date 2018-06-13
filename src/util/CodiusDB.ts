import { resolve as resolvePath } from 'path'
import { PodInfo } from '../schemas/PodInfo'
import { Manifest } from '../schemas/Manifest'
import levelup, { LevelUp } from 'levelup'
import leveldown from 'leveldown'
import memdown from 'memdown'
import encode from 'encoding-down'
import { Injector } from 'reduct'
import Config from '../services/Config'

const PEERS_KEY = 'codiusPeers'
const PODS_KEY = 'codiusPods'
const MANIFEST_KEY = 'codiusManifests'

export default class CodiusDB {
  private config: Config
  private db: LevelUp

  constructor (deps: Injector) {
    this.config = deps(Config)

    let backend
    if (this.config.memdownPersist || this.config.devMode) {
      backend = memdown()
    } else {
      backend = leveldown(resolvePath(this.config.codiusRoot, 'codius.db'))
    }
    this.db = levelup(encode(backend, { valueEncoding: 'json' }))
  }

  // Manifest Methds
  async getManifest (hash: string): Promise<Manifest | void> {
    return this.get(MANIFEST_KEY + ':' + hash)
  }

  async saveManifest (hash: string, manifest: Manifest) {
    await this.saveValue(MANIFEST_KEY + ':' + hash, manifest)
  }

  async deleteManifest (hash: string) {
    await this.delete(MANIFEST_KEY + ':' + hash)
  }

  // Pod methods
  async getPods (): Promise<PodInfo[]> {
    return this.loadValue(PODS_KEY, [])
  }

  async savePods (pods: PodInfo[]) {
    await this.saveValue(PODS_KEY, pods)
  }

  async deletePods () {
    await this.delete(PODS_KEY)
  }

  // Peer methods
  async getPeers (): Promise<string[]> {
    return this.loadValue(PEERS_KEY, [])
  }

  async savePeers (peers: string[]) {
    await this.saveValue(PEERS_KEY, peers)
  }

  async deletePeers () {
    await this.delete(PEERS_KEY)
  }

  // Save and Load serialized values
  async saveValue (key: string, value: {}) {
    const existing = await this.get(key)
    if (existing) {
      if (typeof existing !== typeof value) {
        throw TypeError
      }
      await this.delete(key)
    }
    await this.set(key, value)
  }

  async loadValue (key: string, defaultValue: {}) {
    const value = await this.get(key)
    if (!value) {
      return defaultValue
    }
    return value
  }

    // Low Level Util
  private async get (key: string) {
    try {
      return await this.db.get(key)
    } catch (err) {
      if (!err.notFound) {
        throw err
      }
      return null
    }
  }

  private async set (key: string, data: {}) {
    await this.db.put(key, data)
  }

  private async delete (key: string) {
    await this.db.del(key)
  }
}
