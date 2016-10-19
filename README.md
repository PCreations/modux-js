**/!\ DISCLAIMER : `modux-js` is only a proof of concept, there is no tests coverage and it probably won't scale as is. Feedbacks are very welcommed :) **

# [modux-js](https://github.com/PCreations/modux-js)

[![NPM version][npm-image]][npm-url]

`modux-js` is a lightweight framework to seamlessly build modular, composable, encapsulated and fractable redux apps.

`npm install modux-js --save`

The main goal of this project is to let you write vanilla **[redux](http://github.com/reactjs/redux)** and let **modux-js** encapsulate it for you by scoping your actions, reducers, selectors and sagas. Your moduxes are only aware of their own **context**.
Since `modux-js` uses vanilla redux you are totally free to use all the usual and cool stuff :

* [DevTools] & Time Travel (https://github.com/zalmoxisus/redux-devtools-extension)
* Immutable state
* Easy unit testing

## What is a modux ?

A **modux** is a redux module that exposes scoped reducers, actions, sagas, selectors and views by knowing only its own context.  Moduxes are built from **moduxFactory** objects that gives them context at runtime.

## How does it work ?

`modux-js` lets you write factories to instanciate moduxes given certain specifications. It's heavily based on modux composition.
Moduxes are added in each other through a `context` that represents the root of their own moduxes tree.
Each modux instance is given an unique id. This id is saved in an adjacency map which is use to store the moduxes tree.
Actions are populated with the id of the modux that has initiated them under the key : `meta.__modux__.id`.
A higher order reducer then use this `meta` property to correctly reduce the action for the correct reducer with a simple heuristic : action is reduced if she's coming from me or one of my modux children.

Seem's complicated ? Let's take a very basic example.


## A basic counter example

First, let's create a `counter.js` file and write in it what we are used to write when working with redux (i.e, reducer, actions, views, etc.)

```
import React from 'react'
import connect from 'react-redux'

// action types
const types = {
  INCREMENT: 'modux-js-example-counter/INCREMENT'
}

// action creators
const increment = (amount) => ({
  type: types.INCREMENT,
  payload: { amount }
})

// a simple selector
const getValue = (state) => state.value

// a very simple reducer
const reducer = (value = 0, action = {}) => {
  if (action.type === types.INCREMENT) {
    return value += action.payload.amount
  }
  return { value }
}

// the view
const Counter = ({ value }) => (
  <p>{`counter value : ${value}`}</p>
)

const CounterContainer = connect(
  state => ({
    value: getValue(state)
  })
)(Counter)
```

It's a very basic counter example, it's pure vanilla redux, **and we are assuming that the counter's reducer will be mounted at the root of our store**. Our state will have this shape :
```
state = {
  value: 42
}
```

If we want to add another counter or even mount it in another place, we're stuck. What we want to do is **considering this module as a standalone module with it's own state slice automatically binded**. It's exactly what **moduxFactory** is made for.

Let's put aside the `counter.js` file for now and create a brand new `counter-modux-factory.js` file (the name actually doesn't matter) :

*counter-modux-factory.js*
```
import moduxFactory from 'modux-js'

export default moduxFactory(/* TODO */)
```

So, our `counter-modux-factory.js` file exports a `moduxFactory` but we need to tell it how to build our `counter` modux. `moduxFactory` takes only one argument : a function that returns the specifications for building our modux. Don't be afraid, is very simple, let's move one step further:

*counter-modux-factory.js*
```
import moduxFactory from 'modux-js'

const getCounterSpecifications = () => { /* TODO */ }

export default moduxFactory(getCounterSpecifications)
```

The `getCounterSpecifications` (the name is pretty verbose but it's for the sake of the example) must return an object with this shape :

*counter-modux-factory.js*
```
import moduxFactory from 'modux-js'

const getCounterSpecifications = () => ({
  actions: {},  // an object defining action creators for this modux
  selectors: {},  // selectors used by this modux to select it's own state
  initReducer: () => ()  // a function that return a reducer for this modux
  initSaga: () => ()  // a function that return the root saga for this modux
  initView: () => ()  // a function that return the views for this modux
})
export default moduxFactory(getCounterSpecifications)
```

You can see the specifications object returned by `getCounterSpecifications`  from being sort of class declaration if you find it easier to reason about. Let's populate that by injecting the code we have in our `counter.js` file :

*counter-modux-factory.js*
```
import moduxFactory from 'modux-js'

export const init = (value) => { value }

const defaultInitialState = init(0)

const getCounterSpecifications = () => ({
  actions: {
    increment(amount) {
      return {
        type: types.INCREMENT,
        payload: { amount }
      }
    }
  },
  selectors: {
    getValue(state) {  // here, state represents our "local" state, not the whole redux state
      return state.value
    }
  },
  initReducer(initialState = defaultInitialState) {  // initReducer receives the initialState potentially provided when instanciating this modux from inside your app
    const reducer = (state = initialState, action = {}) => {
      if (action.type === types.INCREMENT) {
        return {
          ...state,
          value: state.value += action.payload.amount
        }
      }
      return state
    }
    return reducer
  },
  initView({ selectors, actions }) {  // initView receives scoped selectors and actions as arguments. They are automatically scoped to wherever this modux has been mounted inside your app
    const Counter = ({ value }) => (
      <p>{`counter value : ${value}`}</p>
    )

    const CounterContainer = connect(
      state => ({
        value: getValue(state)
      })
    )(Counter)
  }
})

export default moduxFactory(getCounterSpecifications)
```

That's it ! We encapsulated our vanilla counter redux module into a `moduxFactory`.  `moduxFactory` returns a function  that you can use to instantiate a `modux` given a mount point in the state and an initial state. Let's create a `root.js` file to do that :

*root.js*
```
import counterModuxFactory, { init as initCounter } from './counterModuxFactory'

const root = counterModuxFactory('counter', initCounter(42))
// the counterModux instantiated is our root, it's mounted
// at 'counter' key in our state with an initial value of 42
// the resulting state shape is :
// {
//   counter: {
//     value: 42
//   }
// }
//

export default root
```

No we just need to let redux knows about the counter reducer. We need to do that as we used to do, in a `configureStore.js` file for example :

*configureStore.js*
```
import { createStore, applyMiddleware, compose, combineReducers } from 'redux'

import root from './root'
import DevTools from './DevTools'


export default function configureStore(initialState) {

    const store = createStore(
      root.reducer,  // the counterModux instance exported from root.js exposes the reducer
      initialState,
      applyMiddleware(
        createLogger()
      )
    )

    return store
}
```

As you can see, the `counterModux` instance exported from `root.js` exposes the reducer. Each instantiated modux exposes few properties :

* `reducer` : the modux instance reducer (if `initReducer` function is present in the modux specs)
* `actions` : the modux instance action creators (if present in the modux specs)
* `selectors` : the modux instance selectors (if present in the modux specs)
* `saga` : the modux instance root saga (if `initSaga` function is present in the modux specs)
* `view` : the modux instance views returned from `initView` function if present in the modux specs

In real project, you'll only need to manually instantiate a modux like this for the root of your application. Others moduxes will be composed inside other moduxes. This introduces the notion of `context` that we are going to talk about soon.


## More realistic example

We're going to create [this](https://pcreations.github.io/modux-js-examples/). Before diving into the code, let's see what are the different components here.

First, we have a basic togglable on/off button :
![button off](http://imageshack.com/a/img923/4551/cNLi7r.png) ![button on](http://imageshack.com/a/img921/5531/h1kaJx.png)

Just bellow the button there is a counter value component that just displays its value:
![counter value](http://imageshack.com/a/img923/5540/slWrOh.png)

We also have a gif viewer component that given a topic will fetch random gif on giphy when the "more please" button is clicked :
![high five gif viewer](http://imageshack.com/a/img922/9703/qdsys7.png)

Bellow there is a gif viewer pair box :
![gif viewer pair](http://imageshack.com/a/img921/3996/9tocsU.png)
This box contains two gif viewers with the subtle addition of a "Load both !" button that load both gifs

Then we have a pair of gif viewer pair boxes :
![pair of gif viewers pair](http://imageshack.com/a/img921/6081/8SgR9n.png)
This box contains two gif viewer pairs and a "Load all of them !" button to load them all.

The last part of this page contains an input to generate gif viewers on the fly. Just enter any topic you want a gif viewer for, press enter, and a new gif viewer for this topic appears :
![dogs gif viewer](http://imageshack.com/a/img921/5725/7DDbI3.png)

That's the result of a challenge initiated by [Sébastien Lorber](https://github.com/slorber) in his repo [Scalable frontend, with Elm or Redux](https://github.com/slorber/scalable-frontend-with-elm-or-redux). I just copy-paste the challenge here :

> # Specification
>
> It is based on the famous RandomGif (
> [JS](https://github.com/jarvisaoieong/redux-architecture) /
> [Elm](https://github.com/evancz/elm-architecture-tutorial) example
> that is often used to showcase Elm architecture.
>
> The app should have:
>
> #### 1) A NewGif component used multiple times:
>
> NewGif is the original example component. It is used multiple times
> inside the app at different places. All the instances are not
> necessarily close to each others in the DOM tree.
>
> - A top-level RandomGif issuing actions like: `APP_UPDATED > ... > TOP_LEVEL_RANDOM_GIF_UPDATED > NEW_GIF`
>
> - A pair of RandomGif issuing actions like: `APP_UPDATED > ... > RANDOM_GIF_PAIR > FIRST_RANDOM_GIF_UPDATED  > NEW_GIF`
>
> - A pair of pair of RandomGif issuing actions like  `APP_UPDATED > ... > RANDOM_GIF_PAIR_OF_PAIR_UPDATED > FIRST_RANDOM_GIF_PAIR_UPDATED > FIRST_RANDOM_GIF_UPDATED  > NEW_GIF`
>
>
> #### 2) A button
>
> The button can be active or inactive. It is green when active and red
> when inactive. Clicking on it toggles its active state (default is
> inactive).
>
> #### 3) A counter value
>
> The counter value should be incremented everytime a `NEW_GIF` action
> is fired from any NewGif component, no matter the nesting, but the
> incrementation amount is not fixed.
>
> **Business rule**:  ``` if ( ( counter >= 10 ) && ( buttonState === "active" ) ) {    increment by 2  }  else {    increment by 1  } ```
>
> #### 4) The app should focus maintainability / scalability / decoupling
>
> Somehow this problem is easy to solve in a way that creates a lot of
> coupling between components.
>
> The 3 components (NewGif/Counter/Button) should be decoupled and not
> see each others in any way.  They can't import stuff from each others.
> Ideally, in a JS based solutions, one could be able to publish each 3
> components in separate NPM packages that don't depend on each others.
>
> The aim of decoupling the components is that a team can take ownership
> of each component. Then another team is responsible of making all the
> components work nicely together, and you already have split the work
> into 4 teams.
>
> For example, the NewGif component should not be aware of the presence
> of the existance of a counter, deeply hidden in a little stats popup
> of our app. If this counter had to be removed by the business, it's
> place in dom tree updated, or it's business rule be changed, the team
> maintaining the NewGif widget should rather not have to know about
> that.
>
> It should also be easy to move the position of components. For example
> imagine the button is top left of your app, and the business now wants
> it inside a popup, bottom right: this move of component in the tree
> should rather be easy to make (ie without having to modify all parent
> components, for example).

Let's implement that :

### The counter modux

This one sounds familiar, we just need to take the code from above (with some subtle changes such as returning from reducer the value directly instead of `{ value }`, for brevity) :

*counter.js*
```
import React from 'react'
import { connect } from 'react-redux'
import moduxFactory from 'modux-js'

export const types = {
  INCREMENT_COUNTER: 'modux-js-examples/counter/INCREMENT_COUNTER'
}

export const init = value => value

const defaultInitialState = init(42)

export default moduxFactory(context => {
  return {
    initReducer(initialState = defaultInitialState) {
      const value = (value = initialState, action = {}) => {
        if (action.type === types.INCREMENT_COUNTER) {
          return value += action.payload.amount
        }
        return value
      }
      return value
    },
    actions: {
      increment(amount) {
        return {
          type: types.INCREMENT_COUNTER,
          payload: { amount }
        }
      }
    },
    selectors: {
      getValue(value) {
        return value
      }
    },
    initView({ actions, selectors }) {
      const Counter = ({ value }) => (
        <div>
          <span>Value : { value }</span>
        </div>
      )
      const CounterContainer = connect(
        state => ({
          value: selectors.getValue(state)
        })
      )(Counter)
      return CounterContainer
    }
  }
})
```

### The button modux

This one is also pretty straightforward :

*button.js*
```
import React from 'react'
import { connect } from 'react-redux'
import { combineReducers } from 'redux'
import moduxFactory from 'modux-js'

export const types = {
  TOGGLE_BUTTON: 'modux-js-examples/button/TOGGLE_BUTTON'
}

export const init = (active) => active

const defaultInitialState = init(false)

export default moduxFactory((context) => {
  return {
    actions: {
      toggleButton() {
        return {
          type: types.TOGGLE_BUTTON
        }
      }
    },
    selectors: {
      isActive(active) {
        return active
      }
    },
    initReducer(initialState = defaultInitialState) {
      const active = (active = initialState, action = {}) => {
        if (action.type == types.TOGGLE_BUTTON) {
          return !active
        }
        return active
      }
      return active
    },
    initView({ actions, selectors }) {
      const Button = ({ active, toggle }) => (
        <div>
          <button onClick={toggle}>{ active ? 'ON' : 'OFF' }</button>
        </div>
      )
      const ButtonContainer = connect(
        state => ({
          active: selectors.isActive(state)
        }),
        dispatch => ({
          toggle() {
            dispatch(actions.toggleButton())
          }
        })
      )(Button)
      return ButtonContainer
    }
  }
})

```

### The gif-viewer modux

This one is very interesting. We need to handle asynchronous fetching of a gif for a given topic. `modux-js` handles side effects through [`redux-saga`](https://github.com/yelouafi/redux-saga).

Let's start by the simplest part :

*gif-viewer.js*
```
import React from 'react'
import { combineReducers } from 'redux'
import { connect } from 'react-redux'
import moduxFactory from 'modux-js'

export const types = {
  REQUEST_MORE: 'modux-js-examples/gif-viewer/REQUEST_MORE',
  RECEIVE_GIF: 'modux-js-examples/gif-viewer/RECEIVE_GIF'
}
export const init = (topic) => ({
  url: null,
  topic
})

const defaultInitialState = init('funny cats')

export default moduxFactory(context => ({
  actions: {
    requestMore: () => ({
      type: types.REQUEST_MORE,
    }),
    receiveGif: (gif) => ({
      type: types.RECEIVE_GIF,
      payload: { gif }
    })
  },
  selectors: {
    getUrl(state) {
      return state.url
    },
    getTopic(state) {
      return state.topic
    }
  },
  initReducer(initialState = defaultInitialState) {
    const url = (url = initialState.url, action = {}) => {
      switch (action.type) {
        case types.REQUEST_MORE:
          return null
        case types.RECEIVE_GIF:
          return action.payload.gif
        default:
          return url
      }
    }

    const topic = (topic = initialState.topic) => topic  // not mutable

    return combineReducers({
      url,
      topic
    })
  },
  initSaga() {
    /* TODO */
  },
  initView() {
    /* TODO */
  }
}))

```
So far so good, our `gif-viewer` modux is ready to reduce futures `REQUEST_MORE` and `RECEIVE_GIF` actions. It's just vanilla redux.

Let's move one step further and add the `fetchGif` effect :

*gif-viewer.js*
```
import React from 'react'
import { combineReducers } from 'redux'
import { connect } from 'react-redux'
import moduxFactory from 'modux-js'
import fetch from 'isomorphic-fetch'  // don't forget this import statement

const fetchGif = (topic) =>
  fetch(`https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=${topic}`)
  .then(res => res.json())
  .then(body => typeof body.data === 'undefined' ? '' : body.data.image_url)
[...]
```

We now need to write the saga that will :

 - waits for a `REQUEST_MORE` action
 - selects the topic from the state
 - calls `fetchGif` to fetch a gif for this topic
 - puts a `RECEIVE_GIF` action with the gif url as payload

Here we are :

*gif-viewer.js*
```
import React from 'react'
import { take, put, call, fork, select } from 'redux-saga/effects'  // don't forget these imports
import { combineReducers } from 'redux'
import { connect } from 'react-redux'
import moduxFactory from 'modux-js'

[...]

export default moduxFactory(context => ({
  [...]
  initSaga({ takeLocal, selectors, actions }) {
    function *requestMoreSaga(topic) {
      try {
        const topic = yield select(selectors.getTopic)
        const gif = yield call(fetchGif, topic)
        yield put(actions.receiveGif(gif))
      } catch (error) {
        console.error(error)
      }
    }

    function *requestMoreWatcher() {
      while (true) {
        yield takeLocal(types.REQUEST_MORE)
        yield call(requestMoreSaga, topic)
      }
    }

    return requestMoreWatcher
  },
  [...]
}))

```

`initSaga()` function is given an object as a parameter with these keys

 - `selectors`: the selectors scoped to this current modux instance
 - `actions` : the action creators scoped to this current modux instance
 - `takeLocal` : exactly the same than [`take`](http://yelouafi.github.io/redux-saga/docs/api/index.html#takepattern) from `redux-saga` excepted that, as the name suggests it, **will only `take` the actions coming from this modux instance and its children** (more on that later).

Now we can write the missing `initView` function :

*gif-viewer.js*
```
[...]

export default moduxFactory(context => ({
  [...]
  initView({ actions, selectors }) {
    const Gif = ({ topic, url }) => (
      url ? (
        <img src={url} width={200} height={200} />
      ) : (
        <p>{'loading...'}</p>
      )
    )
    const RandomGif = ({ topic, url, requestMore }) => (
      <div style={{ width: '200px', display: 'inline-block' }}>
        <h2 style={{ width: '200px', textAlign: 'center' }}>{topic}</h2>
        <Gif topic={topic} url={url}/>
        <button onClick={() => requestMore(topic)}>More please!</button>
      </div>
    )
    const GifViewer = connect(
      state => ({
        url: selectors.getUrl(state),
        topic: selectors.getTopic(state)
      }),
      dispatch => ({
        requestMore(topic) {
          dispatch(actions.requestMore(topic))
        }
      })
    )(RandomGif)

    return GifViewer
  }
}))

```

### The gif-viewer-pair modux : introduction moduxes composition

Moduxes composition is at the heart of `modux-js`. We are going to discover that by implementing the `gif-viewer-pair` modux. Let's start by some boilerplate :

*gif-viewer-pair.js*
```
import React from 'react'
import { connect } from 'react-redux'
import { put, call } from 'redux-saga/effects'  // we are going to need these effects
import moduxFactory from 'modux-js'

import gifViewerFactory, { init as initGifViewer } from '../gif-viewer'

export default moduxFactory(context => {
  return {
    actions: {
      /* TODO */
    },
    initSaga() {
      /* TODO */
    },
    initView() {
      /* TODO */
    }
  }
})

```
One thing that might surprise you is there is no `initReducer` function in this boilerplate. More on that later, keep on.

What we want to do is adding to our `gif-viewer-pair` modux specifications that we want two `gif-viewer` moduxes instance in each `gif-viewer-pair` modux instance. Remember how we instantiated the `counter` modux earlier for the first example ? We might be tempted to do something like this :

*gif-viewer-pair.js*
```
import React from 'react'
import { connect } from 'react-redux'
import { put, call } from 'redux-saga/effects'  // we are going to need these effects
import moduxFactory from 'modux-js'

import gifViewerFactory, { init as initGifViewer } from '../gif-viewer'

export default moduxFactory(context => {
  const leftGifViewer = gifViewerFactory('left')  // don't do this
  const rightGifViewer = gifViewerFactory('right')  // don't do this
  return {
    actions: {
      /* TODO */
    },
    initSaga() {
      /* TODO */
    },
    initView() {
      /* TODO */
    }
  }
})

```

It's convenient to manually instantiate a modux when we know it's the root of our application (i.e, it's reducer is mounted at the root of our state).
Here, since the `gif-viewer-pair` modux can be instantiated (and thus mounted) anywhere from within our app, we can't instantiate the `gif-viewer` moduxes like this. We need a way to add them to our own root, **to our own `context`.**

#### the `context` object

The `context` object is an interface to the own root of an instantiated modux. It lets you add other moduxes as child of this one and retrieve their views, actions, selectors, sagas, etc.

 - `context.add(moduxFactory, mountPoint, initialState)` : adds a modux instance generated from `moduxFactory` params, mounted at `mountPoint` with some optionnal `initialState`
 - `context.getView(mountPoint)` : retrieves the views from the modux instantiated at the given `mountPoint`
 - `context.getActions(mountPoint)`: retrieves the action creators from the modux instantiated at the given `mountPoint`
 - `context.getSelectors(mountPoint)` : retrieves the selectors from the modux instantiated at the given `mountPoint`
 - `context.getSaga(mountPoint)`: retrieves the root saga from the modux instantiated at the given `mountPoint`
 - `context.getInitialState(defaultInitialState)`: retrieves the initial state given to this modux instance. Defaults to `defaultInitialState`.

Here we need the `context.add` method :

*gif-viewer-pair.js*
```
import React from 'react'
import { connect } from 'react-redux'
import { put, call } from 'redux-saga/effects'  // we are going to need these effects
import moduxFactory from 'modux-js'

import gifViewerFactory, { init as initGifViewer } from '../gif-viewer'

export default moduxFactory(context => {
  context.add(gifViewerFactory, 'left')
  context.add(gifViewerFactory, 'right')
  return {
    actions: {
      /* TODO */
    },
    initSaga() {
      /* TODO */
    },
    initView() {
      /* TODO */
    }
  }
})

```

When adding moduxes in context via `context.add`, `modux-js` knows how to combine the children's reducers thanks to the mount points given. That's why we don't need to write `initReducer` function here since we have nothing to reduce that's inherently relative to `gif-viewer-pair` itself.

Let's write our view now :

*gif-viewer-pair.js*
```
import React from 'react'
import { connect } from 'react-redux'
import { put, call } from 'redux-saga/effects'  // we are going to need these effects
import moduxFactory from 'modux-js'

import gifViewerFactory, { init as initGifViewer } from '../gif-viewer'

export default moduxFactory(context => {
  context.add(gifViewerFactory, 'left')
  context.add(gifViewerFactory, 'right')
  return {
    actions: {
      /* TODO */
    },
    initSaga() {
      /* TODO */
    },
    initView() {
      const LeftGifViewer = context.getView('left')
      const RightGifViewer = context.getView('right')
      const GifViewerPair = () => (
        <div style={{ border: '2px solid black', width: '500px', display: 'inline-block' }}>
          <LeftGifViewer/>
          <RightGifViewer/>
        </div>
      )
      return GifViewerPair
    }
  }
})

```

That's it, all we have to do is to retrieve the view for the `gif-viewer` mounted to `left` and the view for the one mounted to `right`. How beautiful is that ?

#### Handling the "load both !" action

The last part of the `gif-viewer-pair` modux is to be able to load both its `gif-viewer`s moduxes when user clicks on a "load both !" button. First, we need to create a specific action creator :

*gif-viewer-pair.js*
```
[...]
export const types = {
  LOAD_BOTH: 'modux-js-examples/gif-viewer-pair/LOAD_BOTH'
}

export default moduxFactory(context => {
  [...]
  return {
    actions: {
      loadBoth() {
        return {
          type: types.LOAD_BOTH
        }
      }
    },
    [...]
  }
})

```

Pretty straightforward, let's implement the `initSaga` function now. The root saga of our `gif-viewer-pair` should :

 - takes the `LOAD_BOTH` action
 - puts the `REQUEST_MORE` action of the left and right `gif-viewer`s.

*gif-viewer-pair.js*
```
[...]

export default moduxFactory(context => {
  [...]
  return {
    initSaga({ takeLocal }) {
      function *loadBoth() {
        yield put(context.getActions('left').requestMore())
        yield put(context.getActions('right').requestMore())
      }

      function *watchForLoadBoth() {
        while (true) {
          yield takeLocal(types.LOAD_BOTH)
          yield call(loadBoth)
        }
      }

      return watchForLoadBoth
    },
    [...]
  }
})

```

All we have to do is to `put` the `requestMore()` action that is part of public API of our `gif-viewer` moduxes. That's it ! Nothing more to do.


### The gif-viewer-pair-pair modux

Nothing new here, it's the same principles that above excepted that we npw `put` the `loadBoth` actions of `gif-viewer-pair` moduxes when we want to "load them all !" :

*gif-viewer-pair-pair*
```
import React from 'react'
import { connect } from 'react-redux'
import { put, call } from 'redux-saga/effects'
import moduxFactory from 'modux-js'

import gifViewerPairFactory, { init as initGifViewerPair } from '../gif-viewer-pair'

export const types = {
  LOAD_BOTH: 'modux-js-examples/gif-viewer-pair-pair/LOAD_BOTH'
}

export const init = ([left1, right1], [left2, right2]) => ({
  left: initGifViewerPair(left1, right1),
  right: initGifViewerPair(left2, right2)
})

const defaultInitialState = init(['aliens', 'babies'],['cars', 'planes'])

export default moduxFactory(context => {
  context.add(gifViewerPairFactory, 'left', context.getInitialState(defaultInitialState).left)
  context.add(gifViewerPairFactory, 'right', context.getInitialState(defaultInitialState).right)
  return {
    actions: {
      loadBoth() {
        return {
          type: types.LOAD_BOTH
        }
      }
    },
    initSaga({ takeLocal }) {
      function *loadBoth() {
        yield put(context.getActions('left').loadBoth())
        yield put(context.getActions('right').loadBoth())
      }

      function *watchForLoadBoth() {
        while (true) {
          yield takeLocal(types.LOAD_BOTH)
          yield call(loadBoth)
        }
      }

      return watchForLoadBoth
    },
    initView({ actions }) {
      const LeftGifViewerPair = context.getView('left')
      const RightGifViewerPair = context.getView('right')
      const GifViewerPairPair = ({ loadBoth }) => (
        <div style={{ border: '3px solid red' }}>
          <LeftGifViewerPair/>
          <RightGifViewerPair/>
          <p>
            <button onClick={loadBoth}>Load all of them !</button>
          </p>
        </div>
      )

      return connect(
        null,
        dispatch => ({
          loadBoth() {
            dispatch(actions.loadBoth())
          }
        })
      )(GifViewerPairPair)
    }
  }
})

```

### Implementing the counter that increments for each new gif requested

Remember our initial specifications for this challenge ?

> The counter value should be incremented everytime a `NEW_GIF` action
> is fired from any NewGif component, no matter the nesting, but the
> incrementation amount is not fixed.
>
> **Business rule**:  
> ```
> if ( ( counter >= 10 ) && ( buttonState === "active" ) ) {
>   increment by 2
> }  else {
>   increment by 1
> }
>  ```

*Note : In our case the `NEW_GIF` action is the `RECEIVE_GIF` action.*

We'll need both the state of the `counter` modux and the `button` modux. Let's create a new (*with a very verbose name*) modux :

*new-gif-counter-and-button.js*
```
import { take, put, select } from 'redux-saga/effects';
import moduxFactory from 'modux-js'

import { types as gifViewerTypes } from './gif-viewer';
import buttonModux, { types as buttonTypes } from './button';
import counterModux, { init as initCounter } from './counter';

export default moduxFactory(context => {
  context.add(counterModux, 'counter', initCounter(0))
  context.add(buttonModux, 'button')
  return {
    initSaga() {
      function *watchForNewGif() {
        while (true) {
          yield take(gifViewerTypes.RECEIVE_GIF)
          const isButtonActive = yield select(context.getSelectors('button').isActive)
          const counterValue = yield select(context.getSelectors('counter').getValue)
          const amount = counterValue >= 10 && isButtonActive ? 2 : 1
          yield put(context.getActions('counter').increment(amount))
        }
      }
      return watchForNewGif
    },
    initView() {
      return {
        Counter: context.getView('counter'),
        Button: context.getView('button')
      }
    }
  }
})
```
This time, we don't use `takeLocal` because we want to catch all the `RECEIVE_GIF` actions.

Notice also how we return an object from `initView` method instead of a React component. Nothing prevents you to do that, you're totally free. Here we are returning two views because we don't want to tie together the `counter`'s view and the `button`'s view. We want to be free to place them anywhere we want in the DOM.

### The gif-viewer-list modux : dynamically generated moduxes

The last part of this example is the `gif-viewer-list` modux that should create moduxes on the fly. It's a great exercice, you already know all you need to know to implement it. Just a few hints :

 - You'll need two modux factories : one for handling the `gif-viewer` list, and another one that encapsulates this one and the specific logic associated with it (such as using the input value to generate the list)
 - You'll need two actions : one for initiating the creation of the new modux, and another one to indicate that the modux has been instanciated
 - Use a saga that responds to the action that request a new modux,  generates an unique id of your choice, instanciates the new modux via `context.add()` with a mount key corresponding to the unique id, forks the saga of the instanciated modux and the puts the action indicating the modux has been created

Have fun :) !

[Here's is a possible solution](https://github.com/PCreations/modux-js-examples/blob/master/src/gif-viewer-list/index.js)

### Putting it all together

To tie it all together, we just need to create some *root.js* (again, the name doesn't matter) that add all these moduxes in it's own context :

*root.js*
```
import React from 'react'
import moduxFactory from 'modux-js'

import newGifCounterAndButtonModux from './newGifCounterAndButton';
import gifViewerModux, { init as initGifViewer, types as gifViewerTypes } from './gif-viewer';
import gifViewerPairModux, { init as initGifViewerPair } from './gif-viewer-pair';
import gifViewerPairPairModux, { init as initGifViewerPairPair } from './gif-viewer-pair-pair';
import giViewerList from './gif-viewer-list';

export default moduxFactory(context => {
  context.add(newGifCounterAndButtonModux, 'newGifCounterAndButton')
  context.add(gifViewerModux, 'gifViewer', initGifViewer('high five'))
  context.add(gifViewerPairModux, 'gifViewerPair', initGifViewerPair('jugding you', 'bored'))
  context.add(gifViewerPairPairModux, 'gifViewerPairPair', initGifViewerPairPair([
    'annoyed',
    'unsure'
  ],[
    'terrified',
    'excited'
  ]))
  context.add(giViewerList, 'gifViewerList')
  return {
    initView() {
      const {
        Button,
        Counter: NewGifCounter
      } = context.getView('newGifCounterAndButton')
      const GifViewer = context.getView('gifViewer')
      const GifViewerPair = context.getView('gifViewerPair')
      const GifViewerPairPair = context.getView('gifViewerPairPair')
      const GifViewerList = context.getView('gifViewerList')
      return () => (
        <div>
          <div>
            <Button/>
          </div>
          <div>
            <NewGifCounter/>
          </div>
          <h1>Random gifs</h1>
          <div>
            <GifViewer/>
          </div>
          <hr/>
          <h1>Random Gif Pair</h1>
          <GifViewerPair/>
          <hr/>
          <h1>Random Gif Pair Pair</h1>
          <GifViewerPairPair/>
          <hr/>
          <h1>Dynamic list of Gif Viewers</h1>
          <GifViewerList/>
        </div>
      )
    }
  }
})()  // we directly export an instantiated modux, not the factory, since there is only one root

```

Now we need to tell redux about the `root` reducer and saga as we are accustomed to do it :

*in some configureStore.js file*
```
import { createStore, applyMiddleware, compose, combineReducers } from 'redux'
import createSagaMiddleware from 'redux-saga'
import createLogger from 'redux-logger'

import root from './root'

export default function configureStore(initialState) {

    const store = createStore(
      root.reducer,  // the root reducer
      initialState,
      compose(
        applyMiddleware(
          sagaMiddleware,
          createLogger()
        ),
        DevTools.instrument()
      )
    )

    sagaMiddleware.run(root.saga)  // the root saga

    return store
}

```

And finally, in your react entry point :
```
import React from 'react';
import { Provider } from 'react-redux'
import ReactDOM from 'react-dom';
import root from './root';
import configureStore from './configureStore'

const store = configureStore()
ReactDOM.render(
  <Provider store={store}>
    <root.view />
  </Provider>,
  document.getElementById('root')
);
```

### Debugging

Since this library is just a POC for the moment, a global variable `ModuxRegistry` is exported. The most useful part is the method to log the moduxes tree in the console by calling `ModuxRegistry.__debug__.logTree()`. For the example above it prints :
```
root | 1
├─┬ newGifCounterAndButton | 2
│ ├── counter | 3
│ └── button | 4
├── cats | 5
├─┬ gifViewerPair | 6
│ ├── left | 7
│ └── right | 8
├─┬ gifViewerPairPair | 9
│ ├─┬ left | 10
│ │ ├── left | 11
│ │ └── right | 12
│ └─┬ right | 13
│   ├── left | 14
│   └── right | 15
└─┬ gifViewerList | 16
  └─┬ gifViewers | 17
    └── gifViewer1 | 18
```

The label is the mount key given at instantiation (by `context.add`). The number is the modux id (it's just a `lodash.uniqueid` one for the moment).

### A word on action types

Action types are **NOT** scoped to the modux. I wanted to avoid action namespacing to be able to simply catch global actions. I prefer to name my action type with a scoped name, as we are accustomed to do in vanilla flux.

[npm-image]: https://img.shields.io/npm/v/modux-js.svg?style=flat-square
[npm-url]: https://npmjs.org/package/modux-js
