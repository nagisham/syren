import { Lambda } from '@nagisham/standard';

export type EventEngineState<E> = {
  [K in keyof E]?: Lambda<[next: E[K]], void>[];
};

function event_engine_state<STATE>() {
  const state: EventEngineState<STATE> = {};

  const get = <K extends keyof STATE>(type: K) => {
    return (state[type] ??= []);
  };

  const set = <K extends keyof STATE>(type: K, listener: Lambda<[next: STATE[K]], void>) => {
    return get(type).push(listener);
  };

  return { get, set };
}

function fire_behaviour<S extends Record<string, { listeners: Lambda[]; previous: any }>>(
  state: S,
) {
  return function fire<K extends keyof S & string>(type: K, next: S[K]) {
    const subscription = state[type];
    if (subscription) {
      subscription.listeners.forEach((listener) => {
        listener(next, subscription.previous);
      });
      subscription.previous = next;
    }
  };
}

function engine<F extends Lambda<[any], ReturnType<typeof fire_behaviour>>>(fire_factory: F) {
  const state: any = {};

  return {
    fire: fire_factory(state),
  };
}

export function pipeline() {}

export function emiter() {
  return engine(fire_behaviour);
}
