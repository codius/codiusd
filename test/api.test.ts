process.env.NODE_ENV = 'test'
process.env.CODIUS_ADDITIONAL_HOST_INFO = 'true'
import HttpServer from '../src/services/HttpServer'
import Ildcp from '../src/services/Ildcp'
import chai = require('chai')
import * as reduct from 'reduct'
const deps = reduct()
const ildcp = deps(Ildcp)
const server = deps(HttpServer).getServer()
const assert = chai.assert

describe('Host info API testing', () => {
  before(async function () {
    await ildcp.init()
  })
  it('Validates info endpoint', done => {
    const request = {
      method: 'GET',
      url: '/info'
    }
    if (server) {
      server.inject(request).then(response => {
        const res = JSON.parse(response.payload)
        assert.isOk(res, 'Returns object')
        assert.hasAllKeys(res, ['fullMem', 'acceptingUploads', 'serverFreeMemory', 'serverUptime', 'serviceUptime', 'avgLoad', 'numPeers', 'currency', 'costPerMonth', 'uri', 'runningContracts', 'selfTestSuccess'])
        assert.strictEqual(res.currency, ildcp.getAssetCode())
        done()
      }).catch(err => {
        console.log('error message: ', err)
      })
    }
  })

  it('Validates memory endpoint', done => {
    const request = {
      method: 'GET',
      url: '/memory'
    }
    if (server) {
      server.inject(request).then(response => {
        const res = JSON.parse(response.payload)
        assert.isOk(res, 'Returns object')
        assert.hasAnyKeys(res, ['freeMem'])
        done()
      })
    }
  })
})
