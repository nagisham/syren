import { is_array, is_number } from "@nagisham/standard";

import { AccessorBehavior } from "../types";
import { IndexAccessor } from "./types";

export function index_accessor_behavior<T extends any[]>(): AccessorBehavior<T, IndexAccessor<T>> {
	return ({ access, state: { get, set } }) => {
		access.listen({
			patch: { mode: "before", name: "get-state-as-single-accessor" },
			handler: {
				name: "get-state-as-index-accessor",
				handle: (arg, api) => {
					const { params } = arg;

					if (is_array(params, 1)) {
						const [key] = params;
						const state = get.emit();

						if (state && is_number(key)) {
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
				name: "set-state-as-index-accessor",
				handle: (arg, api) => {
					const { params } = arg;

					if (is_array(params, 2)) {
						const [key, next] = params;
						const state = get.emit();

						if (state && key) {
							const old = state.slice() as T;
							old.splice(key, 1, next);
							set.emit(old);
							api.abort();
						}
					}
				},
			},
		});
	};
}
