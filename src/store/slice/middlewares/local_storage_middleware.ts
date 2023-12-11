import { is_not_null } from '@nagisham/standard';

import { Middleware } from '../types';

export function local_storage_middleware(key: string): Middleware {
  return ({ set, listen }) => {
    const initial = localStorage.getItem(key);

    if (is_not_null(initial)) {
      set(JSON.parse(initial));
    }

    listen({
      type: 'change',
      each: (next) => {
        localStorage.setItem(key, JSON.stringify(next));
      },
    });
  };
}
