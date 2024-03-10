import { Emitter, Pipeline } from "@nagisham/eventable";

import { State } from "./state";

type SyrenOptions<STATE, ACCESSOR, EVENTABLE, ENGINE> = {
	state: State<STATE>;
	eventable: EVENTABLE;
	accessor: (state: State<STATE>) => ACCESSOR;
	engine?: (state: State<STATE>, eventable: EVENTABLE) => ENGINE;
};

export const syren = <STATE, ACCESSOR extends {}, EVENTABLE extends Emitter | Pipeline, ENGINE>(
	options: SyrenOptions<STATE, ACCESSOR, EVENTABLE, ENGINE>,
) => {
	const { state, eventable, accessor, engine } = options;
	return Object.assign(accessor(state), engine?.(state, eventable));
};
