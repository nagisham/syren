import { Lambda } from '@nagisham/standard';

type Type = string | number | symbol;

export interface State<STATE, API = unknown> {
  get: <TYPE extends keyof STATE>(type: TYPE) => Array<(args: STATE[TYPE], api: API) => void>;
  set: <TYPE extends keyof STATE>(
    type: TYPE,
    handlers: Array<(args: STATE[TYPE], api: API) => void>,
  ) => void;
}

export type HandlersState<STATE, API = any> = {
  [TYPE in keyof STATE]?: Array<(args: STATE[TYPE], api: API) => void>;
};

export function handlers_state<STATE>(default_type?: Type): State<STATE> {
  const state: HandlersState<STATE> = {};

  const get = <TYPE extends keyof STATE>(type: TYPE) => {
    const key = (default_type ?? type ?? 'default') as TYPE;
    return (state[key] ??= []);
  };

  const set = <TYPE extends keyof STATE>(
    type: TYPE,
    handlers: Array<(args: STATE[TYPE], api: any) => void>,
  ) => {
    const key = (default_type ?? type ?? 'default') as TYPE;
    state[key] = handlers;
  };

  return { get, set };
}

export type Runner<
  STATE,
  API,
  PARAMS extends any[],
  RETURNS extends { [KEY in keyof STATE]: any },
> = <TYPE extends keyof STATE>(
  handlers: Array<(args: STATE[TYPE], api: API) => void>,
  ...params: PARAMS extends [] ? [args: STATE[TYPE]] : PARAMS
) => RETURNS[TYPE];

interface EventRunnerOptions<STATE, PARAMS extends any[]> {
  request?: (<TYPE extends keyof STATE>(...params: PARAMS) => STATE[TYPE]) | undefined;
  midleware?:
    | (<TYPE extends keyof STATE>(
        handler: (args: STATE[TYPE], api: void) => void,
        arg: STATE[TYPE],
        api: void,
      ) => void)
    | undefined;
}

function forward_params_as_args<TYPE extends keyof STATE, STATE, PARAMS extends any[]>(
  ...params: PARAMS
) {
  return params as unknown as STATE[TYPE];
}

function forward_args_as_return<
  TYPE extends keyof STATE,
  STATE,
  RETURNS extends { [KEY in keyof STATE]: any },
>(args: STATE[TYPE]) {
  return args as unknown as RETURNS[TYPE];
}

interface RunHandlerMidleware {
  <TYPE extends keyof STATE, STATE, API>(
    handle: (args: STATE[TYPE], api: API) => void,
    args: STATE[TYPE],
    api: API,
  ): void;
  <TYPE extends keyof STATE, STATE>(handle: (args: STATE[TYPE]) => void, args: STATE[TYPE]): void;
}

const run_handler_midleware: RunHandlerMidleware = <TYPE extends keyof STATE, STATE, API = void>(
  handle: (args: STATE[TYPE], api?: API) => void,
  args: STATE[TYPE],
  api?: API,
) => {
  handle(args, api);
};

export function event_runner<STATE, PARAMS extends any[]>(
  options?: EventRunnerOptions<STATE, PARAMS>,
) {
  const { request, midleware } = Object.assign(
    {
      request: forward_params_as_args<keyof STATE, STATE, PARAMS>,
      midleware: run_handler_midleware<keyof STATE, STATE>,
    },
    options,
  );

  return <TYPE extends keyof STATE>(
    handlers: Array<(args: STATE[TYPE], api: void) => void>,
    ...params: PARAMS
  ) => {
    handlers.forEach((handler) => midleware(handler, request(...params)));
  };
}

interface PipelineApi {
  readonly aborted: boolean;
  abort: () => void;
}

function pipeline_api(): PipelineApi {
  let aborted = false;

  return {
    get aborted() {
      return aborted;
    },
    abort() {
      aborted = true;
    },
  };
}

interface PipelineRunnerOptions<
  STATE,
  PARAMS extends any[],
  RETURNS extends { [KEY in keyof STATE]: any },
> {
  request?: (<TYPE extends keyof STATE>(...params: PARAMS) => STATE[TYPE]) | undefined;
  response?: (<TYPE extends keyof STATE>(args: STATE[TYPE]) => RETURNS[TYPE]) | undefined;
  midleware?:
    | (<TYPE extends keyof STATE>(
        handler: (args: STATE[TYPE], api: void) => void,
        arg: STATE[TYPE],
        api: void,
      ) => void)
    | undefined;
}

export function pipeline_runner<
  TYPE extends keyof STATE,
  STATE,
  PARAMS extends any[],
  RETURNS extends { [KEY in keyof STATE]: any } = STATE,
>(options?: PipelineRunnerOptions<STATE, PARAMS, RETURNS>) {
  const { request, response, midleware } = Object.assign(
    {
      request: forward_params_as_args<TYPE, STATE, PARAMS>,
      response: forward_args_as_return<TYPE, STATE, RETURNS>,
      midleware: run_handler_midleware<TYPE, STATE, PipelineApi>,
    },
    options,
  );

  return (handlers: Array<(args: STATE[TYPE], api: PipelineApi) => void>, ...params: PARAMS) => {
    const args = request(...params);
    const api = pipeline_api();

    for (const handler of handlers) {
      if (api.aborted) break;
      midleware(handler, args, api);
    }

    return response(args);
  };
}

type empty = void | undefined | null;

type RegisterTypeOption<TYPE> = {
  type: TYPE;
};

type RegisterSelectorOption<ARGS, SELECTED> = ARGS extends empty
  ? { select?: never }
  : { select?: (args: ARGS) => SELECTED };

