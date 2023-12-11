import { signal } from 'src/store';

import { effect } from '../effect';
import { Computed, ComputedOptions } from './types';

export const computed: Computed = <T>(options: ComputedOptions<T, [any]>) => {
  const { listener, dependency } = options;

  const computed_signal = signal<T>();

  effect({
    listener: (...args) => {
      computed_signal(listener(...args));
    },
    dependency,
  });

  return computed_signal;
};
