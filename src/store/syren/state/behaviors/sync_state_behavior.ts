import { Provider, is_not_null } from "@nagisham/standard";

import { StateBehavior } from "../types";

export function sync_state_behavior<VALUE>(provider: Provider<VALUE>): StateBehavior<VALUE> {
	return (_, set, del) => {
		const initial = provider.get();
		if (is_not_null(initial)) set.emit(initial);

		set.listen({
			handler: (arg) => {
				provider.set(arg.state);
			},
		});

		del.listen({
			handler: (arg) => {
				arg.deleted = provider.delete();
			},
		});
	};
}
