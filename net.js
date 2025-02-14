const net = require('net')
const { EventEmitter } = require('events')

class MessageSocket extends EventEmitter {
  buffer = '' // defragmentation buffer
  netSocket = undefined
  peerAddr = undefined

  static createClient(peerAddr) {
    const [host, portStr] = peerAddr.split(':')
    const port = +portStr
    if (port < 0 || port > 65535) {
      throw new Error('Invalid port')
    }
    const netSocket = new net.Socket()
    const socket = new MessageSocket(netSocket, peerAddr)

    netSocket.connect(port, host)

    return socket
  }
  constructor(netSocket, peerAddr) {
    super()

    this.peerAddr = peerAddr
    this.netSocket = netSocket
    this.netSocket.on('data', (data) => {
      this.buffer += data
      const messages = this.buffer.split('\n')

      if (messages.length > 1) {
        for (const message of messages.slice(0, -1)) {
          this.emit('message', message)
        }
        this.buffer = messages[messages.length - 1]
      }
    })
  }
  sendMessage(message) {
    this.netSocket.write(`${JSON.stringify(message)}\n`)
  }
  end() {
    this.netSocket.end()
  }
}

module.exports = { MessageSocket };