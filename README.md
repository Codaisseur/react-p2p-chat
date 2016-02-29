---

title   : Reactive P2P Chat
author  :
  name    : Tadeusz Łazurski
  twitter : @lazurski
  github  : lzrski

---

### Set up new project

```bash
mkdir p2p-chat
cd p2p-chat
git init
npm init
```

Just press enter for every question.

---

# .gitignore

Make sure build artifacts won't clutter your source control. Put this in your `.gitignore` file:

```
node_modules/
build/
npm-debug.log
*.sublime-workspace
.DS_Store
```

---

### Install development dependencies...

```bash
npm install --save-dev \
  browserify \
  watchify \
  babelify \
  babel-preset-react \
  babel-preset-es2015
```

...and commit changes

```
git add --all .
git commit -m 'Install development dependencies'
```

> PRO TIP: commit on each step

---

### Bootstrap some code

Make some new files:

`index.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Let's Chat!</title>
  </head>
  <body>
    <script src="build/application.js"></script>
  </body>
</html>
```

`src/index.js`

```javascript
console.log("Hello, there. Let's chat!")
```

---

### Transform and bundle our file

```bash
mkdir -p build
./node_modules/.bin/browserify \
  -t [ babelify --presets [ es2015 react ] ] \
  -o build/application.js \
  src/index.js
```

You should have a file called `build/application.js` with weird looking code. It's a bundle. Not that we reference it in our html file.

---

### Open the html file

```bash
xdg-open index.html # Linux
open index.html     # OSX
```

Then, in the browser, open the console (`alt-ctrl-j` / `alt-cmd-j`).

You should see:

```
Hello, there. Let's chat!
```

> FRIENDLY REMINDER: Commit!

---

Let's avoid typing this terrible thing by using NPM scripts. In `package.json` find scripts section and add a new script called `build`:

```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1",
  "build": "mkdir -p build; browserify -t [ babelify --presets [ es2015 react ] ] -o build/application.js src/index.js"
},
```

Now you can execute more friendly command:

```bash
npm run build
```

---

Avoid manual recompilation every time we save a file by adding `develop` script with `watchify` command and `--debug` option for source maps:

```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1",
  "build": "mkdir -p build; browserify -t [ babelify --presets [ es2015 react ] ] -o build/application.js src/index.js",
  "develop": "mkdir -p build; watchify -t [ babelify --presets [ es2015 react ] ] -o build/application.js --debug src/index.js"
},
```

Now run

```bash
npm run develop
```

---

### Enter Simple Peer

Let's play with some P2P connectivity. We will use [feross/simple-peer][] for that:

```bash
npm install --save simple-peer
```

[feross/simple-peer]: https://github.com/feross/simple-peer

---

### In process communication

We start with two peers running in same webpage. It's not very useful on it's own, but it's a good starting point.

```javascript
import Peer from 'simple-peer'

const p1 = Peer({trickle: false, initiator: true})
const p2 = Peer({trickle: false})
```

---

### Make some noise

To have some insight in the operations of peers, let's make them output logs whenever something of interest happens. They are `event-emitters`, so we need to hook into their events.

```javascript
p1.on('signal', (data) => console.log('p1 signal', data))
p1.on('connect', () => console.log('p1 connected'))
p1.on('data', (data) => console.log('p1 received', data))
p1.on('error', (error) => console.error('p1 error', error))
p1.on('close', () => console.log('p1 connection closed'))

// Same for p2...
```

And reload your browser.

---

### Let's connect

In order to connect, peers need to exchange so called signaling data. Internally they use it to find each other.

The initiator peer will emit signal immediately after it's created. You should see it in the console. It's this weird looking thing:

```
{"type":"offer","sdp":"v=0\r\no=- 1363672724809654390 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=msid-semantic: WMS\r\nm=application 9 DTLS/SCTP 5000\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:zeBNQizxw4zejNZa\r\na=ice-pwd:fyTyIOTAhitF1MJxxCrOMti3\r\na=fingerprint:sha-256 A2:38:96:A2:E0:F9:04:72:E1:E4:62:54:66:79:7D:B0:CC:4A:24:9A:29:A0:97:8D:FA:9C:E7:B5:52:DD:14:0B\r\na=setup:actpass\r\na=mid:data\r\na=sctpmap:5000 webrtc-datachannel 1024\r\n"}
```

Don't worry - we don't need to comprehend the meaning of this.

---

Instead we need to pass this signal to the other peer. Let's change the `signal` handler function of `p1`:

```javascript
p1.on('signal', (data) => {
  console.log('p1 signal', data)
  p2.signal(data)
})
```

