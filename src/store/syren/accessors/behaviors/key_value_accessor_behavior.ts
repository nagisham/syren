import { is_array, is_string } from "@nagisham/standard";

import { AccessorBehavior } from "../types";
import { KeyValueAccessor } from "./types";

export function key_value_accessor_behavior<T extends Record<string, any>>(): AccessorBehavior<
	T,
	KeyValueAccessor<T>
> {
	return ({ access, state: { get, set } }) => {
		access.listen({
			patch: { mode: "before", name: "get-state-as-single-accessor" },
			handler: {
				name: "get-state-as-key-value-accessor",
				handle: (arg, api) => {
					const { params } = arg;
					if (is_array(params, 1)) {
						const [key] = params;
						const state = get.emit();
						if (state && is_string(key)) {
							arg.state = state[key];
							api.abort();
						}
					}
				},
			},
		});

		access.listen({
			patch: { mode: "before", name: "set-state-as-single-accessor" },
			handler: {
				name: "set-state-as-key-value-accessor",
				handle: (arg, api) => {
					const { params } = arg;
					if (is_array(params, 2)) {
						const [key, next] = params;
						if (key) {
							set.emit(Object.assign({}, get.emit(), { [key]: next }));
							api.abort();
						}
					}
				},
			},
		});
	};
}
