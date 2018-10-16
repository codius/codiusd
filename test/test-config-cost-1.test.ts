process.env.NODE_ENV = 'test'
process.env.CODIUS_XRP_PER_MONTH = '11'
import HttpServer from '../src/services/HttpServer'
import Ildcp from '../src/services/Ildcp'
import chai = require('chai')
import * as reduct from 'reduct'
const deps = reduct()
const ildcp = deps(Ildcp)
const server = deps(HttpServer).getServer()
const assert = chai.assert

describe('Config testing when process.env.CODIUS_XRP_PER_MONTH is set', () => {
  before(async function () {
    await ildcp.init()
  })
  it('Validates Config does not break changes when process.env.CODIUS_XRP_PER_MONTH is set', done => {
    const request = {
      method: 'GET',
      url: '/info'
    }
    if (server) {
      server.inject(request).then(response => {
        const res = JSON.parse(response.payload)
        assert.isOk(res, 'Returns object')
        assert.strictEqual(res.costPerMonth, 11)
        server.stop().then(err => {
          if (err) {
            console.log('err')
          }
          done()
        })
      }).catch(err => {
        console.log('error message: ', err)
      })
    }
  })
})