Now in the console we should see, that the `p2` is also emitting a signal. Note, that it is not the same thing we passed. In particular the `type` field is `answer` instead of `offer`.

---

This signal from `p2` needs to be passed to `p1` in turn.

```javascript
p2.on('signal', (data) => {
  console.log('p2 signal', data)
  p1.signal(data)
})
```

At some point the connection will be established and `connect` events triggered.

---

Once we have a connection, let's send something. It can be anything, so let's start with a simple hello:

```javascript
p1.on('connect', () => {
  console.log('p1 connected')
  p1.send('Hello, p2. How are you?')
})
```

And let p2 respond with in a friendly manner:

```javascript
p1.on('data', (data) => {
  console.log('p1 received', data)
  p2.send(data+1)
})
```

Do you see the numbers in the console? Looks like some robot speech, not friendly at all.

---

That's because whatever is sent is converted to a thing called buffer. Fortunately it's quite easy to convert it back to a string:

```
p1.on('data', (data) => {
  console.log('p1 received', data.toString('utf-8'))
```

How about a commit?

---

### Time for React

Before we separate the pears we should add some UI. We will use `facebook/react` for this. It separated in two modules:

```bash
npm install --save react react-dom
```

---

### React and the DOM

In browsers, there is an API called DOM: Document Object Model. What you see on your screen when you visit a web page is a `document`, and the DOM API gives you access to it.

---

The DOM API is rather terrible - interacting with it is slow and cumbersome.  However if you want browser to display anything it's the only way other then giving your browser entire new HTML *file*.

Same for processing user interactions like clicking a button or filling a form. Without DOM API you can only send it to the server, process it there and send back new HTML.

That is called `full page refresh cycle` and until recently it was the only way of building web apps.

---

### Virtual DOM

In react we very seldom use DOM API directly. React handles it for us. In most applications it's only when you call `render` function from `react-dom` module.

Other then that we use a different API called **Virtual DOM**. It's similar, but smarter.

---

### Elements

Just as DOM, Virtual DOM deals mainly with `elements`.

Each element has a type, like `div`, `a`, `p` etc. It also has a thing called `props` (which can affect the behavior of an element just like attributes you define in HTML). It can also have children - text or other elements.

---

We create an element by calling a `createElement` function from `react` module. Put following code **above** our P2P logic:

```javascript
import React, { createElement } from 'react'

const link = createElement(
  'a', // type
  {
    href: 'https://facebook.github.io/react/',
    title: 'Read the docs'
  }, // props
  'Hello, React!' // Children
)
```

---

And render it using `render` function from `react-dom` module.

```javascript
import { render } from 'react-dom'

const container = document.getElementById('app-container')
render(
  link,     // The element
  container // Where to render it - see next slide
)
```

---

We also need a place in the document where the element is to be rendered. In `index.html` add an container for it:

```html
<body>

<div id='app-container'><!-- The app goes here --></div>

<script src="build/application.js"></script>
</body>
```

---

Now refresh a browser and you should see a link we have created in previous slide.

Commit and rejoice :)

---

We will build our app UI as a tree of elements. Let's add two more:


```javascript
const link = createElement(
  'a', // type
  {
    href: 'https://facebook.github.io/react/',
    title: 'Read the docs'
  }, // props
  'Hello, React!' // Children
)
const heading = createElement('h1', {}, "It's all just elements")
const root = createElement('div', {}, heading, link)
render(
  root,     // Look out! It have changed.
  container
)
```

---

It should be familiar, because that's how you build a document using HTML. In fact, there is a thing called `JSX` that gives you a syntax for writing elements that is very similar to `HTML`. We will use it:

```html
const root = (
  <div>
    <h1>It's all elements</h1>
    <a
      title = 'Read the docs'
      href = 'https://facebook.github.io/react/'
    >
      Hello, React!
    </a>
  </div>
)
render(root, container)
```

---

### Being reactive

Remember our peers? The `p1` and `p2` guys? Let's make our UI react to the changes in the state of `p1` peer. First we need to record them. Let's create an array for that and call it `messages`, and also a helper function that will update the array.

```javascript
const p1 = Peer({trickle: false, initiator: true})
const p2 = Peer({trickle: false})

let messages = []
const update = (message) => {
  messages = messages.concat(message)
}
```

---

Next let's populate this array with messages:

```javascript
p1.on('signal', (data) => {
  console.log('p1 signal', data)
  update('signal')
  update(JSON.stringify(data))
  p2.signal(data)
})
```

---

