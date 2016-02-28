import Peer from 'simple-peer'
import React, { createElement } from 'react'
import { render } from 'react-dom'

const p1 = Peer({trickle: false, initiator: true})
const p2 = Peer({trickle: false})

let signal_input = ''
const ConnectForm = () => (
  <div>
    <input
      ref = { (el) => signal_input = el }
      placeholder = 'Enter signaling data here...'
    />
    <button
      onClick = { () => p2.signal(signal_input.value) }
    >
      Connect
    </button>
  </div>
)

const Root = (props) => (
  <div>
    <ConnectForm />
    {
      props.messages.map((message) => <p>{ message }</p>)
    }
  </div>
)

const container = document.getElementById('app-container')

let messages = []
const update = (message) => {
  messages = messages.concat(message)
  const root = createElement(Root, { messages })
  render(
    root,
    container
  )
}

p1.on('signal', (data) => {
  console.log('p1 signal', data)
  update('signal')
  update(JSON.stringify(data))
})
p1.on('connect', () => {
  console.log('p1 connected')
  update('connected')
  p1.send('Hello, p2. How are you?')
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

p2.on('signal', (data) => {
  console.log('p2 signal', data)
  p1.signal(data)
})
p2.on('connect', () => console.log('p2 connected'))
p2.on('data', (data) => {
  console.log('p2 received', data.toString('utf-8'))
  p2.send('Fine, thanks. How about you p1?')
})
p2.on('error', (error) => console.error('p2 error', error))
p2.on('close', () => console.log('p2 connection closed'))
