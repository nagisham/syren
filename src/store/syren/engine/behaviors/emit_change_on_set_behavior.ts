import { Emitter, Pipeline } from "@nagisham/eventable";

import { EngineBehavior } from "../engine";

export function emit_change_on_set_behavior<S, E extends Emitter | Pipeline>(): EngineBehavior<
	S,
	E,
	{}
> {
	return ({ state, eventable }) => {
		state.set.listen({
			handler: {
				name: "emit-change-on-set",
				handle: (arg) => {
					eventable.emit("change", arg.state);
				},
			},
		});

		return {};
	};
}