```javascript
p1.on('connect', () => {
  console.log('p1 connected')
  update('connected')
  p1.send('Hello, p2. How are you?')
})
```

---

```javascript
p1.on('data', (data) => {
  const message = data.toString('utf-8')
  update('> ' + message)
  console.log('p1 received', message)
})
```

---

```javascript
p1.on('error', (error) => {
  update('!!! ' + error.message)
  console.error('p1 error', error)
})
```

---

```javascript
p1.on('close', () => {
  update('Connection closed')
  console.log('p1 connection closed')
})
```

---

### Update the UI

We update UI by rendering entire tree. To let this happen we need a function that will return different tree depending on it's arguments. Let's call it `Root` (with capital **R**):

```javascript
const Root = (props) => {
  return (
    <div>
      <h1>Hello</h1>
      {
        props.messages.map((message) => <p>{ message }</p>)
      }
    </div>
  )
}
```

---

Note how we jump from `JSX` to `JavaScript` syntax using curly braces (`{}`).

```javascript
const Root = (props) => {
  return ( // Here it's still JavaScript
    <div> // and here it is JSX
      <h1>Hello</h1>
      { // and JavaScript again!
        props.messages.map((message) => <p>{ message }</p>)
      }
    </div>
  )
}
```

---

Then inside `update` function, let's create and render a new `root` element every time it is called:

```javascript
let messages = []
const update = (message) => {
  messages = messages.concat(message)
  const root = createElement(Root, { messages })
  render(
    root,
    container
  )
}
```

---

Note that we have used `Root` function as a `type` argument to `createElement`, just as we have been doing with 'div', 'a', and 'h1' before. You can do that!

This kind of function is called *stateless component* and it is often used in React development. We will use this approach later.

---

