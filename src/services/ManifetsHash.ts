import canonicalJson from 'canonical-json'
import { createHash } from 'crypto'

export default class ManifestHash {
  hashManifest (manifest: object) {
    // TODO: is hex output what we want?
    return createHash('sha256')
      .update(canonicalJson(manifest), 'utf8')
      .digest()
      .toString('hex')
  }
}
