import AdminServer from '../src/services/AdminServer'
import CodiusDB from '../src/util/CodiusDB'
import Ildcp from '../src/services/Ildcp'
import BigNumber from 'bignumber.js'
import chai = require('chai')
import * as reduct from 'reduct'
const assert = chai.assert

describe('AdminServer', () => {
  let codiusdb: any
  let ildcp: any
  let server: any

  beforeEach(async () => {
    const deps = reduct()
    ildcp = deps(Ildcp)
    codiusdb = deps(CodiusDB)
    server = deps(AdminServer).getServer()
    await ildcp.init()
  })

  describe('/getAllUptime', () => {

    it('should return earnings and pod uptime', async () => {
      const request = {
        method: 'GET',
        url: '/getAllUptime'
      }
      const response = await server.inject(request)
      const res = JSON.parse(response.payload)
      assert.isOk(res, 'Returns object')
      assert.hasAllKeys(res, ['aggregate_pod_uptime', 'aggregate_earnings'])
      assert.strictEqual(res.aggregate_pod_uptime, '0')
      assert.isOk(res.aggregate_earnings)
    })

    it('should return zero for no profits', async () => {
      const request = {
        method: 'GET',
        url: '/getAllUptime'
      }
      const response = await server.inject(request)
      const res = JSON.parse(response.payload)
      const expectedEarnings = {}
      expectedEarnings[ildcp.getAssetCode()] = '0'
      assert.deepEqual(res.aggregate_earnings, expectedEarnings)
    })

    it('should return profits', async () => {
      await codiusdb.setProfit('USD', 2, new BigNumber(100))
      await codiusdb.setProfit('XRP', 6, new BigNumber(2000000))
      await codiusdb.setProfit('XRP', 9, new BigNumber(3000000000))
      const request = {
        method: 'GET',
        url: '/getAllUptime'
      }
      const response = await server.inject(request)
      const res = JSON.parse(response.payload)
      const expectedEarnings = {
        USD: '1',
        XRP: '5'
      }
      expectedEarnings[ildcp.getAssetCode()] = '0'
      assert.deepEqual(res.aggregate_earnings, expectedEarnings)
    })
  })
})
