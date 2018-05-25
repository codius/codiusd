import { createHash } from 'crypto'
import * as base32 from '../common/base32'
const canonicalJson = require('canonical-json')

export default class ManifestHash {
  hashManifest (manifest: object) {
    // TODO: is hex output what we want?
    const hashed = createHash('sha256')
      .update(canonicalJson(manifest), 'utf8')
      .digest()

    return base32.encode(hashed)
  }
}
