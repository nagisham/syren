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
    const state = state_engine(initial);
    const events = event_engine<StoreEvents<T | undefined>>();

    events.listen({
      type: 'listening:change',
      each: (listener) => {
        is_not_null(state.get()) && listener(state.get());
      },
    });

    events.listen({
      type: 'cleanup',
      each: () => state.set(undefined),
    });

    function copy() {
      return Object.assign({}, state.get());
    }

    function accesser<K extends keyof T>(
      key_value?: K | Partial<T> | WithPrevious<Partial<T> | undefined>,
      value?: T[K] | WithPrevious<T[K] | undefined>,
    ) {
      if (is_null(key_value) && is_null(value)) {
        return copy();
      }

      if (is_object(key_value) || is_function(key_value)) {
        const old = state.get();
        const next = Object.assign({}, old, unpack(key_value, old));

        state.set(next);
        events.fire('change', next);
      }

      if (is_string(key_value) && is_null(value)) {
        return state.get()?.[key_value];
      }

      if (is_string(key_value) && is_not_null(value)) {
        const old = state.get();
        const next = Object.assign({}, old, {
          [key_value]: unpack(value, old?.[key_value]),
        });

        state.set(next);
        events.fire('change', next);
      }

      return;
    }

    middlewares?.forEach((middleware) => {
      middleware({ ...state, ...events });
    });

    return Object.assign(accesser, events);
  },
);
