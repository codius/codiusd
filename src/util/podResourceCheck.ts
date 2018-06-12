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
