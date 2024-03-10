import { Emitter, Pipeline } from "@nagisham/eventable";

import { State } from "../state";

export type EngineBehavior<S, E extends Emitter | Pipeline, R extends Record<string, any>> = {
  (state: State<S>, eventable: E): R;
};

interface EngineAdapter {
  <T, E extends Emitter | Pipeline, R extends Record<string, any>>(
    behavior: EngineBehavior<T, E, R>
  ): EngineBehavior<T, E, R>;
  <T, E extends Emitter | Pipeline, R1 extends Record<string, any>, R2 extends Record<string, any>>(
    behavior_1: EngineBehavior<T, E, R1>,
    behavior_2: EngineBehavior<T, E, R2>
  ): EngineBehavior<T, E, R1 & R2>;
}

export const engine: EngineAdapter = <
  S,
  E extends Emitter | Pipeline,
  R extends Record<string, any>
>(
  ...behaviors: Array<EngineBehavior<S, E, R>>
) => {
  return (state: State<S>, eventable: E) => {
    const engines = behaviors.map((behavior) => behavior(state, eventable));
    return Object.assign({}, ...engines) as R;
  };
};
