import { EventEngine, StateEngine } from 'src/engine';

import { KeyAccessor, State, Store, StoreEvents } from '../types';

export type Slice<T extends State | undefined> = Store<KeyAccessor<T>, StoreEvents<T>>;

export type Middleware = <T>(api: StateEngine<T> & EventEngine<StoreEvents<T>>) => void;

export type SliceStruct = {
  <T extends State>(middlewares?: Middleware[]): Slice<T | undefined>;
  <T extends State>(initial: T, middlewares?: Middleware[]): Slice<T>;
};
