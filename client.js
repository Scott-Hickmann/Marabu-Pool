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
  // client.sendMessage({
  //   type: 'object',
  //   object: {"inputs":[{"outpoint":{"index":0,"txid":"84a2635e06fe5bd5f0df45237de6f16c967197da841057264cb96f1678eaab60"},"sig":"4b0f0cf684db8001dd01feb8303f3ef0d64ce7aa274b0d85089bcfe15d6139eb1282ba1a5d230a617458caa23726bd1ee667f68c497b89675fb286eacb4abe0e"}],"outputs":[{"pubkey":"4a78717bd8f31091c8dfe8c2b8c3614a0d6ac77ec27e560546cf50ccb3ebb6b1","value":50000000000000}],"type":"transaction"}
  // })
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
