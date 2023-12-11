import { SingleAccessor, Store, StoreEvents } from '../types';

export type Signal<T = any> = Store<SingleAccessor<T>, StoreEvents<T>>;

export type SignalStruct = {
  <T>(): Signal<T | undefined>;
  <T>(initial: T): Signal<T>;
};
