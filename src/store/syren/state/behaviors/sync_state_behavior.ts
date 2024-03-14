import { Provider, is_not_null } from "@nagisham/standard";

import { StateBehavior } from "../types";

export function sync_state_behavior<VALUE>(provider: Provider<VALUE>): StateBehavior<VALUE> {
	return ({ state }) => {
		const initial = provider.get();
		if (is_not_null(initial)) state.set.emit(initial);

		state.set.listen({
			handler: (arg) => {
				provider.set(arg.state);
			},
		});

		state.delete.listen({
			handler: (arg) => {
				arg.deleted = provider.delete();
			},
		});
	};
}
