process.env.NODE_ENV = 'test'
import PeerDatabase from '../src/services/PeerDatabase'
import chai = require('chai')
const expect = chai.expect
import * as reduct from 'reduct'
const peerDb = reduct()(PeerDatabase)

describe.skip('Testing peer validation', () => {
  it('Add only valid peers', async () => {
    const testPeerArr = ['http://127.0.0.1:3000', 'http://127.3.0.2:3000', 'https://codius.andros-connector.com', 'http://local.codius.org:3000', 'https://bogus-peer.com']
    const correctArr = [
      'https://codius.andros-connector.com'
    ]
    await peerDb.addPeers(testPeerArr)
    expect(peerDb.getAllPeers()).to.deep.equal(correctArr)
  })
})