To make it work you have to honor a following deal: it will return single element (in our case it's an element of type 'div'):

```html
return (
  <div>
    ...
  </div>
)
```

---

The `props` passed to `createElement` will be passed to your function as first argument. You can use them in your function to change what will get rendered or how it will behave. In our case we render the messages based on the props:

```html
props.messages.map((message) => <p>{ message }</p>)
```

---

### UI for connecting peers

Our goal is to banish one of the peers from our code and connect to one running in another instance of app operated by another user somewhere on the Internet.

---

To be able to do that, we need a way to provide signaling data to the peer without it having direct connection to the other one. After all signaling data is needed to establish the connection in the first place.

---

Let's remove the line where `p1` passes signaling data to `p2`:

```javascript
p1.on('signal', (data) => {
  console.log('p1 signal', data)
  update('signal')
  update(JSON.stringify(data))
})
```

---

And create a new component for supplying the signaling data to `p2`:

```javascript
let signal_input = null
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
```

---

At last, let's use it in our `Root` component:

```javascript
const Root = (props) => (
  <div>
    <ConnectForm />
    {
      props.messages.map((message) => <p>{ message }</p>)
    }
  </div>
)
```

---

Now for peers to connect you need to copy signaling data from `p1` into the form and click connect. Only then `p2` will receive it and will be able to connect.

> TIP: Triple click on the signaling data should select it all.

---

Now, let's add an input for chat messages:

```javascript
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
```

---

Let's use our new component:

```javascript
const Root = (props) => (
  <div>
    <ConnectForm />
    {
      props.messages.map((message) => <p>{ message }</p>)
    }
    <MessageForm />
  </div>
)
```

---

and remove the line when `p1` sends a message right after it connects:

```javascript
p1.on('connect', () => {
  console.log('p1 connected')
  update('connected')
})
```

---

Note that we should only display one of the forms. Either we are not connected and need a ConnectForm, but MessageForm doesn't make sense yet, or we are connected and it's the other way around.

Let's keep track of the connection status:

```javascript
let connected = false
let messages = []
const update = (message) => {
  messages = messages.concat(message)
  if (message === 'connected') { connected = true }
  // ...
}
```

---

And use it in Root component logic:

```javascript
const Root = (props) => (
  <div>
    { !props.connected ? <ConnectForm /> : "" }
    {
      props.messages.map((message) => <p>{ message }</p>)
    }
    { props.connected ? <MessageForm /> : "" }
  </div>
)
```

> NOTE: What you see are ternary operators (`x ? y : z`)
> I think they are ugly and confusing, but that's the best you can get in JS.

---

### Wait for the user to initiate a connection

Right now the initiator peer is created right away. Because after a separation of peers we wont know if the one in our instance should initiate the session or wait for signal, we need to provide user a mean to initiate only if she thinks it's appropriate.

---

First let's not initiate new `p1` on startup anymore:

```javascript
let p1 = null
const p2 = Peer({trickle: false})
```

Note that we have changed `const` to `let`. That's because the value of `p1` won't be constant anymore. We will change it soon.

---

Now we need a button and a function. First a button in a ConnectForm component:

```html
const ConnectForm = () => (
  <div>
    <input
      ref = { (el) => signal_input = el }
      placeholder = 'Enter signaling data here...'
    />
    <button
      onClick = { () => p2.signal(signal_input.value) }
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
```

---

Then a function. Let's call it initiate. This is a **little tricky**. Basically it wraps the creation and setup of `p1` peer:

```javascript
initiate = () => {
  p1 = Peer({trickle: false, initiator: true})

  p1.on('signal', (data) => {
    console.log('p1 signal', data)
    update('signal')
    update(JSON.stringify(data))
  })

  // other event handlers...

  p1.on('close', () => {
    update('Connection closed')
    console.log('p1 connection closed')
  })
}
```

---

Now the tricky part. Since it needs to have access to `update` function, we need to define it after the definition of `update`.

```javascript
const update = (message) => {
  // ...
}
initiate = () => {
  // ...
}
```

---

But we call this new `initiate` function inside the `ConnectForm` component, which in turn is called from `Root` component, which in turn is called by `update` function.

```
update -> Root -> ConnectForm -> initiate
  ^                                 |
  '---------------------------------'
```

This is called a circular reference and often poses a difficult problem to solve in software development.

---

For now we will use a little dirty hack. Note that the `initiate` function is not called immediately when the `ConnectForm` is called, but only when user presses a button (i.e. asynchronously).

So we don't actually need it to do anything yet, only to be visible. Let's define the variable before, but instantiate it later:

```javascript
let initiate = null
let signal_input = null
const ConnectForm = () => (
  // ...
)
```

---

That way we have a reference to `initiate` inside the `ConnectForm`, and by the time the user clicks a button, it will already become a function.

This is how **closures** work.

> NOTE: But it's not how they should be used. It's a temporary hack, not a best practice.

---

### HELP! Everything disappeared and I don't see my the button now!

That's because we only call `render` inside `update`, and we only call `update` when the `p1` gets some events. But now the `p1` doesn't even exist until we click a button, and the button doesn't exist until we render it.

This starts to smell like a spaghetti.

---

For now let's just make another quick and dirty hack and call the `update` once right after we start. It expects a string, so let's give it an empty one:

```javascript
const update = (message) => {
  // ...
}
update('')
```

---

Now it should work again.

Try pressing `initiate`, then copy signaling data to the input and press `connect`. Then you should be able to chat with `p2`.

Commit.

---

### Time to banish p2 from our memory

It's no fun talking to ourselves, especially when all we ever answer to ourselves is:

> Fine, thanks. How about you p1?

Instead of keeping second peer in the same process we will connect to another instance of this app and talk to it.

---

First let's make a `connect` function. It will take a signaling data and pass it to `p1`. As with `initiate` we need to make it visible in `ConnectForm`.

```javascript
let initiate = null // This is an ugly hack!
let connect = null
let signal_input = null
const ConnectForm = () => ( ... )
```

---

Then inside `ConnectForm`, instead of calling `p2.signal`, let's call this new function:

```javascript
<button
  onClick = { () => connect(signal_input.value) }
>
  Answer
</button>
```

---

And now time to define the `connect` function. First of all, we do not know if the `p1` is already instantiated. We may have it because `initiate` was called before (in which case `p1` in the initiator of the connection), or maybe we have received a signal from external initiator and need to set up `p1` to accept the signal.

---

We need to check if `p1` is `null` (i.e. it does not exist yet)) in which case we create it and set it's `signal` event handler.

```javascript
connect = (data) => {
  if (p1 === null) {
    p1 = Peer({trickle: false})
    p1.on('signal', (data) => {
      console.log('p1 signal', data)
      update('signal')
      update(JSON.stringify(data))
    })
  }
}
```

> TIP: You can copy and paste the body of if statement from `initiate`. Just remove the initiator: true part.

---

Consider that we only need to set up rest of the events (i.e. `connect`, `message`, `error`, `close`) if the `p1` received a signal from external peer. Otherwise there is no chance for this events to be triggered.

Let's just move those statements from `initiate` to `connect`.

---

```javascript
connect = (data) => {
  // ... if statement
  p1.signal(data)

  p1.on('connect', () => {
    console.log('p1 connected')
    update('connected')
  })
  // ...message and error handlers
  p1.on('close', () => {
    update('Connection closed')
    console.log('p1 connection closed')
  })
}
```
