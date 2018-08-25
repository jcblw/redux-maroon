import test from 'ava';
import {
  createMaroonCase,
  createMiddlewareCaseHash,
  createMaroonError,
  createMaroon,
} from '../dist';

test('createMaroonCase should return a maroon case spec when called', t => {
  const mockHandler = () => Promise.resolve();
  t.deepEqual(createMaroonCase('FOO', mockHandler), {
    actions: {
      trigger: 'FOO',
      resolve: 'FOO_RESOLVE',
      reject: 'FOO_REJECT',
      finally: 'FOO_FINALLY',
    },
    handler: mockHandler,
    shouldThrow: false,
  });
});

test('createMiddlewareCaseHash should take an arrow of maroon case and turn it into a hash object', t => {
  const mockCases = [createMaroonCase('foo'), createMaroonCase('bar')];
  t.deepEqual(createMiddlewareCaseHash(mockCases), {
    foo: mockCases[0],
    bar: mockCases[1],
  });
});

test('createMaroonError should return an error with the proper stack', t => {
  const mockError = {
    message: 'foo',
    stack: 'bar',
  };
  const mockAction = {
    type: 'baz',
  };
  const maroonError = createMaroonError(mockAction, mockError);
  t.truthy(maroonError.message.match(/foo/g));
  t.truthy(maroonError.message.match(/baz/g));
  t.is(maroonError.stack, mockError.stack);
});

test('createMaroon should return a function', t => {
  const maroonMiddleware = createMaroon(createMaroonCase('foo'));
  t.truthy(typeof maroonMiddleware === 'function');
});

const mockStore = {
  dispatch: () => {},
};

test('maroon middleware should call next function with the action', t => {
  const maroonMiddleware = createMaroon(createMaroonCase('foo'));
  const mockAction = { type: 'bar' };
  const mockNext = action => {
    t.deepEqual(action, mockAction);
  };
  maroonMiddleware(mockStore)(mockNext)(mockAction);
});

test('maroon middleware should return a promise if a case is matched', t => {
  const maroonMiddleware = createMaroon(
    createMaroonCase('foo', () => Promise.resolve())
  );
  const mockAction = { type: 'foo' };
  const mockNext = () => {};
  t.truthy(
    typeof maroonMiddleware(mockStore)(mockNext)(mockAction).then === 'function'
  );
});

test('maroon middleware should dispatch a resolve and finally action with response', async t => {
  t.plan(3);
  const fooCase = createMaroonCase('foo', () => Promise.resolve('bar'));
  const maroonMiddleware = createMaroon(fooCase);
  const mockAction = { type: 'foo' };
  const mockNext = () => {};
  const mockStore = {
    dispatch(action) {
      if (action.type === fooCase.actions.resolve) {
        t.deepEqual(action, { type: fooCase.actions.resolve, response: 'bar' });
      }
      if (action.type === fooCase.actions.finally) {
        t.deepEqual(action, {
          type: fooCase.actions.finally,
          response: 'bar',
          error: null,
        });
      }
    },
  };
  const value = await maroonMiddleware(mockStore)(mockNext)(mockAction);
  t.falsy(value, 'value should not be returned from promise');
});

test('maroon middleware should dispatch a reject and finally action with maroonError', async t => {
  t.plan(3);
  const ogError = new Error('baz');
  const fooCase = createMaroonCase('foo', () => Promise.reject(baz), {
    shouldThrow: true,
  });
  const maroonMiddleware = createMaroon(fooCase);
  const mockAction = { type: 'foo' };
  const mockError = createMaroonError(mockAction, ogError);
  const mockNext = () => {};
  const mockStore = {
    dispatch(action) {
      if (action.type === fooCase.actions.reject) {
        t.truthy(mockError.message, action.error.message);
      }
      if (action.type === fooCase.actions.finally) {
        t.truthy(mockError.message, action.error.message);
      }
    },
  };
  try {
    await maroonMiddleware(mockStore)(mockNext)(mockAction);
  } catch (e) {
    t.truthy(mockError.message, e.message);
  }
});
