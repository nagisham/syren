import { Lambda } from '@nagisham/standard';

type Type = string | number | symbol;

type Action<TYPE extends Type = Type, ARGS = void> = ARGS extends void
  ? { type: TYPE }
  : { type: TYPE; args: ARGS };

interface Creator<TYPE extends Type, PARAMS extends any[] = [], ARGS = undefined> {
  (...params: PARAMS): Action<TYPE, ARGS>;
  type: TYPE;
}

interface ActionConstructor {
  <TYPE extends Type>(type: TYPE): Creator<TYPE>;
  <TYPE extends Type, PARAMS extends any[], ARGS>(
    type: TYPE,
    create: (...params: PARAMS) => ARGS,
  ): Creator<TYPE, PARAMS, ARGS>;
}

export const action: ActionConstructor = <TYPE extends Type, PARAMS extends any[], ARGS>(
  type: TYPE,
  create?: (...params: PARAMS) => ARGS,
) => {
  return Object.assign((...params: PARAMS) => ({ type, args: create?.(...params) }), { type });
};

export type HandlersState<E> = {
  [K in keyof E]?: Handle<E[K]>[];
};

interface State<STATE, HANDLE extends Lambda> {
  get: <TYPE extends keyof STATE>(type: TYPE) => HANDLE[];
  set: <TYPE extends keyof STATE>(type: TYPE, handlers: HANDLE[]) => void;
}

export const handlers_state = <STATE>(default_type?: Type): State<STATE, Lambda> => {
  const state: { [TYPE in keyof STATE]?: Lambda[] } = {};

  const get = <TYPE extends keyof STATE>(type: TYPE) => {
    const key = (default_type ?? type ?? 'default') as TYPE;
    return (state[key] ??= []);
  };

  const set = <TYPE extends keyof STATE>(type: TYPE, handlers: Lambda[]) => {
    const key = (default_type ?? type ?? 'default') as TYPE;
    state[key] = handlers;
  };

  return { get, set };
};

type Runner<HANDLE extends Lambda, RETURN> = (
  handlers: HANDLE[],
  args: Parameters<HANDLE>[0],
) => RETURN;

function event_runner<STATE>() {
  return <TYPE extends keyof STATE>(
    handlers: Array<(args: STATE[TYPE]) => void>,
    args: STATE[TYPE],
  ) => {
    handlers.forEach((handler) => handler(args));
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

interface PipelineRunnerOptions {}

function pipeline_runner<STATE>(options?: PipelineRunnerOptions) {
  const {} = options ?? {};

  return <TYPE extends keyof STATE>(
    handlers: Array<(args: STATE[TYPE], api: PipelineApi) => void>,
    args: STATE[TYPE],
  ) => {
    const api = pipeline_api();

    for (const handler of handlers) {
      if (api.aborted) break;
      handler(args, api);
    }

    return args;
  };
}

type Handle<ARGS, API = {}> = (args: ARGS, api: API) => void;
type Handler<ARGS, API> = Handle<ARGS, API> | { name: string; handle: Handle<ARGS, API> };

type RegisterTypeOption<TYPE> = {
  type: TYPE;
};

type RegisterSelectorOption<ARGS, SELECTED> = {
  select?: (args: ARGS) => SELECTED;
};

type RegisterHandlerOptions<ARGS, API> =
  | { once?: never; each: Handler<ARGS, API> }
  | { each?: never; once: Handler<ARGS, API> };

type RegisterSpotOptions = {
  patch?:
    | { mode?: never; name?: never }
    | { mode: 'prepend' | 'append' }
    | { mode: 'before' | 'after' | 'instead'; name: string };
};

type RegisterOptions<API, ARGS, SELECTED = ARGS> = RegisterSelectorOption<ARGS, SELECTED> &
  RegisterSpotOptions &
  RegisterHandlerOptions<SELECTED, API>;

type Cleanup = () => void;

interface EngineConstructor {
  <STATE, API>(
    state: State<STATE>,
    runner: <TYPE extends keyof STATE>(
      handlers: Handle<STATE[TYPE], API>[],
      args: STATE[TYPE],
    ) => STATE[TYPE],
  ): {
    emit: <TYPE extends keyof STATE>(action: Action<TYPE, STATE[TYPE]>) => STATE[TYPE];
    register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
      options: RegisterTypeOption<TYPE> & RegisterOptions<API, STATE[TYPE], SELECTED>,
    ) => Cleanup;
  };
  <STATE, API>(
    state: State<STATE>,
    runner: <TYPE extends keyof STATE>(
      handlers: Handle<STATE[TYPE], API>[],
      args: STATE[TYPE],
    ) => void,
  ): {
    emit: <TYPE extends keyof STATE>(action: Action<TYPE, STATE[TYPE]>) => void;
    register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
      options: RegisterTypeOption<TYPE> & RegisterOptions<API, STATE[TYPE], SELECTED>,
    ) => Cleanup;
  };
  <STATE, API, RETURN>(
    state: State<STATE>,
    runner: <TYPE extends keyof STATE>(
      handlers: Handle<STATE[TYPE], API>[],
      args: STATE[TYPE],
    ) => RETURN,
  ): {
    emit: <TYPE extends keyof STATE>(action: Action<TYPE, STATE[TYPE]>) => RETURN;
    register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
      options: RegisterTypeOption<TYPE> & RegisterOptions<API, STATE[TYPE], SELECTED>,
    ) => Cleanup;
  };
}

