import { PodSpec } from '../schemas/PodSpec'
import { ContainerSpec } from '../schemas/ContainerSpec'

export default class ManifestParser {
  private readonly MACHINE_SPECS = {
    small: {
      vcpu: 1,
      memory: 512
    }
  }

  manifestToPodSpec (manifest: object): PodSpec {
    return {
      resource: this.machineToResource(manifest['machine']),
      containers: manifest['containers']
        .map(this.processContainer.bind(this, manifest)),
    }
  }

  machineToResource (machine: keyof typeof ManifestParser.prototype.MACHINE_SPECS) {
    return this.MACHINE_SPECS[machine] || this.MACHINE_SPECS['small']
  }

  processContainer (manifest: object, container: object): ContainerSpec {
    return {
      image: container['image'],
      command: container['command'],
      workdir: container['workdir'],
      envs: this.processEnv(manifest, container['environment'])
    }
  }

  processEnv (manifest: object, environment: object): Array<object> {
    if (!environment) return undefined
    return Object.keys(environment).reduce((res, key) => {
      res[key] = {
        env: key,
        value: this.processValue(manifest, environment[key])
      }

      return res
    }, {})
  }

  processValue (manifest: object, value: string): string {
    // TODO: is this the way we want to do escaping?
    if (value.startsWith('\\$')) return value.substring(1)
    if (!value.startsWith('$')) return value

    const varName = value.substring(1)
    const varSpec = manifest.vars && manifest.vars[varName]

    if (!varSpec) {
      throw new Error('could not interpolate var. ' +
        `var=${value} ` +
        `manifest.vars=${JSON.stringify(manifest.vars)}`)
    }

    if (!varSpec.encoding) {
      return varSpec.value
    }

    if (varSpec.encoding === 'private:sha256') {
      // TODO: private sha256 variables
      throw new Error('TODO')
    }
  }
}
