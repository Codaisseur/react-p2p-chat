import Peer from 'simple-peer'
import React, { createElement } from 'react'
import { render } from 'react-dom'

let peer = null

let initiate = null // This is an ugly hack!
let connect = null
let signal_input = null
const ConnectForm = () => (
  <div>
    <input
      ref = { (el) => signal_input = el }
      placeholder = 'Enter signaling data here...'
    />
    <button
      onClick = { () => connect(signal_input.value) }
    >
      Answer
    </button>
    <button
      onClick = { () => initiate() }
    >
      Initiate
    </button>

  </div>
)

let message_input = ''
const MessageForm = () => (
  <div>
    <input
      ref = { (el) => message_input = el }
      placeholder = 'Enter something nice here...'
    />
    <button
      onClick = { () => {
        const message = message_input.value
        update('< ' + message)
        peer.send(message)
      } }
    >
      Send
    </button>
  </div>
)

const Root = (props) => (
  <div>
    { !props.connected ? <ConnectForm /> : "" }
    {
      props.messages.map((message) => <pre>{ message }</pre>)
    }
    { props.connected ? <MessageForm /> : "" }
  </div>
)

const container = document.getElementById('app-container')

let connected = false
let messages = []
const update = (message) => {
  messages = messages.concat(message)
  if (message === 'connected') { connected = true }
  const root = createElement(Root, { messages, connected })
  render(
    root,
    container
  )
}
update('')

// Because our app is a spaghetti mess, we had to declare a variable above and assign it here. Shame.
initiate = () => {
  peer = Peer({trickle: false, initiator: true})

  peer.on('signal', (data) => {
    console.log('peer signal', data)
    update('signal')
    update(JSON.stringify(data))
  })
}

connect = (data) => {
  if (peer === null) {
    peer = Peer({trickle: false})
    peer.on('signal', (data) => {
      console.log('peer signal', data)
      update('signal')
      update(JSON.stringify(data))
    })
  }
  peer.signal(data)

  peer.on('connect', () => {
    console.log('peer connected')
    update('connected')
  })
  peer.on('data', (data) => {
    const message = data.toString('utf-8')
    update('> ' + message)
    console.log('peer received', message)
  })
  peer.on('error', (error) => {
    update('!!! ' + error.message)
    console.error('peer error', error)
  })
  peer.on('close', () => {
    update('Connection closed')
    console.log('peer connection closed')
  })
}
