import { combine } from '@nagisham/standard';

import { signal, Signal, Slice } from 'src/store';
import { State } from 'src/store/types';

export function selector<S extends State, T extends S[keyof S]>(
  slice: Slice<S>,
  select: (state: S) => T,
): Signal<T> {
  type K = keyof S & string;

  const state = {} as { key: K };

  const proxy = new Proxy(slice(), {
    get: (target, key: K) => {
      state.key = key;
      return Reflect.get(target, key);
    },
  });

  const selector = signal(select(proxy));

  selector.listen({
    type: 'cleanup',
    once: combine(
      slice.listen({
        type: 'change',
        select,
        each: (next) => {
          selector(next);
        },
      }),
      selector.listen({
        type: 'change',
        each: (next) => {
          slice(state.key, next);
        },
      }),
    ),
  });

  return selector;
}
