export function checkMemory (resource: any): number {
  if (resource) {
    return resource.memory
  }
  return 512
}

export function checkVCPU (resource: any): number {
  if (resource) {
    return resource.vcpu
  }
  return 1
}

const MEGABYTE_SIZE = 1048576
export { MEGABYTE_SIZE }
