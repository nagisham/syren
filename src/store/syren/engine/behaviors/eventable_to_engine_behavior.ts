import { Emitter, Pipeline } from "@nagisham/eventable";

import { EngineBehavior } from "../engine";

export function eventable_to_engine_behavior<S, E extends Emitter | Pipeline>(): EngineBehavior<
  S,
  E,
  E
> {
  return (_state, eventable) => eventable;
}
