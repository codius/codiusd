process.env.NODE_ENV = 'test'
process.env.CODIUS_ADDITIONAL_HOST_INFO = 'true'
import HttpServer from '../src/services/HttpServer'
import chai = require('chai')
import * as reduct from 'reduct'
const httpServer = reduct()(HttpServer)
const server = httpServer.getServer()
const { exec } = require('child_process')
const assert = chai.assert

describe('Host info API testing', () => {
  beforeEach(function () {
    exec('moneyd xrp:start --testnet', (err: any, stdout: any, stderr: any) => {
      if (err) {
          // node couldn't execute the command
        return
      }
    })
  })
  it('Validates host-info api', done => {
    const request = {
      method: 'GET',
      url: '/host-info'
    }
    if (server) {
      server.inject(request).then(response => {
        const res = JSON.parse(response.payload)
        assert.isOk(res, 'Returns object')
        done()
      }).catch(err => {
        console.log('error message: ', err)
      })
    }
  })
})
