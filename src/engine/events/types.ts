import type { Lambda, Prefix } from '@nagisham/standard';

import { LISTENING_PREFIX } from './constants';

export type Cleanup = Lambda<[], void>;
export type Events = Record<string, any>;

export type Listening<E extends Events> = {
  [K in keyof E as Prefix<typeof LISTENING_PREFIX, E>]: (next: E[K]) => void;
};

export type ListenOptions<K, T, S> = {
  type: K;
  equal?: (next: S, old: S | undefined) => boolean;
  select?: (state: T) => S;
} & ({ once?: never; each: (next: S) => void } | { each?: never; once: (next: S) => void });

export type EventApi<E extends Events> = {
  fire: <K extends keyof E & string>(type: K, next?: E[K]) => void;
  listen: <K extends keyof E & string, T = E[K], S = T>(options: ListenOptions<K, T, S>) => Cleanup;
};

export type EventEngine<E extends Events> = EventApi<E & Listening<E>>;

export interface EventEngineDefaults {
  equal?: (next: unknown, old: unknown) => boolean;
}

export type EventEngineState<E extends Events> = {
  [K in keyof E]?: {
    previous?: E[K];
    listeners: Lambda<[next: E[K], old: E[K] | undefined], void>[];
  };
};
