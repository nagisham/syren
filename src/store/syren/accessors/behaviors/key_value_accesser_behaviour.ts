import { is_array, is_string } from "@nagisham/standard";

import { AccessorBehavior } from "../types";
import { KeyValueAccesser } from "./types";

export function key_value_accesser_behaviour<T extends Record<string, any>>(): AccessorBehavior<
	T,
	KeyValueAccesser<T>
> {
	return (accesser, get, set) => {
		accesser.register({
			patch: { mode: "before", name: "get-state-as-single-accesser" },
			handler: {
				name: "get-state-as-key-value-accesser",
				handle: (arg, api) => {
					const { params } = arg;
					if (is_array(params, 1)) {
						const [key] = params;
						const state = get();
						if (state && is_string(key)) {
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
				name: "set-state-as-key-value-accesser",
				handle: (arg, api) => {
					const { params } = arg;
					if (is_array(params, 2)) {
						const [key, next] = params;
						if (key) {
							set(Object.assign({}, get(), { [key]: next }));
							api.abort();
						}
					}
				},
			},
		});
	};
}
