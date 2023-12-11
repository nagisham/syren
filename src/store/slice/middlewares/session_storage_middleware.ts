import { is_not_null } from '@nagisham/standard';

import { Middleware } from '../types';

export function session_storage_middleware(key: string): Middleware {
  return ({ set, listen }) => {
    const initial = sessionStorage.getItem(key);

    if (is_not_null(initial)) {
      set(JSON.parse(initial));
    }

    listen({
      type: 'change',
      each: (next) => {
        sessionStorage.setItem(key, JSON.stringify(next));
      },
    });
  };
}
