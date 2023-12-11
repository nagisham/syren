import { Signal, Slice, State, Storage, signal, slice, storage } from 'src/store';

export function is_signal<A, T>(object: A | Signal<T>): object is Signal<T> {
  return object instanceof signal;
}

export function is_slice<A, T extends State | undefined>(object: A | Slice<T>): object is Slice<T> {
  return object instanceof slice;
}

export function is_storage<A, T>(object: A | Storage<T>): object is Storage<T> {
  return object instanceof storage;
}
