import { Provider, is_not_null } from "@nagisham/standard";

import { StateBehavior } from "../types";

export function state_behavior<VALUE>(provider: Provider<VALUE>): StateBehavior<VALUE> {
	return ({ state }) => {
		state.get.listen({
			handler: (arg, api) => {
				const state = provider.get();
				if (is_not_null(state)) {
					arg.state = state;
					api.abort();
				}
			},
		});

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
