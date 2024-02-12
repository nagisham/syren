import { Pipeline, Emiter, emiter } from "@nagisham/eventable";
import { in_memory_provider } from "@nagisham/standard";
import { accesser, single_accesser_behaviour } from "./accessers";
import { State, state, state_behaviour } from "./state";

type SytrenOptions<STATE, ACCESSOR, EVENTABLE, ENGINE> = {
	state: State<STATE>;
	eventable: EVENTABLE;
	accessor: (state: State<STATE>) => ACCESSOR;
	engine?: (state: State<STATE>, eventable: EVENTABLE) => ENGINE;
};

export const syren = <STATE, ACCESSOR extends {}, EVENTABLE extends Emiter | Pipeline, ENGINE>(
	options: SytrenOptions<STATE, ACCESSOR, EVENTABLE, ENGINE>,
) => {
	const { state, eventable, accessor, engine } = options;
	return Object.assign(accessor(state), eventable, engine?.(state, eventable));
};

export type StoreEvents<T = any> = {
	change: T;
	cleanup: void;
};

export function signal<T>(initial?: T) {
	return syren({
		state: state(state_behaviour(in_memory_provider(initial))),
		eventable: emiter<StoreEvents<T>>(),
		accessor: accesser(single_accesser_behaviour()),
	});
}
