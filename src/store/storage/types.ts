import { Lambda } from '@nagisham/standard';

import { IndexAccessor, Store, StoreEvents } from '../types';

export type ArrayEvents<T> = {
  insert: { index: number; element: T };
  remove: { index: number; element: T };
};

export interface StorageEngine<T> {
  find: (predicate: Lambda<[T], boolean>) => number;
  insert: {
    (item: T): void;
    (index: number | string, item: T): void;
  };
  remove: (index: number) => T;
  len: {
    (): number;
    (index: number): void;
  };
  each: (action: Lambda<[T, number], void>) => void;
}

export type Storage<T> = Store<
  IndexAccessor<T>,
  StoreEvents<T[]> & ArrayEvents<T>,
  StorageEngine<T>
>;

export type StorageStruct = {
  <T>(): Storage<T>;
  <T>(elements?: T[]): Storage<T>;
};
