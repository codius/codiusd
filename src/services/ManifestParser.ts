import { PodSpec } from '../schemas/PodSpec'
import { Injector } from 'reduct'
import Config from './Config'
import Secret from './Secret'
import ManifestHash from './ManifestHash'
import { createHash } from 'crypto'
import * as Boom from 'boom'
const canonicalJson = require('canonical-json')

export interface ManifestOptions {
  deps: Injector
  manifest: object
  privateManifest: object
}

export interface Env {
  env: string,
  value: string
}

export class Manifest {
  private secret: Secret
  private config: Config
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
    this.manifest = opts.manifest
    this.secret = opts.deps(Secret)
    this.config = opts.deps(Config)
    this.hash = opts.deps(ManifestHash).hashManifest(this.manifest)
    this.privateManifest = opts.privateManifest
  }

  toPodSpec (): PodSpec {
    return {
      id: this.hash,
      resource: this.machineToResource(this.manifest['machine']),
      containers: this.manifest['containers']
        .map(this.processContainer.bind(this))
        .concat([{
          // Adds interledger access to this pod, listening on 7768
          name: `${this.hash}_moneyd`,
          image: 'codius/codius-moneyd@sha256:4c02fc168e6b4cfde90475ed3c3243de0bce4ca76b73753a92fb74bf5116deef',
          envs: [{ env: 'CODIUS_SECRET', value: this.secret.hmac(this.hash) }]
        }])
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

  processEnv (environment: object): Array<Env> {
    const hostEnv = [{
      env: 'CODIUS',
      value: 'true'
    }, {
      env: 'CODIUS_HOST',
      // TODO: if this URI resolves to 127.0.0.1 it won't be accesible to
      // the contract from inside of hyper
      value: this.config.publicUri
    }, {
      env: 'CODIUS_MANIFEST_HASH',
      value: this.hash
    }, {
      env: 'CODIUS_MANIFEST',
      value: JSON.stringify(this.manifest)
    }]

    if (!environment) return hostEnv

    const manifestEnv = Object.keys(environment).map((key) => {
      if (key.startsWith('CODIUS')) {
        throw Boom.badData('environment variables starting in ' +
          '"CODIUS" are reserved. ' +
          `var=${key}`)
      }

      return {
        env: key,
        value: this.processValue(environment[key])
      }
    })

    return ([] as Array<Env>).concat(hostEnv, manifestEnv)
  }

  processValue (value: string): string {
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
  private deps: Injector

  constructor (deps: Injector) {
    this.deps = deps
  }

  manifestToPodSpec (manifest: object, privateManifest: object): PodSpec {
    return new Manifest({
      deps: this.deps,
      manifest,
      privateManifest
    }).toPodSpec()
  }
}
