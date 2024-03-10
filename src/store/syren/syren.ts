import { Pipeline, Emitter, emitter } from "@nagisham/eventable";
import { in_memory_provider } from "@nagisham/standard";
import { accessor, single_accessor_behavior } from "./accessors";
import { State, state, state_behavior } from "./state";
import { engine } from "./engine/engine";
import { emit_change_on_set_behavior, eventable_to_engine_behavior } from "./engine/behaviors";

type SyrenOptions<STATE, ACCESSOR, EVENTABLE, ENGINE> = {
  state: State<STATE>;
  eventable: EVENTABLE;
  accessor: (state: State<STATE>) => ACCESSOR;
  engine?: (state: State<STATE>, eventable: EVENTABLE) => ENGINE;
};

export const syren = <STATE, ACCESSOR extends {}, EVENTABLE extends Emitter | Pipeline, ENGINE>(
  options: SyrenOptions<STATE, ACCESSOR, EVENTABLE, ENGINE>
) => {
  const { state, eventable, accessor, engine } = options;
  return Object.assign(accessor(state), engine?.(state, eventable));
};

export type StoreEvents<T = any> = {
  change: T;
  cleanup: void;
};

export function signal<T>(initial?: T) {
  return syren({
    state: state(state_behavior(in_memory_provider(initial))),
    eventable: emitter<StoreEvents<T>>(),
    accessor: accessor(single_accessor_behavior()),
    engine: engine(eventable_to_engine_behavior(), emit_change_on_set_behavior()),
  });
}
