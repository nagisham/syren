import type { Arguments, Lambda, Returns } from "@nagisham/standard";
import { is_array, is_not_null, is_number, is_string } from "@nagisham/standard";
import { pipeline } from "@nagisham/eventable";

import { EventEngine, event_engine } from "src/engine";
import { local_storage } from "./local_storage";
import { Pipeline, PipelineRunner } from "./pipeline";

interface StateArgs<T> {
	state: T;
}

type StateBehavior<T = any> = (
	get: Pipeline<[], StateArgs<T>, T>,
	set: Pipeline<[next: T], StateArgs<T>, void>,
) => void;

interface State<T> {
	get: Pipeline<[], StateArgs<T | undefined>, T | undefined>;
	set: Pipeline<[next: T], StateArgs<T>, void>;
}

export function state_engine<T>() {
	return {
		get: pipeline({
			request: (): StateArgs<T | undefined> => ({ state: undefined }),
			response: (arg) => arg.state,
		}),
		set: pipeline({
			request: (next: T): StateArgs<T> => ({ state: next }),
		}),
	};
}

interface InMemoryState<T> {
	current: T | undefined;
}

export function in_memory_state_behavior<T>(): StateBehavior<T> {
	const state: InMemoryState<T> = { current: undefined };

	return (get, set) => {
		get.add({
			type: "get-state-from-memory",
			process: (arg, api) => {
				if (is_not_null(state.current)) {
					arg.state = state.current;
					api.abort();
				}
			},
		});

		set.add({
			type: "set-state-in-memory",
			process: (arg) => {
				state.current = arg.state;
			},
		});
	};
}

const memory_storage = local_storage();

export function local_storage_state_behavior<T>(key: string): StateBehavior<T> {
	return (get, set) => {
		get.add({
			type: "get-state-from-local-storage",
			process: (arg, api) => {
				const current = memory_storage.getItem<T>(key);

				if (current !== null) {
					arg.state = current;
					api.abort();
				}
			},
		});

		set.add({
			type: "set-state-in-local-storage",
			process: (arg) => {
				memory_storage.setItem(key, arg.state);
			},
		});
	};
}

export function default_value_state_behavior<T>(default_value: T): StateBehavior<T> {
	return (get) => {
		get.add({
			type: "get-state-from-default-value",
			process: (arg, api) => {
				arg.state = default_value;
				api.abort();
			},
		});
	};
}

interface ApiOptions<T> {
	query: () => Promise<T>;
	mutate: (...args: any[]) => Promise<boolean>;
}

export function api_state_behavior<T>({ query, mutate }: ApiOptions<T>): StateBehavior<T> {
	return (get, set) => {
		get.add({
			process: async (arg, api) => {
				arg.state = await query();
				api.abort();
			},
		});

		set.add({
			process: (arg) => {
				if (arg.state) {
					return mutate(arg.state);
				}
			},
		});
	};
}

export function state_synchronization_behavior<T>(
	...behaviors: StateBehavior<T>[]
): StateBehavior<T> {
	return (_, set) => {
		const init = pipeline({
			request: (): StateArgs<T | undefined> => ({ state: undefined }),
			response: (arg) => arg.state,
		});

		behaviors.forEach((behavior) => {
			behavior(init, set);
		});

		const initial = init.run();
		if (initial) {
			set.run(initial);
		}
	};
}

type EventsBehavior<T, E> = (
	get: Pipeline<[], StateArgs<T | undefined>, T | undefined>,
	set: Pipeline<[next: T], StateArgs<T>, void>,
	fire: EventEngine<E>["fire"],
	listen: EventEngine<E>["listen"],
) => void;

type ChangeEvent<T> = { change: T };

export function fire_change_event_on_set_behavior<T>(): EventsBehavior<T, ChangeEvent<T>> {
	return (_get, set, fire, _listen) => {
		set.add({
			type: "fire-change-event-on-set",
			process: (arg) => {
				fire("change", arg.state);
			},
		});
	};
}

