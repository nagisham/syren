import { pipeline } from "@nagisham/eventable";

import { State, StateBehavior } from "./types";

export function state<T>(...behaviors: Array<StateBehavior<T>>): State<T> {
	const get = pipeline({
		request: () => ({} as { state: T }),
		response: (arg) => arg.state,
	});

	const set = pipeline({
		request: (next: T): { state: T } => ({ state: next }),
		response: () => {},
	});

	const del = pipeline({
		request: (): { deleted: boolean } => ({ deleted: false }),
		response: (arg) => arg.deleted,
	});

	behaviors.forEach((behavior) => behavior(get, set, del));

	return { get, set, delete: del };
}
