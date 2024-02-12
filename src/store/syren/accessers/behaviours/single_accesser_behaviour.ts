import { is_array } from "@nagisham/standard";

import { AccesserBehaviour } from "../types";
import { SingleAccesser } from "./types";

export function single_accesser_behaviour<T>(): AccesserBehaviour<T, SingleAccesser<T>> {
	return (accesser, get, set) => {
		accesser.register({
			handler: {
				name: "get-state-as-single-accesser",
				handle: (arg, api) => {
					const { params } = arg;

					if (is_array(params, 0)) {
						arg.state = get();
						api.abort();
					}
				},
			},
		});

		accesser.register({
			handler: {
				name: "set-state-as-single-accesser",
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
