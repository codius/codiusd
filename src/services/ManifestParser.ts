import { PodSpec } from '../schemas/PodSpec'
import { ContainerSpec } from '../schemas/ContainerSpec'
import { Injector } from 'reduct'
import ManifestHash from './ManifestHash'
import { createHash } from 'crypto'
import * as Boom from 'boom'
const canonicalJson = require('canonical-json')

export interface ManifestOptions {
  hash: string
  manifest: object
  privateManifest: object
}

export class Manifest {
  private hash: string
  private manifest: object
  private privateManifest: object
  private readonly MACHINE_SPECS = {
    small: {
      vcpu: 1,
      memory: 512
    }
  }

  constructor (opts: ManifestOptions) {
    this.hash = opts.hash
    this.manifest = opts.manifest
    this.privateManifest = opts.privateManifest
  }

  toPodSpec (): PodSpec {
    return {
      id: this.hash,
      resource: this.machineToResource(this.manifest['machine']),
      containers: this.manifest['containers']
        .map(this.processContainer.bind(this)),
    }
  }

  machineToResource (machine: keyof typeof Manifest.prototype.MACHINE_SPECS) {
    return this.MACHINE_SPECS[machine] || this.MACHINE_SPECS['small']
  }

  processContainer (container: object) {
    return {
      name: `${this.hash}__${container['id']}`,
      image: container['image'],
      command: container['command'],
      workdir: container['workdir'],
      envs: this.processEnv(container['environment'])
    }
  }

  processEnv (environment: object): Array<object> {
    if (!environment) return []
    return Object.keys(environment).map((key) => {
      return {
        env: key,
        value: this.processValue(environment[key])
      }
    })
  }

  processValue (value: string): string {
    // TODO: is this the way we want to do escaping?
    if (value.startsWith('\\$')) return value.substring(1)
    if (!value.startsWith('$')) return value

    const varName = value.substring(1)
    const varSpec = this.manifest['vars'] && this.manifest['vars'][varName]
    const privateVarSpec = this.privateManifest['vars'] &&
      this.privateManifest['vars'][varName]

    if (!varSpec) {
      throw Boom.badData('could not interpolate var. ' +
        `var=${value} ` +
        `manifest.vars=${JSON.stringify(this.manifest['vars'])}`)
    }

    if (!varSpec.encoding) {
      return varSpec.value
    }

    if (varSpec.encoding === 'private:sha256') {
      if (!privateVarSpec) {
        throw Boom.badData('could not interpolate private var. ' +
          `var=${value} ` +
          `manifest.vars=${JSON.stringify(this.manifest['vars'])}`)
      }

      const hashPrivateVar = createHash('sha256')
        .update(canonicalJson(privateVarSpec))
        .digest('hex')

      if (hashPrivateVar !== varSpec.value) {
        throw Boom.badData('private var does not match hash. ' + 
          `var=${value} ` +
          `encoding=${varSpec.encoding} ` +
          `public-hash=${varSpec.value} ` + 
          `hashed-value=${hashPrivateVar}`)
      }

      return privateVarSpec.value
    }

    throw Boom.badData('unknown var encoding. var=' + JSON.stringify(varSpec))
  }
}

export default class ManifestParser {
  private hash: ManifestHash

  constructor (deps: Injector) {
    this.hash = deps(ManifestHash)
  }

  manifestToPodSpec (manifest: object, privateManifest: object): PodSpec {
    const hash = this.hash.hashManifest(manifest)
    return new Manifest({ hash, manifest, privateManifest }).toPodSpec()
  }
}
