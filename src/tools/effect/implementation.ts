import { Functions, is_function, is_not_null } from '@nagisham/standard';

import { Signal } from 'src/store';
import { ListenOptions } from 'src/engine';

import { Cleanup, Effect, EffectOptions } from './types';

export const effect: Effect = (options: EffectOptions<Signal[]>): Cleanup => {
  const { listener, dependency } = options;

  const unsubscribe = new Array<Cleanup>();
  let cleanup: void | Cleanup;

  const listen_options: ListenOptions<'change', unknown, unknown> = {
    type: 'change',
    each: () => {},
  };

  dependency.forEach((signal) => {
    listen_options.each = () => {
      if (is_function(cleanup)) {
        cleanup();
        cleanup = undefined;
      }

      const args = dependency.map(Functions.call);
      if (args.every(is_not_null)) {
        cleanup = listener(...args);
      }
    };

    unsubscribe.push(signal.listen(listen_options));
  });

  return () => unsubscribe.forEach(Functions.call);
};
