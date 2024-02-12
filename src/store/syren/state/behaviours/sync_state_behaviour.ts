import { Provider, is_not_null } from "@nagisham/standard";

import { StateBehaviour } from "../types";

export function sync_state_behaviour<VALUE>(provider: Provider<VALUE>): StateBehaviour<VALUE> {
	return (_, set, del) => {
		const initial = provider.get();
		if (is_not_null(initial)) set.emit(initial);

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
