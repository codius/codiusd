const base32 = require('thirty-two')

export function encode (buffer: Buffer): string {
  return base32.encode(buffer)
    .toString('ascii')
    .toLowerCase()
    .replace(/=+$/, '')  
}

export function decode (b32: string): Buffer {
  return base32.decode(b32)
}
