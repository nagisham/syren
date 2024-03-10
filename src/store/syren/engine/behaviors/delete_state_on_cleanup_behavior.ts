import { Emitter } from "@nagisham/eventable";

import { EngineBehavior } from "../engine";

export function delete_state_on_cleanup_behavior<
	S,
	E extends Emitter<{ cleanup: void }>,
>(): EngineBehavior<S, E, {}> {
	return (state, eventable) => {
		eventable.listen({
			type: "cleanup",
			handler: () => {
				state.delete.emit();
			},
		});

		return {};
	};
}
