import {
  is_function,
  is_not_null,
  is_null,
  is_object,
  is_string,
  struct,
  unpack,
} from '@nagisham/standard';

import { event_engine, state_engine } from 'src/engine';

import { State, StoreEvents, WithPrevious } from '../types';
import { Middleware, SliceStruct } from './types';

export const slice = struct<SliceStruct>(
  <T extends State>(initial?: T, middlewares?: Middleware[]) => {
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

    function copy() {
      return Object.assign({}, get());
    }

    function accesser<K extends keyof T>(
      key_value?: K | Partial<T> | WithPrevious<Partial<T> | undefined>,
      value?: T[K] | WithPrevious<T[K] | undefined>,
    ) {
      if (is_null(key_value) && is_null(value)) {
        return copy();
      }

      if (is_object(key_value) || is_function(key_value)) {
        const old = get();
        const next = Object.assign({}, old, unpack(key_value, old));

        set(next);
        fire('change', next);
      }

      if (is_string(key_value) && is_null(value)) {
        return get()?.[key_value];
      }

      if (is_string(key_value) && is_not_null(value)) {
        const old = get();
        const next = Object.assign({}, old, {
          [key_value]: unpack(value, old?.[key_value]),
        });

        set(next);
        fire('change', next);
      }

      return;
    }

    middlewares?.forEach((middleware) => {
      middleware({ get, set, fire, listen });
    });

    return Object.assign(accesser, { fire, listen });
  },
);
