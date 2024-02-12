import { pipeline } from "@nagisham/eventable";
import { Provider } from "@nagisham/standard";

import { StateBehaviour } from "./types";

export function state<T>(...behaviours: Array<StateBehaviour<T>>): Provider<T> {
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

	behaviours.forEach((behaviour) => behaviour(get, set, del));

	return {
		get: get.emit,
		set: set.emit,
		delete: del.emit,
	};
}
