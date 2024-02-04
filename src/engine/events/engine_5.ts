// type Runner<ARGS, API, RETURN, PARAMS extends any[] = [args: ARGS]> = {
//   (handlers: Array<(args: ARGS, api: API) => void>, ...params: PARAMS): RETURN;
// };

type Type = string | number | symbol;

type Runner<
  STATE,
  API,
  RETURNS extends { [KEY in keyof STATE]: any },
  PARAMS extends any[] = [],
> = <TYPE extends keyof STATE>(
  handlers: Array<(args: STATE[TYPE], api: API) => void>,
  ...params: PARAMS
) => RETURNS[TYPE];

function forward_params_as_args(...params: unknown[]) {
  return params as unknown;
}

function forward_args_as_return(args: unknown) {
  return args;
}

interface RunHandlerMidleware {
  <TYPE extends keyof STATE, STATE, API>(
    handle: (args: STATE[TYPE], api: API) => void,
    args: STATE[TYPE],
    api: API,
  ): void;
  <TYPE extends keyof STATE, STATE>(handle: (args: STATE[TYPE]) => void, args: STATE[TYPE]): void;
}

const run_handler_midleware: RunHandlerMidleware = (
  handle: (args: unknown, api?: unknown) => void,
  args: unknown,
  api?: unknown,
) => {
  handle(args, api);
};

interface EventRunnerOptions<STATE, PARAMS extends any[] = []> {
  request?: (<TYPE extends keyof STATE>(...params: PARAMS) => STATE[TYPE]) | undefined;
  midleware?:
    | (<TYPE extends keyof STATE>(handler: (args: STATE[TYPE]) => void, arg: STATE[TYPE]) => void)
    | undefined;
}

export function event_runner<STATE, PARAMS extends any[]>(
  options?: EventRunnerOptions<STATE, PARAMS>,
) {
  const { request, midleware } = Object.assign(
    {
      request: forward_params_as_args,
      midleware: run_handler_midleware,
    },
    options,
  );

  type RETURNS = { [KEY in keyof STATE]: void };

  return <TYPE extends keyof STATE>(
    handlers: Array<(args: STATE[TYPE], api: void) => void>,
    ...params: PARAMS
  ): RETURNS[TYPE] => {
    return handlers.forEach((handler) => midleware(handler, request<TYPE>(...params)));
  };
}

interface PipelineApi {
  readonly aborted: boolean;
  abort: () => void;
}

declare const pipeline_api: {
  (): PipelineApi;
};

interface PipelineRunnerOptions<
  STATE,
  API,
  RETURNS extends { [KEY in keyof STATE]: any },
  PARAMS extends any[] = [args: STATE[keyof STATE]],
> {
  request?: (<TYPE extends keyof STATE>(...params: PARAMS) => STATE[TYPE]) | undefined;
  response?: (<TYPE extends keyof STATE>(args: STATE[TYPE]) => RETURNS[TYPE]) | undefined;
  midleware?:
    | (<TYPE extends keyof STATE>(
        handler: (args: STATE[TYPE], API: API) => void,
        arg: STATE[TYPE],
        api: API,
      ) => void)
    | undefined;
}

export function pipeline_runner<
  STATE,
  PARAMS extends any[],
  RETURNS extends { [KEY in keyof STATE]: any } = STATE,
