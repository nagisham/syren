import { StateEngine } from './types';

export function state_engine<T>(): StateEngine<T | undefined>;
export function state_engine<T>(initial: T): StateEngine<T>;
export function state_engine<T>(initial?: T) {
  const state = { current: initial, previous: initial };

  function get(previous?: boolean) {
    return previous ? state.previous : state.current;
  }

  function set(value: T): void {
    state.previous = state.current;
    state.current = value;
  }

  return { get, set };
}