type RegisterHandlerOptions<ARGS, API = void> = API extends empty
  ?
      | { once?: never; each: (...params: ARGS extends empty ? [] : [args: ARGS]) => void }
      | { each?: never; once: (...params: ARGS extends empty ? [] : [args: ARGS]) => void }
  :
      | { once?: never; each: (args: ARGS, api: API) => void }
      | { each?: never; once: (args: ARGS, api: API) => void };

type RegisterSpotOptions = {
  patch?:
    | { mode?: never; name?: never }
    | { mode: 'prepend' | 'append' }
    | { mode: 'before' | 'after' | 'instead'; name: string };
};

// type RegisterOptions<API, ARGS, SELECTED = ARGS> = RegisterSelectorOption<ARGS, SELECTED> &
//   RegisterSpotOptions &
//   RegisterHandlerOptions<SELECTED, API>;

type Cleanup = () => void;

interface EngineConstructor {
  <STATE, API, RETURNS extends { [KEY in keyof STATE]: any }>(options: {
    state: State<STATE>;
    runner: Runner<STATE, API, [], RETURNS>;
  }): {
    emit: <TYPE extends keyof STATE>(
      ...params: STATE[TYPE] extends empty ? [type: TYPE] : [type: TYPE, args: STATE[TYPE]]
    ) => RETURNS[TYPE];
    register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
      options: RegisterTypeOption<TYPE> &
        RegisterSelectorOption<STATE[TYPE], SELECTED> &
        RegisterSpotOptions &
        RegisterHandlerOptions<SELECTED, API>,
    ) => Cleanup;
  };
  <TYPE extends keyof STATE, STATE, API, PARAMS extends any[], RETURN>(options: {
    state: State<STATE>;
    runner: Runner<{ default: STATE }, API, PARAMS, { default: RETURN }>;
    action: (args: STATE[TYPE]) => { type: TYPE; args: STATE[TYPE] };
  }): {
    emit: (...args: PARAMS) => RETURN;
    register: <SELECTED = STATE[TYPE]>(
      options: RegisterSelectorOption<STATE[TYPE], SELECTED> &
        RegisterSpotOptions &
        RegisterHandlerOptions<SELECTED, API>,
    ) => Cleanup;
  };
}

declare const engine: EngineConstructor;

export function emitter<STATE>() {
  return engine({
    state: handlers_state<STATE>(),
    runner: event_runner(),
  });
}

interface Events<T> {
  change: T;
  cleanup: void;
}

export const events = emitter<Events<number>>();

events.emit('change', 1);

events.register({
  type: 'change',
  each: (number) => {
    console.log('change', number);
  },
});

events.emit('cleanup');

events.register({
  type: 'cleanup',
  each: () => {
    console.log('cleanup');
  },
});

export function pipe_emitter<STATE>() {
  return engine({
    state: handlers_state<STATE>(),
    runner: pipeline_runner(),
  });
}

export const pipe_events = pipe_emitter<Events<number>>();

pipe_events.emit('change', 1);

pipe_events.register({
  type: 'change',
  each: (number, api) => {
    if (api.aborted) return;
    console.log('change', number);
  },
});

pipe_events.emit('cleanup');

pipe_events.register({
  type: 'cleanup',
  each: () => {
    console.log('cleanup');
  },
});

// export function pipelines<STATE>() {
//   return engine({
//     state: handlers_state<STATE>(),
//     runner: pipeline_runner(),
//   });
// }

interface Increment {
  amount: number;
}

interface Decrement {
  amount: number;
}

interface CounterState {
  increment: Increment;
  decrement: Decrement;
}

// export const counter = pipelines<CounterState>();

// counter.emit('increment', { amount: 1 });
// counter.emit('decrement', { amount: 1 });

// counter.register({
//   type: 'increment',
//   each: (args, api) => {
//     if (api.aborted) return;
//     console.log('increment', args.amount);
//   },
// });

interface PipelineOptions<
  STATE,
  PARAMS extends any[],
  RETURNS extends { [KEY in keyof STATE]: any },
> extends PipelineRunnerOptions<STATE, PARAMS, RETURNS> {
  // processors?: Processor<ARGS>[];
}

// interface PipelineConstructor {
//   <STATE, PARAMS extends any[] = [args: STATE], RETURN = STATE>(
//     options?: PipelineOptions<PARAMS, STATE, RETURN>,
//   ): ReturnType<typeof engine<{ type: STATE }, RETURN, PipelineApi, PARAMS, STATE>>;
// }

/*
export type Runner<ARGS, API, PARAMS extends any[], RETURN> = (
	handlers: Array<(args: ARGS, api: API) => void>,
	...params: PARAMS
) => RETURN;
*/

export const pipeline = <STATE, PARAMS extends any[] = [], RETURN = STATE>(
  options?: PipelineOptions<{ default: STATE }, PARAMS, { default: RETURN }>,
) => {
  const { request, response, midleware } = options ?? {};
  // const type = Symbol();

  return engine({
    state: handlers_state<{ default: STATE }>(),
    runner: pipeline_runner({ request, response, midleware }),
    action: (args: STATE) => ({ type: 'default' as const, args }),
  });
};

export const increment = pipeline<Increment>();

increment.emit({ amount: 1 });

// increment.register({
//   each: (args, api) => {
//     if (api.aborted) return;
//     console.log('increment', args.amount);
//   },
// });

// export const decrement = pipeline({
//   request: (amount: number): Decrement => ({ amount }),
// });

// decrement.emit(1);

// decrement.register({
//   each: (args, api) => {
//     if (api.aborted) return;
//     console.log('increment', args.amount);
//   },
// });

// export const count = pipeline({
//   request: (amount: number) => ({ amount }),
//   response: (args) => args.amount,
// });

// count.emit(1);

// count.register({
//   each: (args, api) => {
//     if (api.aborted) return;
//     console.log('increment', args.amount);
//   },
// });
