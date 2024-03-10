import { Emitter } from "@nagisham/eventable";
import { is_not_null } from "@nagisham/standard";

import { EngineBehavior } from "../engine";

export function run_listener_on_listening_change_event_behavior<
	S,
	E extends Emitter<{ change: S }>,
>(): EngineBehavior<S, E, {}> {
	return (state, eventable) => {
		eventable.listen({
			type: "listening:change",
			handler: (listener) => {
				const current = state.get.emit();
				if (is_not_null(current)) {
					listener(current);
				}
			},
		});

		return {};
	};
}
