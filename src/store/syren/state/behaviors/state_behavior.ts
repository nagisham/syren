import { Provider, is_not_null } from "@nagisham/standard";

import { StateBehavior } from "../types";

export function state_behavior<VALUE>(provider: Provider<VALUE>): StateBehavior<VALUE> {
	return (get, set, del) => {
		get.register({
			handler: (arg, api) => {
				const state = provider.get();
				if (is_not_null(state)) {
					arg.state = state;
					api.abort();
				}
			},
		});

		set.register({
			handler: (arg) => {
				provider.set(arg.state);
			},
		});

		del.register({
			handler: (arg) => {
				arg.deleted = provider.delete();
			},
		});
	};
}
