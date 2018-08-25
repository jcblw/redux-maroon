/*
  Redux Maroon ( Async Middleware Composer )
  -----

  This is a utility that will help create async middleware and embed some best
  practices while using async middleware.
*/

export interface MaroonAction {
  type: string;
  [key: string]: any;
}

export type MaroonHandler = (action: MaroonAction) => Promise<any>;

export interface MaroonCase {
  actions: {
    trigger: string;
    resolve: string;
    reject: string;
    finally: string;
  };
  handler: MaroonHandler;
  shouldThrow: boolean;
}

export type CreateMaroonCase = (
  constant: string,
  handler: MaroonHandler,
  options?: {
    shouldThrow?: boolean;
  }
) => MaroonCase;

export type CreateMaroon = (
  ...cases: MaroonCase[]
) => (
  store: any
) => (
  next: (action: MaroonAction) => void
) => (action: MaroonAction) => void | Promise<any>;

export const createMaroonCase: CreateMaroonCase = (
  constant,
  handler,
  options = {}
) => {
  return {
    actions: {
      trigger: constant,
      resolve: `${constant}_RESOLVE`,
      reject: `${constant}_REJECT`,
      finally: `${constant}_FINALLY`,
    },
    handler,
    shouldThrow: options.shouldThrow || false,
  };
};

export const createMiddlewareCaseHash = cases => {
  return cases.reduce((accum, middlewareCase) => {
    accum[middlewareCase.actions.trigger] = middlewareCase;
    return accum;
  }, {});
};

export const createMaroonError = (
  action: MaroonAction,
  error: Error
): Error => {
  const middlewareError = new Error(
    `Async middleware action ${action.type} was rejected: ${error.message}`
  );
  middlewareError.stack = error.stack;
  return middlewareError;
};

export const createMaroon: CreateMaroon = (...cases) => {
  const handlers = createMiddlewareCaseHash(cases);
  return store => next => action => {
    const middlewareCase = handlers[action.type];
    // next is always called before async action;
    next(action);
    if (middlewareCase) {
      return new Promise(async (resolve, reject) => {
        let response = null;
        let error = null;
        let resolution = resolve;
        try {
          response = await middlewareCase.handler(action);
        } catch (e) {
          error = e;
        }
        if (error) {
          store.dispatch({ type: middlewareCase.actions.reject, error });
          if (middlewareCase.shouldThrow) {
            resolution = reject;
            error = createMaroonError(action, error);
          }
        }
        if (response) {
          store.dispatch({ type: middlewareCase.actions.resolve, response });
        }
        store.dispatch({
          type: middlewareCase.actions.finally,
          error,
          response,
        });
        resolution(error);
      });
    }
  };
};
