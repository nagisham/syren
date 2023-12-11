import { is_not_null, is_null, struct, unpack } from '@nagisham/standard';

import { event_engine, state_engine } from 'src/engine';

import { StoreEvents, WithPrevious } from '../types';
import { SignalStruct } from './types';

export const signal = struct<SignalStruct>(<T>(initial?: T) => {
  const { get, set } = state_engine(initial);
  const { fire, listen } = event_engine<StoreEvents<T | undefined>>();

  listen({
    type: 'listening:change',
    each: (listener) => {
      is_not_null(get()) && listener(get());
    },
  });

  listen({
    type: 'cleanup',
    each: () => set(undefined),
  });

  function accesser(value?: T | WithPrevious<T | undefined>) {
    if (is_null(value)) {
      return get();
    }

    const old = get();
    const next = unpack(value, old);

    if (!Object.is(old, next)) {
      set(next);
      fire('change', next);
    }

    return undefined;
  }

  return Object.assign(accesser, { fire, listen });
});
