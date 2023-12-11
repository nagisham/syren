import {
  Lambda,
  is_array,
  is_function,
  is_not_null,
  is_null,
  is_string,
  struct,
  unpack,
} from '@nagisham/standard';

import { event_engine, state_engine } from 'src/engine';

import { StoreEvents, WithPrevious } from '../types';
import { ArrayEvents, StorageStruct } from './types';

export const storage = struct<StorageStruct>(<T>(elements?: T[]) => {
  const { get, set } = state_engine(elements ?? []);
  const { fire, listen } = event_engine<StoreEvents<T[]> & ArrayEvents<T | undefined>>();

  listen({
    type: 'listening:change',
    each: (listener) => {
      get().length && listener(copy());
    },
  });

  listen({
    type: 'cleanup',
    each: () => set([]),
  });

  function copy(previous?: boolean) {
    return get(previous).slice();
  }

  function accesser(
    index_value?: number | string | T[] | WithPrevious<T[]>,
    value?: T | WithPrevious<T | undefined> | undefined,
  ) {
    if (is_null(index_value) && is_null(value)) {
      return copy();
    }

    if (is_array(index_value) || is_function(index_value)) {
      const next = unpack(index_value, copy());
      set(next);
      fire('change', next);
      return;
    }

    if (is_not_null(index_value)) {
      const index = is_string(index_value) ? parseInt(index_value) : index_value;

      if (is_null(value)) {
        return get()[index];
      }

      const old = get()[index];
      insert(index, unpack(value, old));
    }

    return;
  }

  function find(predicate: Lambda<[T], boolean>) {
    return get().findIndex(predicate);
  }

  function insert(item: T): void;
  function insert(index: number, item: T): void;
  function insert(index_item: number | T, item?: T) {
    const array = copy();

    let index: number;
    let element: T;

    if (is_null(item)) {
      index = array.length;
      element = index_item as T;
    } else {
      index = index_item as number;
      element = item;
    }

    array.splice(index, 0, element);

    set(array);
    fire('insert', { index, element });
  }

  function remove(index: number) {
    const array = copy();

    const element = array.splice(index, 1)[0];

    set(array);
    fire('remove', { index, element });

    return element;
  }

  function len(): number;
  function len(index: number): void;
  function len(index?: number) {
    const array = get();

    if (is_null(index)) {
      return array.length;
    }

    if (index === 0) {
      fire('cleanup');
      return;
    }

    let i = array.length;
    while (i > index) {
      i--;
      remove(i);
    }

    return;
  }

  function each(action: Lambda<[T, number], void>) {
    get().forEach(action);
  }

  return Object.assign(accesser, {
    find,
    insert,
    remove,
    len,
    each,
    fire,
    listen,
  });
});