export function test<STATE>() {
  return engine({
    state: handlers_state<STATE>(),
    runner: event_runner(),
  });
}

export const engine = <STATE, HANDLE extends Lambda, RETURN>(options: {
  state?: State<STATE, HANDLE>;
  runner?: Runner<HANDLE, RETURN>;
}) => {
  const { state, runner } = options;
  const { get, set } = state;

  function emit<TYPE extends keyof STATE>(action: Action<TYPE, STATE[TYPE]>) {
    const handlers = get(action.type);

    // any because typescript is crazy here.
    return runner(handlers, ('args' in action ? action.args : undefined) as any);
  }

  function register<TYPE extends keyof STATE, SELECTED>(
    options: {
      type: TYPE;
      patch?:
        | { mode?: never; name?: never }
        | { mode: 'prepend' | 'append' }
        | { mode: 'before' | 'after' | 'instead'; name: string };
      select?: (args: Parameters<HANDLE>[0]) => SELECTED;
    } & (
      | { once?: never; each: Handler<SELECTED, Parameters<HANDLE>[1]> }
      | { each?: never; once: Handler<SELECTED, Parameters<HANDLE>[1]> }
    ),
  ) {
    const { type, patch, select, once, each } = options;

    let handle: (args: SELECTED, api: Parameters<HANDLE>[1]) => void;
    let name: string | undefined = undefined;

    if (once) {
      if ('handle' in once) {
        handle = once.handle;
        name = once.name;
      } else {
        handle = once;
      }
    } else {
      if ('handle' in each) {
        handle = each.handle;
        name = each.name;
      } else {
        handle = each;
      }
    }

    function listener(args: Parameters<HANDLE>[0], api: Parameters<HANDLE>[1]) {
      if (select) {
        args &&= select(args);
      }

      handle(args, api);
    }

    if (name) {
      Object.defineProperty(listener, 'name', { value: name });
    }

    let handlers = get(type);
    if (!handlers) set(type, (handlers = []));

    switch (patch?.mode) {
      case 'prepend': {
        handlers.splice(0, 0, listener);
        break;
      }
      case 'append': {
        handlers.push(listener);
        break;
      }
      case 'after': {
        const index = handlers.findIndex((handler) => handler.name === patch.name);
        handlers.splice(index + 1, 0, listener);
        break;
      }
      case 'before': {
        const index = handlers.findIndex((handler) => handler.name === patch.name);
        handlers.splice(index, 0, listener);
        break;
      }
      case 'instead': {
        const index = handlers.findIndex((handler) => handler.name === patch.name);
        handlers.splice(index, 1, listener);
        break;
      }
      default: {
        handlers.push(listener);
        break;
      }
    }

    return () => {
      const index = handlers.indexOf(handle);
      if (index === -1) {
        console.warn('event engine: registered listener not found');
        return;
      }

      handlers.splice(index, 1);
    };
  }

  return { emit, register };
};

export function emitter<STATE>() {
  return engine(handlers_state<STATE>(), event_runner<STATE>());
}

interface Events<T> {
  change: T;
  cleanup: void;
}

const events = emitter<Events<number>>();

events.register({
  type: 'change',
  each: (value) => {
    console.log(value);
  },
});

events.emit({ type: 'change', args: 1 });
// events.emit({ type: "change" });
events.emit({ type: 'cleanup' });

export function pipeline<STATE>() {
  return engine(handlers_state<STATE>('d'), pipeline_runner<{ d: STATE }>());
}

interface CounterState {
  state: { count: number };
}

const counter = pipeline<CounterState>();
