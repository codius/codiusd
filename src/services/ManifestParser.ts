import { PodSpec } from '../schemas/PodSpec'
import { ContainerSpec } from '../schemas/ContainerSpec'
import { Injector } from 'reduct'
import ManifestHash from './ManifestHash'

export default class ManifestParser {
  private hash: ManifestHash
  private readonly MACHINE_SPECS = {
    small: {
      vcpu: 1,
      memory: 512
    }
  }

  constructor (deps: Injector) {
    this.hash = deps(ManifestHash)
  }

  manifestToPodSpec (manifest: object): PodSpec {
    return {
      id: this.hash.hashManifest(manifest),
      resource: this.machineToResource(manifest['machine']),
      containers: manifest['containers']
        .map(this.processContainer.bind(this, manifest)),
    }
  }

  machineToResource (machine: keyof typeof ManifestParser.prototype.MACHINE_SPECS) {
    return this.MACHINE_SPECS[machine] || this.MACHINE_SPECS['small']
  }

  processContainer (manifest: object, container: object) {
    return {
      name: container['id'],
      image: container['image'],
      command: container['command'],
      workdir: container['workdir'],
      envs: this.processEnv(manifest, container['environment'])
    }
  }

  processEnv (manifest: object, environment: object): Array<object> {
    if (!environment) return []
    return Object.keys(environment).map((key) => {
      return {
        env: key,
        value: this.processValue(manifest, environment[key])
      }
    })
  }

  processValue (manifest: object, value: string): string {
    // TODO: is this the way we want to do escaping?
    if (value.startsWith('\\$')) return value.substring(1)
    if (!value.startsWith('$')) return value

    const varName = value.substring(1)
    const varSpec = manifest['vars'] && manifest['vars'][varName]

    if (!varSpec) {
      throw new Error('could not interpolate var. ' +
        `var=${value} ` +
        `manifest.vars=${JSON.stringify(manifest['vars'])}`)
    }

    if (!varSpec.encoding) {
      return varSpec.value
    }

    if (varSpec.encoding === 'private:sha256') {
      // TODO: private sha256 variables
      throw new Error('TODO')
    }

    throw new Error('unknown var encoding. var=' + JSON.stringify(varSpec))
  }
}
