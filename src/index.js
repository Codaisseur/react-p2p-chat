import Peer from 'simple-peer'
import React, { createElement } from 'react'
import { render } from 'react-dom'

let p1 = null

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
        p1.send(message)
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
  p1 = Peer({trickle: false, initiator: true})

  p1.on('signal', (data) => {
    console.log('p1 signal', data)
    update('signal')
    update(JSON.stringify(data))
  })
}

connect = (data) => {
  if (p1 === null) {
    p1 = Peer({trickle: false})
    p1.on('signal', (data) => {
      console.log('p1 signal', data)
      update('signal')
      update(JSON.stringify(data))
    })
  }
  p1.signal(data)

  p1.on('connect', () => {
    console.log('p1 connected')
    update('connected')
  })
  p1.on('data', (data) => {
    const message = data.toString('utf-8')
    update('> ' + message)
    console.log('p1 received', message)
  })
  p1.on('error', (error) => {
    update('!!! ' + error.message)
    console.error('p1 error', error)
  })
  p1.on('close', () => {
    update('Connection closed')
    console.log('p1 connection closed')
  })
}
