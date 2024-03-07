import { is_array, is_number } from "@nagisham/standard";

import { AccessorBehavior } from "../types";
import { IndexAccesser } from "./types";

export function index_accesser_behaviour<T extends any[]>(): AccessorBehavior<T, IndexAccesser<T>> {
	return (accesser, get, set) => {
		accesser.register({
			patch: { mode: "before", name: "get-state-as-single-accesser" },
			handler: {
				name: "get-state-as-index-accesser",
				handle: (arg, api) => {
					const { params } = arg;

					if (is_array(params, 1)) {
						const [key] = params;
						const state = get();

						if (state && is_number(key)) {
							arg.state = state[key];
							api.abort();
						}
					}
				},
			},
		});

		accesser.register({
			patch: { mode: "before", name: "set-state-as-single-accesser" },
			handler: {
				name: "set-state-as-index-accesser",
				handle: (arg, api) => {
					const { params } = arg;

					if (is_array(params, 2)) {
						const [key, next] = params;
						const state = get();

						if (state && key) {
							const old = state.slice() as T;
							old.splice(key, 1, next);
							set(old);
							api.abort();
						}
					}
				},
			},
		});
	};
}
