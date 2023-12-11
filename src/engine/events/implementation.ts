import { LISTENING_PREFIX } from './constants';
import { EventEngine, EventEngineDefaults, EventEngineState, Events, ListenOptions } from './types';

export function event_engine<E extends Events>(defaults?: EventEngineDefaults) {
  const state: EventEngineState<E> = {};

  const get = <K extends keyof E>(type: K) => {
    return (state[type] ??= { listeners: [] });
  };

  function fire<K extends keyof E & string>(type: K, next: E[K]) {
    const subscription = get(type);
    subscription.listeners.forEach((listener) => {
      listener(next, subscription.previous);
    });
    subscription.previous = next;
  }

  function listen<K extends keyof E & string>(options: ListenOptions<K, E[K], E[K]>) {
    const { type, select, each, once } = options;
    const equal = options.equal ?? defaults?.equal;

    const subscription = get(type);

    function clear() {
      const { listeners } = subscription;

      const index = listeners.indexOf(listener);
      if (index === -1) {
        console.warn('event engine: registered listener not found');
        return;
      }

      listeners.splice(index, 1);
    }

    function listener(next: E[K], old: E[K] | undefined) {
      try {
        if (select) {
          next &&= select(next);
          old &&= select(old);
        }

        if (old && equal?.(next, old)) return;

        if (each) {
          each(next);
        } else if (once) {
          once(next);
          clear();
        } else {
          console.error('event engine: no listener was provided');
        }
      } catch (error) {
        console.error(error);
      }
    }

    subscription.listeners.push(listener);

    if (!type.startsWith(LISTENING_PREFIX)) {
      // @ts-expect-error
      fire(LISTENING_PREFIX + type, listener);
    }

    return clear;
  }

  return { fire, listen } as EventEngine<E>;
}