export function listening_change_event_behavior<T>(): EventsBehavior<T, ChangeEvent<T>> {
	return (get, _set, _fire, listen) => {
		listen({
			type: "listening:change",
			each: (listener) => {
				const state = get.run();
				if (state) {
					listener(state);
				}
			},
		});
	};
}

type CleanupEvent = { cleanup: void };

export function listen_cleanup_event_behavior<T>(clean_value?: T): EventsBehavior<T, CleanupEvent> {
	return (_get, set, _fire, listen) => {
		listen({
			type: "cleanup",
			each: () => {
				set.run(clean_value as T);
			},
		});
	};
}

type AccessorBehavior<T, R extends Lambda = any> = (
	accessor: Pipeline<
		[params: Arguments<R>],
		{ state?: Returns<R>; params: Arguments<R> },
		Returns<R> | undefined
	>,
	get: PipelineRunner<[], T | undefined>,
	set: PipelineRunner<[next: T], void>,
) => void;

type SingleAccessor<T> = {
	(): T;
	(next: Partial<T>): void;
};

export function single_accessor_behavior<T>(): AccessorBehavior<T, SingleAccessor<T>> {
	return (accessor, get, set) => {
		accessor.add({
			type: "get-state-as-single-accessor",
			process: (arg, api) => {
				const { params } = arg;

				if (is_array(params, 0)) {
					arg.state = get();
					api.abort();
				}
			},
		});

		accessor.add({
			type: "set-state-as-single-accessor",
			process: (arg, api) => {
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
		});
	};
}

type KeyValueAccessor<T extends Record<string, any>> = {
	<K extends keyof T>(key: K): T[K];
	<K extends keyof T>(key: K, next: T[K]): void;
};

export function key_value_accessor_behavior<T extends Record<string, any>>(): AccessorBehavior<
	T,
	KeyValueAccessor<T>
> {
	return (accessor, get, set) => {
		accessor.add({
			type: "get-state-as-key-value-accessor",
			before: "get-state-as-single-accessor",
			process: (arg, api) => {
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
		});

		accessor.add({
			type: "set-state-as-key-value-accessor",
			before: "set-state-as-single-accessor",
			process: (arg, api) => {
				const { params } = arg;

				if (is_array(params, 2)) {
					const [key, next] = params;
					if (key) {
						set(Object.assign({}, get(), { [key]: next }));
						api.abort();
					}
				}
			},
		});
	};
}

type IndexAccessor<T extends any[]> = {
	(key: number): T[number];
	(key: number, next: T[number]): void;
};

export function index_accessor_behavior<T extends any[]>(): AccessorBehavior<T, IndexAccessor<T>> {
	return (accessor, get, set) => {
		accessor.add({
			type: "get-state-as-index-accessor",
			before: "get-state-as-single-accessor",
			process: (arg, api) => {
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
		});

		accessor.add({
			type: "set-state-as-index-accessor",
			before: "set-state-as-single-accessor",
			process: (arg, api) => {
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
		});
	};
}

type EngineBehaviour<T, R> = <E>(
	engine: Pipeline<[], R, R>,
	get: Pipeline<[], StateArgs<T | undefined>, T | undefined>,
	set: Pipeline<[next: T], StateArgs<T>, void>,
	fire: EventEngine<E>["fire"],
	listen: EventEngine<E>["listen"],
) => void;

function events_engine_behavior<T, E>(): EngineBehaviour<T, EventEngine<E>> {
	return (engine, _get, _set, fire, listen) => {
		engine.add({
			type: "event-engine-to-engine",
			process: (arg) => {
				arg.fire = fire;
				arg.listen = listen;
			},
		});
	};
}

export function state_adapter<T>(...behaviors: StateBehavior<T>[]): StateBehavior<T> {
	return (get, set) => behaviors.forEach((behavior) => behavior(get, set));
}

export interface EventAdapter {
	<T, E>(behavior: EventsBehavior<T, E>): EventsBehavior<T, E>;
	<T, E1, E2>(behavior_1: EventsBehavior<T, E1>, behavior_2: EventsBehavior<T, E2>): EventsBehavior<
		T,
		E1 & E2
	>;
	<T, E1, E2, E3>(
		behavior_1: EventsBehavior<T, E1>,
		behavior_2: EventsBehavior<T, E2>,
		behavior_3: EventsBehavior<T, E3>,
	): EventsBehavior<T, E1 & E2 & E3>;
}

export const event_adapter: EventAdapter = <T, E>(
	...behaviors: EventsBehavior<T, E>[]
): EventsBehavior<T, E> => {
	return (get, set, fire, listen) =>
		behaviors.forEach((behavior) => behavior(get, set, fire, listen));
};

export interface accessorAdapter {
	<T, R extends Lambda>(behavior: AccessorBehavior<T, R>): AccessorBehavior<T, R>;
	<T, R1 extends Lambda, R2 extends Lambda>(
		behavior_1: AccessorBehavior<T, R1>,
		behavior_2: AccessorBehavior<T, R2>,
	): AccessorBehavior<T, R1 & R2>;
}

export const accessor_adapter: accessorAdapter = <T, R extends Lambda>(
	...behaviors: AccessorBehavior<T, R>[]
): AccessorBehavior<T, R> => {
	return (accessor, get, set) => behaviors.forEach((behavior) => behavior(accessor, get, set));
};

type SyrenBehaviorOptions<T, E, R extends Lambda, A> = {
	state?: StateBehavior<T>;
	events?: EventsBehavior<T, E>;
	accessor?: AccessorBehavior<T, R>;
	engine?: EngineBehaviour<T, E>;
};

export const syren = <T, E, R extends Lambda, A>(options?: SyrenBehaviorOptions<T, E, R, A>) => {
	const { get, set } = state_engine<T>();
	const { fire, listen } = event_engine<E>();

	const accessor = pipeline({
		request: (params: Arguments<R>): { state?: Returns<R>; params: Arguments<R> } => ({ params }),
		response: (arg) => arg.state,
	});

	const engine = pipeline({
		request: () => ({} as A),
		response: (arg) => arg,
	});

	if (options) {
		options.state?.(get, set);
		options.accessor?.(accessor, get.run, set.run);
		options.engine?.(engine, get, set, fire, listen);
	}

	return Object.assign(accessor.run as R, engine.run());
};

export type SignalEvents<T> = { change: T; cleanup: void };

export const signal = <T>(initial: T) => {
	return syren({
		state: state_adapter<T>(in_memory_state_behavior(), default_value_state_behavior(initial)),
		events: event_adapter(
			fire_change_event_on_set_behavior(),
			listen_cleanup_event_behavior(),
			listening_change_event_behavior(),
		),
		accessor: single_accessor_behavior(),
		engine: events_engine_behavior(),
	});
};

// export const storage = <T extends any[]>(initial?: T) => {
//   return syren({
//     state: state_adapter<T>(in_memory_state_behavior(), default_value_state_behavior(initial)),
//     accessor: accessor_adapter(single_accessor_behavior(), index_accessor_behavior()),
//   });
// };

export const syren2 = (...behaviors: Lambda[]) => {
	const args: any[] = [];
	const engine = {};

	behaviors.forEach((behavior) => {
		const result = behavior(...args);
		args.push(result.args);
		Object.assign(engine, result.engine);
	});

	return engine;
};

syren2(
	// pipeline ?
	() => {
		const { get, set } = state_engine();

		in_memory_state_behavior()(get, set);

		const accessor = pipeline({
			request: (params: any): { state?: any; params: any } => ({ params }),
			response: (arg) => arg.state,
		});

		single_accessor_behavior()(accessor, get.run, set.run);

		return {
			args: { get, set },
			engine: accessor.run,
		};
	},
	(state) => {
		function fire() {}
		function listen() {}

		return {
			args: { fire, listen },
			engine: { fire, listen },
		};
	},
	(state, events) => {},
);
