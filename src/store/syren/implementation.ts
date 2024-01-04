import { Lambda, is_array, is_not_null, is_number, is_string } from '@nagisham/standard';
import { EventEngine, event_engine } from 'src/engine';
import { local_storage } from './local_storage';
import { Pipeline, PipelineRunner, pipeline } from './pipeline';

type Arguments<T extends Lambda> = T extends {
  (...args: infer P1): any;
  (...args: infer P2): any;
  (...args: infer P3): any;
  (...args: infer P4): any;
}
  ? P1 | P2 | P3 | P4
  : T extends { (...args: infer P1): any; (...args: infer P2): any; (...args: infer P3): any }
  ? P1 | P2 | P3
  : T extends { (...args: infer P1): any; (...args: infer P2): any }
  ? P1 | P2
  : T extends (...args: infer P) => any
  ? P
  : never;

type Returns<T extends Lambda> = T extends {
  (...args: any): infer R1;
  (...args: any): infer R2;
  (...args: any): infer R3;
  (...args: any): infer R4;
}
  ? R1 | R2 | R3 | R4
  : T extends { (...args: any): infer R1; (...args: any): infer R2; (...args: any): infer R3 }
  ? R1 | R2 | R3
  : T extends { (...args: any): infer R1; (...args: any): infer R2 }
  ? R1 | R2
  : T extends (...args: any) => infer R
  ? R
  : never;

interface StateArgs<T> {
  state: T;
}

type StateBehaviour<T = any> = (
  get: Pipeline<[], StateArgs<T>, T>,
  set: Pipeline<[next: T], StateArgs<T>, void>,
) => void;

interface State<T> {
  get: Pipeline<[], StateArgs<T | undefined>, T | undefined>;
  set: Pipeline<[next: T], StateArgs<T>, void>;
}

export function state_engine<T>(): State<T> {
  const get = pipeline({
    request: (): StateArgs<T | undefined> => ({ state: undefined }),
    response: (arg) => arg.state,
  });

  const set = pipeline({
    request: (next: T): StateArgs<T> => ({ state: next }),
  });

  return { get, set };
}

interface InMemoryState<T> {
  current: T | undefined;
}

export function in_memory_state_behaviour<T>(): StateBehaviour<T> {
  const state: InMemoryState<T> = { current: undefined };

  return (get, set) => {
    get.add({
      type: 'get-state-from-memory',
      process: (arg, api) => {
        if (is_not_null(state.current)) {
          arg.state = state.current;
          api.abort();
        }
      },
    });

    set.add({
      type: 'set-state-in-memory',
      process: (arg) => {
        state.current = arg.state;
      },
    });
  };
}

const memory_storage = local_storage();

export function local_storage_state_behaviour<T>(key: string): StateBehaviour<T> {
  return (get, set) => {
    get.add({
      type: 'get-state-from-local-storage',
      process: (arg, api) => {
        const current = memory_storage.getItem<T>(key);

        if (current !== null) {
          arg.state = current;
          api.abort();
        }
      },
    });

    set.add({
      type: 'set-state-in-local-storage',
      process: (arg) => {
        memory_storage.setItem(key, arg.state);
      },
    });
  };
}

export function default_value_state_behaviour<T>(default_value: T): StateBehaviour<T> {
  return (get) => {
    get.add({
      type: 'get-state-from-default-value',
      process: (arg, api) => {
        arg.state = default_value;
        api.abort();
      },
    });
  };
}

interface ApiOptions<T> {
  query: () => Promise<T>;
  mutate: (...args: any[]) => Promise<boolean>;
}

export function api_state_behaviour<T>({ query, mutate }: ApiOptions<T>): StateBehaviour<T> {
  return (get, set) => {
    get.add({
      process: async (arg, api) => {
        arg.state = await query();
        api.abort();
      },
    });

    set.add({
      process: (arg) => {
        if (arg.state) {
          return mutate(arg.state);
        }
      },
    });
  };
}

export function state_synchronization_behaviour<T>(
  ...behaviours: StateBehaviour<T>[]
): StateBehaviour<T> {
  return (_, set) => {
    const init = pipeline({
      request: (): StateArgs<T | undefined> => ({ state: undefined }),
      response: (arg) => arg.state,
    });

    behaviours.forEach((behaviour) => {
      behaviour(init, set);
    });

    const initial = init.run();
    if (initial) {
      set.run(initial);
    }
  };
}

type EventsBehaviour<T, E> = (
  get: Pipeline<[], StateArgs<T | undefined>, T | undefined>,
  set: Pipeline<[next: T], StateArgs<T>, void>,
  fire: EventEngine<E>['fire'],
  listen: EventEngine<E>['listen'],
) => void;

