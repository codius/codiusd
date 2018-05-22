const NODE_COUNT = 5

const { resolve } = require('path')

const nodes = []

for (let i = 0; i < NODE_COUNT; i++) {
  nodes.push({
    name: 'devnet' + i,
    script: resolve(__dirname, '../../src/index.js'),
    env: {
      CODIUS_HOSTNAME: 'localhost',
      CODIUS_PORT: String(3000 + i),
      CODIUS_BOOTSTRAP_PEERS: JSON.stringify([
        'http://localhost:3000'
      ])
    }
  })
}

module.exports = { apps: nodes }
