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
      containers: manifest['containers'].map(this.processContainer.bind(this))
    }
  }

  machineToResource (machine: keyof typeof ManifestParser.prototype.MACHINE_SPECS) {
    return this.MACHINE_SPECS[machine] || this.MACHINE_SPECS['small']
  }

  processContainer (container: object): ContainerSpec {
    return {
      image: container['image'],
      command: container['command'],
      workdir: container['workdir']
    }
  }
}