type ChangeEvent<T> = { change: T };

export function fire_change_event_on_set_behaviour<T>(): EventsBehaviour<T, ChangeEvent<T>> {
  return (_get, set, fire, _listen) => {
    set.add({
      type: 'fire-change-event-on-set',
      process: (arg) => {
        fire('change', arg.state);
      },
    });
  };
}

export function listening_change_event_behaviour<T>(): EventsBehaviour<T, ChangeEvent<T>> {
  return (get, _set, _fire, listen) => {
    listen({
      type: 'listening:change',
      each: (listener) => {
        const state = get.run();
        if (state) {
          listener(state);
        }
      },
    });
  };
}

type CleanupEvent = { cleanup: void };

export function listen_cleanup_event_behaviour<T>(
  clean_value?: T,
): EventsBehaviour<T, CleanupEvent> {
  return (_get, set, _fire, listen) => {
    listen({
      type: 'cleanup',
      each: () => {
        set.run(clean_value as T);
      },
    });
  };
}

type AccesserBehaviour<T, R extends Lambda = any> = (
  accesser: Pipeline<
    [params: Arguments<R>],
    { state?: Returns<R>; params: Arguments<R> },
    Returns<R> | undefined
  >,
  get: PipelineRunner<[], T | undefined>,
  set: PipelineRunner<[next: T], void>,
) => void;

type SingleAccesser<T> = {
  (): T;
  (next: Partial<T>): void;
};

export function single_accesser_behaviour<T>(): AccesserBehaviour<T, SingleAccesser<T>> {
  return (accesser, get, set) => {
    accesser.add({
      type: 'get-state-as-single-accesser',
      process: (arg, api) => {
        const { params } = arg;

        if (is_array(params, 0)) {
          arg.state = get();
          api.abort();
        }
      },
    });

    accesser.add({
      type: 'set-state-as-single-accesser',
      process: (arg, api) => {
        const { params } = arg;

        if (is_array(params, 1)) {
          const [next] = params;
          if (next) {
            if (typeof next === 'object') {
              set(Object.assign({}, get(), next));
            } else {
              set(next);
            }

            api.abort();
          }
        }
      },
    });
  };
}

type KeyValueAccesser<T extends Record<string, any>> = {
  <K extends keyof T>(key: K): T[K];
  <K extends keyof T>(key: K, next: T[K]): void;
};

export function key_value_accesser_behaviour<T extends Record<string, any>>(): AccesserBehaviour<
  T,
  KeyValueAccesser<T>
> {
  return (accesser, get, set) => {
    accesser.add({
      type: 'get-state-as-key-value-accesser',
      before: 'get-state-as-single-accesser',
      process: (arg, api) => {
        const { params } = arg;

        if (is_array(params, 1)) {
          const [key] = params;
          const state = get();

          if (state && is_string(key)) {
            arg.state = state[key];
            api.abort();
          }
        }
      },
    });

    accesser.add({
      type: 'set-state-as-key-value-accesser',
      before: 'set-state-as-single-accesser',
      process: (arg, api) => {
        const { params } = arg;

        if (is_array(params, 2)) {
          const [key, next] = params;
          if (key) {
            set(Object.assign({}, get(), { [key]: next }));
            api.abort();
          }
        }
      },
    });
  };
}

type IndexAccesser<T extends any[]> = {
  (key: number): T[number];
  (key: number, next: T[number]): void;
};

export function index_accesser_behaviour<T extends any[]>(): AccesserBehaviour<
  T,
  IndexAccesser<T>
> {
  return (accesser, get, set) => {
    accesser.add({
      type: 'get-state-as-index-accesser',
      before: 'get-state-as-single-accesser',
      process: (arg, api) => {
        const { params } = arg;

        if (is_array(params, 1)) {
          const [key] = params;
          const state = get();

          if (state && is_number(key)) {
            arg.state = state[key];
            api.abort();
          }
        }
      },
    });

    accesser.add({
      type: 'set-state-as-index-accesser',
      before: 'set-state-as-single-accesser',
      process: (arg, api) => {
        const { params } = arg;

        if (is_array(params, 2)) {
          const [key, next] = params;
          const state = get();

          if (state && key) {
            const old = state.slice() as T;
            old.splice(key, 1, next);
            set(old);
            api.abort();
          }
        }
      },
    });
  };
}

type EngineBehaviour<T, R> = <E>(
  engine: Pipeline<[], R, R>,
  get: Pipeline<[], StateArgs<T | undefined>, T | undefined>,
  set: Pipeline<[next: T], StateArgs<T>, void>,
  fire: EventEngine<E>['fire'],
  listen: EventEngine<E>['listen'],
) => void;

