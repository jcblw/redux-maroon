# Redux Maroon

[![Build Status](https://travis-ci.org/jcblw/redux-maroon.svg?branch=master)](https://travis-ci.org/jcblw/redux-maroon)

Middleware creator that allows you to generate async code and maroon it into middleware so it does not effect your application code.

## Why

There are many ways to handle async processes in Redux and this is just another alternative. This is all promise based so you can use it with async/await and it make handing async calls pretty. It also try to force some good patterns by only exposing data over certain methods.

## Install

```shell
npm i redux-maroon
# or
yarn add redux-maroon
```

## Usage

Everything is functions! You just need to create a _case_ which is just a function to handle a certain action type. Then pass that case the _createMaroon_ function. A piece of middleware will be returned.

### Creating middleware

```javascript
// my-middleware.js
import { createMaroonCase, createMaroon } from 'redux-maroon';

export const fooCase = createMaroonCase('FOO', () => api.get('/foo'));
export const barCase = createMaroonCase('BAR', () => api.get('/bar'));
export const myMiddleware = createMaroon(fooCase);
```

### Adding to redux store

Then attach it to your redux store.

```javascript
// my-store.js
import { myMiddleware } from './my-middleware';
...
createStore(
  rootReducer,
  initialState,
  applyMiddleware(
    myMiddleware,
  )
);
...
```

Now calling an action that triggers _`FOO`_ will trigger our `api.get` method. The action will also return a promise but the response is only dispatched in actions.

### Setting up reducer

Maroon will create a few new actions based off of the initial action type given to a _case_. If you pass _FOO_ as your action type, Maroon will create _FOO_RESOLVE_, _FOO_REJECT_, and _FOO_FINALLY_,

```javascript
import { fooCase } from './my-middleware';

export const myReducer = (state = initialState, action) => {
  switch (action.type) {
    // maroon pass through all actions so you can handle initial states
    case fooCase.action.trigger: // FOO
      return {
        ...state,
        loading: true,
      };
    case fooCase.action.resolve: // FOO_RESOLVE
      return {
        ...state,
        response: action.response,
        loading: false,
      };
    case fooCase.action.reject: // FOO_REJECT
      return {
        ...state,
        error: action.error,
        loading: false,
      };
    // or alternatively use finally since finally is always called
    case fooCase.action.finally: // FOO_FINALLY
      return {
        ...state,
        response: action.response,
        error: action.error,
        loading: false,
      };
    default:
      return state;
  }
};
```

## Terminology

### Maroon

Maroon is just middleware. The term maroon is used to denote that the code is meant to be pushed away from other part of your application of code.

### Case

A case is like a case in a case/switch statement. A case is just an interface for Maroon to consume. Here is what the interface is.

```typescript
export type MaroonHandler = (action: any) => Promise<any>;

export interface MaroonCase {
  actions: {
    trigger: string;
    resolve: string;
    reject: string;
    finally: string;
  };
  handler: MaroonHandler;
}
```

## Why not use...

### Sagas

Sagas are great and have filled this void for a long time, but they use generators under the hood. Generators have more of a learning curve over promises or async/await. You should look into sagas if you need to.

- pause or cancel async actions

### Thunks/Promise Middleware

These are great pieces of middleware and have their purpose. The are very universal and allow consumers of them to do just about anything. This can lead to some patterns that lead to applications to do things like: data processing logic, specific api error handling, and promise resolving in components. On the surface these are not terrible patterns but can lead to fragmented information and silo'd data.