>(options?: PipelineRunnerOptions<STATE, PipelineApi, RETURNS, PARAMS>) {
  const { request, response, midleware } = Object.assign(
    {
      request: forward_params_as_args,
      response: forward_args_as_return,
      midleware: run_handler_midleware,
    },
    options,
  );

  return <TYPE extends keyof STATE>(
    handlers: Array<(args: STATE[TYPE], api: PipelineApi) => void>,
    ...params: PARAMS
  ) => {
    const args = request<TYPE>(...params);
    const api = pipeline_api();

    for (const handler of handlers) {
      if (api.aborted) break;
      midleware(handler, args, api);
    }

    return response<TYPE>(args);
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

type RegisterOptions<TYPE, API, ARGS, SELECTED = ARGS> = RegisterTypeOption<TYPE> &
  RegisterSelectorOption<ARGS, SELECTED> &
  RegisterSpotOptions &
  RegisterHandlerOptions<SELECTED, API>;

// type RegisterTypelessOptions<API, ARGS, SELECTED = ARGS> = RegisterSelectorOption<ARGS, SELECTED> &
//   RegisterSpotOptions &
//   RegisterHandlerOptions<SELECTED, API>;

type Cleanup = () => void;

interface EngineConstructor {
  <STATE, API, RETURNS extends { [KEY in keyof STATE]: any }, PARAMS extends any[]>(options: {
    state: STATE;
    // runner: Runner<STATE, API, RETURNS>;
    runner: <TYPE extends keyof STATE>(
      handlers: Array<(args1: STATE[TYPE], api: API) => void>,
      ...params: PARAMS
    ) => RETURNS[TYPE];
  }): {
    emit: <TYPE extends keyof STATE>(
      ...params: STATE[TYPE] extends empty ? [type: TYPE] : [type: TYPE, args: STATE[TYPE]]
    ) => RETURNS[TYPE];
    register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
      options: RegisterOptions<TYPE, API, STATE[TYPE], SELECTED>,
    ) => Cleanup;
  };
  <
    STATE extends Record<Type, any>,
    API,
    RETURN,
    PARAMS extends any[],
    TYPE extends keyof STATE = STATE extends Record<infer T, any> ? T : never,
    ARGS = STATE extends Record<Type, infer A> ? A : never,
  >(options: {
    state: STATE;
    // runner: Runner<STATE, API, Record<keyof STATE, RETURN>, PARAMS>;
    runner: (handlers: Array<(args: ARGS, api: API) => void>, ...params: PARAMS) => RETURN;
    action: (args: ARGS) => readonly [type: TYPE, args: ARGS];
  }): {
    emit: (...params: [args: ARGS]) => RETURN;
    // emit: (...params: PARAMS) => RETURNS[TYPE];
    register: <SELECTED = STATE>(
      options: RegisterSelectorOption<STATE, SELECTED> &
        RegisterSpotOptions &
        RegisterHandlerOptions<SELECTED, API>,
    ) => Cleanup;
  };
}

declare const engine: EngineConstructor;

export function emitter<STATE>() {
  return engine({
    state: {} as STATE,
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
    state: {} as STATE,
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

export function pipelines<STATE>() {
  return engine({
    state: {} as STATE,
    runner: pipeline_runner(),
  });
}

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

export const counter = pipelines<CounterState>();

counter.emit('increment', { amount: 1 });
counter.emit('decrement', { amount: 1 });

counter.register({
  type: 'increment',
  each: (args, api) => {
    if (api.aborted) return;
    console.log('increment', args.amount);
  },
});

interface PipelineOptions<STATE, PARAMS extends any[], RETURN> {
  request?: ((...params: PARAMS) => STATE) | undefined;
  response?: ((args: STATE) => RETURN) | undefined;
  midleware?:
    | ((handler: (args: STATE, API: PipelineApi) => void, arg: STATE, api: PipelineApi) => void)
    | undefined;
  // processors?: Processor<ARGS>[];
}

export const pipeline = <ARGS, PARAMS extends any[] = [], RETURN = ARGS>(
  options?: PipelineOptions<ARGS, PARAMS, RETURN>,
) => {
  const { request, response, midleware } = options ?? {};
  const type: symbol = Symbol();

  type STATE = Record<typeof type, ARGS>;
  type RETURNS = Record<typeof type, RETURN>;

  return engine({
    state: {} as STATE,
    runner: pipeline_runner<STATE, PARAMS, RETURNS>({
      request,
      response,
      midleware,
    }),
    action: (args: ARGS) => <const>[type, args],
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
