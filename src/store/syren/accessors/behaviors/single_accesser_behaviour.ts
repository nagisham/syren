import { is_array } from "@nagisham/standard";

import { AccessorBehavior } from "../types";
import { SingleAccessor } from "./types";

export function single_accessor_behavior<T>(): AccessorBehavior<T, SingleAccessor<T>> {
	return (accessor, get, set) => {
		accessor.register({
			handler: {
				name: "get-state-as-single-accessor",
				handle: (arg, api) => {
					const { params } = arg;

					if (is_array(params, 0)) {
						arg.state = get();
						api.abort();
					}
				},
			},
		});

		accessor.register({
			handler: {
				name: "set-state-as-single-accessor",
				handle: (arg, api) => {
					const { params } = arg;

					if (is_array(params, 1)) {
						const [next] = params;
						if (next) {
							if (typeof next === "object") {
								set(Object.assign({}, get(), next));
							} else {
								set(next);
							}

							api.abort();
						}
					}
				},
			},
		});
	};
}
