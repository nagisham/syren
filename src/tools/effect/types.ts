import { Lambda } from '@nagisham/standard';
import { Signal } from 'src/store';

type Get<S extends Signal<any>> = S extends Signal<infer T> ? T : never;

export type Cleanup = Lambda<[], void>;

export interface EffectOptions<S extends any[]> {
  listener: (...args: { [K in keyof S]: NonNullable<Get<S[K]>> }) => void | Cleanup;
  dependency: S;
}

export type Effect = {
  <S extends [Signal]>(options: EffectOptions<S>): Cleanup;
  <S extends [Signal, Signal]>(options: EffectOptions<S>): Cleanup;
  <S extends [Signal, Signal, Signal]>(options: EffectOptions<S>): Cleanup;
  <S extends [Signal, Signal, Signal, Signal]>(options: EffectOptions<S>): Cleanup;
  <S extends Signal[]>(options: EffectOptions<S>): Cleanup;
};
