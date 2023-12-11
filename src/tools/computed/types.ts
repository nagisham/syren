import { Signal } from 'src/store';

type Get<S extends Signal<any>> = S extends Signal<infer R> ? R : never;

export interface ComputedOptions<T, S extends any[]> {
  listener: (...args: { [K in keyof S]: Get<S[K]> }) => T;
  dependency: S;
}

export type Computed = {
  <T, S extends [Signal]>(options: ComputedOptions<T, S>): Signal<T>;
  <T, S extends [Signal, Signal]>(options: ComputedOptions<T, S>): Signal<T>;
  <T, S extends [Signal, Signal, Signal]>(options: ComputedOptions<T, S>): Signal<T>;
  <T, S extends [Signal, Signal, Signal, Signal]>(options: ComputedOptions<T, S>): Signal<T>;
  <T, S extends [Signal, Signal, Signal, Signal, Signal]>(
    options: ComputedOptions<T, S>,
  ): Signal<T>;
  <T, S extends [Signal, Signal, Signal, Signal, Signal, Signal]>(
    options: ComputedOptions<T, S>,
  ): Signal<T>;
};
