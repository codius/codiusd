import * as Boom from 'boom'
import { Injector } from 'reduct'
import { Manifest } from '../schemas/Manifest'
import CodiusDB from '../util/CodiusDB'
import { create as createLogger } from '../common/log'
const log = createLogger('PodDatabase')

export default class ManifestDatabase {
  private codiusdb: CodiusDB

  constructor (deps: Injector) {
    this.codiusdb = deps(CodiusDB)
  }

  public async getManifest (hash: string): Promise<Manifest> {
    const res = await this.codiusdb.getManifest(hash)
    if (!res) {
      throw Boom.notFound('No manifest with hash of "' + hash + '"')
    }
    log.debug(`fetched manifest. hash="${hash}"`)
    return res
  }

  public async deleteManifest (hash: string) {
    log.debug(`deleted manifest. hash="${hash}"`)
    await this.codiusdb.deleteManifest(hash)
  }

  public async saveManifest (hash: string, manifest: Manifest) {
    log.debug(`saved manifest. hash="${hash}"`)
    await this.codiusdb.saveManifest(hash, manifest)
  }
}
