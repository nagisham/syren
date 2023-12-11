import { Lambda } from '@nagisham/standard';

import { EventEngine, Events } from 'src/engine';

export type WithPrevious<T> = Lambda<[previous: T], NonNullable<T>>;

export type State = Record<string, any>;

export interface SingleAccessor<T = any> {
  (): T;
  (value: Partial<T> | Lambda<[previous: T], Partial<T>>): void;
}

export type IndexAccessor<T = any> = SingleAccessor<T[]> & {
  (key: number | string): T;
  (key: number | string, value: T | WithPrevious<T>): void;
};

export type KeyAccessor<T extends State | undefined = State> = SingleAccessor<T> & {
  <K extends keyof T>(key: K): T[K];
  <K extends keyof T>(key: K, value: T[K] | WithPrevious<T[K]>): void;
};

export type StoreEvents<T = any> = {
  change: T;
  cleanup: void;
};

export type Store<
  A extends SingleAccessor | KeyAccessor | IndexAccessor = SingleAccessor<unknown>,
  S extends Events = StoreEvents<unknown>,
  E extends object = {},
> = A & EventEngine<S> & E;