function events_engine_behaiovr<T, E>(): EngineBehaviour<T, EventEngine<E>> {
  return (engine, _get, _set, fire, listen) => {
    engine.add({
      type: 'event-engine-to-engine',
      process: (arg) => {
        arg.fire = fire;
        arg.listen = listen;
      },
    });
  };
}

export function state_adapter<T>(...behaviours: StateBehaviour<T>[]): StateBehaviour<T> {
  return (get, set) => behaviours.forEach((behaviour) => behaviour(get, set));
}

export interface EventAdapter {
  <T, E>(behaviour: EventsBehaviour<T, E>): EventsBehaviour<T, E>;
  <T, E1, E2>(
    behaviour_1: EventsBehaviour<T, E1>,
    behaviour_2: EventsBehaviour<T, E2>,
  ): EventsBehaviour<T, E1 & E2>;
  <T, E1, E2, E3>(
    behaviour_1: EventsBehaviour<T, E1>,
    behaviour_2: EventsBehaviour<T, E2>,
    behaviour_3: EventsBehaviour<T, E3>,
  ): EventsBehaviour<T, E1 & E2 & E3>;
}

export const event_adapter: EventAdapter = <T, E>(
  ...behaviours: EventsBehaviour<T, E>[]
): EventsBehaviour<T, E> => {
  return (get, set, fire, listen) =>
    behaviours.forEach((behaviour) => behaviour(get, set, fire, listen));
};

export interface AccesserAdapter {
  <T, R extends Lambda>(behaviour: AccesserBehaviour<T, R>): AccesserBehaviour<T, R>;
  <T, R1 extends Lambda, R2 extends Lambda>(
    behaviour_1: AccesserBehaviour<T, R1>,
    behaviour_2: AccesserBehaviour<T, R2>,
  ): AccesserBehaviour<T, R1 & R2>;
}

export const accesser_adapter: AccesserAdapter = <T, R extends Lambda>(
  ...behaviours: AccesserBehaviour<T, R>[]
): AccesserBehaviour<T, R> => {
  return (accesser, get, set) => behaviours.forEach((behaviour) => behaviour(accesser, get, set));
};

type StrenBehaviourOptions<T, E, R extends Lambda, A> = {
  state?: StateBehaviour<T>;
  events?: EventsBehaviour<T, E>;
  accesser?: AccesserBehaviour<T, R>;
  engine?: EngineBehaviour<T, E>;
};

export const syren = <T, E, R extends Lambda, A>(options?: StrenBehaviourOptions<T, E, R, A>) => {
  const { get, set } = state_engine<T>();
  const { fire, listen } = event_engine<E>();

  const accesser = pipeline({
    request: (params: Arguments<R>): { state?: Returns<R>; params: Arguments<R> } => ({ params }),
    response: (arg) => arg.state,
  });

  const engine = pipeline({
    request: () => ({} as A),
    response: (arg) => arg,
  });

  if (options) {
    options.state?.(get, set);
    options.accesser?.(accesser, get.run, set.run);
    options.engine?.(engine, get, set, fire, listen);
  }

  return Object.assign(accesser.run as R, engine.run());
};

export type SignalEvents<T> = { change: T; cleanup: void };

export const signal = <T>(initial: T) => {
  return syren({
    state: state_adapter<T>(in_memory_state_behaviour(), default_value_state_behaviour(initial)),
    events: event_adapter(
      fire_change_event_on_set_behaviour(),
      listen_cleanup_event_behaviour(),
      listening_change_event_behaviour(),
    ),
    accesser: single_accesser_behaviour(),
    engine: events_engine_behaiovr(),
  });
};

// export const storage = <T extends any[]>(initial?: T) => {
//   return syren({
//     state: state_adapter<T>(in_memory_state_behaviour(), default_value_state_behaviour(initial)),
//     accesser: accesser_adapter(single_accesser_behaviour(), index_accesser_behaviour()),
//   });
// };

export const syren2 = (...behaviours: Lambda[]) => {
  const args: any[] = [];
  const engine = {};

  behaviours.forEach((behavior) => {
    const result = behavior(...args);
    args.push(result.args);
    Object.assign(engine, result.engine);
  });

  return engine;
};

syren2(
  // pipeline ?
  () => {
    const { get, set } = state_engine();

    in_memory_state_behaviour()(get, set);

    const accesser = pipeline({
      request: (params: any): { state?: any; params: any } => ({ params }),
      response: (arg) => arg.state,
    });

    single_accesser_behaviour()(accesser, get.run, set.run);

    return {
      args: { get, set },
      engine: accesser.run,
    };
  },
  (state) => {
    function fire() {}
    function listen() {}
    return { fire, listen };
  },
  (state, events) => {},
);
