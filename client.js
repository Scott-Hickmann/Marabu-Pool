const { MessageSocket } = require('./net');
const canonicalize = require('canonicalize');
const crypto = require('crypto');

function hash(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function id(object) {
  return hash(canonicalize(object));
}

const FULLNODE_HOST = '149.28.220.241'
const FULLNODE_PORT = 18018

function getClient() {
  const client = MessageSocket.createClient(`${FULLNODE_HOST}:${FULLNODE_PORT}`)

  client.sendMessage({
    type: 'hello',
    agent: 'Marabu Explorer 0.1.0',
    version: '0.8.0'
  })

  return client
}

const client = getClient()

function updateChainTip(chainTipObject) {
  let tipCoinbase;
  client.sendMessage({
    type: 'getchaintip'
  })
  client.sendMessage({
    type: 'getmempool'
  })
  client.netSocket.on('error', e => console.log(e))
  client.on('message', (messageStr) => {
    const message = JSON.parse(messageStr)
    if (message.type === 'chaintip') {
      chainTipObject.tip = message.blockid
      client.sendMessage({
        type: 'getobject',
        objectid: message.blockid
      })
    } else if (message.type === 'mempool') {
      chainTipObject.mempool = message.txids
    } else if (message.type === 'object' && message.object.type === 'block') {
      const objectid = id(message.object)

      if (chainTipObject.tip === objectid) {
        if (message.object.txids.length) {
          tipCoinbase = message.object.txids[0]
          // Get coinbase to figure out chain height
          client.sendMessage({
            type: 'getobject',
            objectid: tipCoinbase
          })
        }
      }
    } else if (message.type === 'object' && message.object.type === 'transaction') {
      if (id(message.object) === tipCoinbase && message.object.height) {
        chainTipObject.height = message.object.height + 1;
      }
    } else {
      console.log(`Unknown message from fullnode: ${messageStr}`)
    }
  })
  return client;
}

module.exports = {
  updateChainTip
}
