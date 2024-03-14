import { Emitter, Pipeline, emitter } from "@nagisham/eventable";
import { Provider, in_memory_provider, local_storage_provider, struct } from "@nagisham/standard";

import { syren } from "../syren";

import { State, state } from "../syren/state";
import { state_behavior, sync_state_behavior } from "../syren/state/behaviors";

import { accessor } from "../syren/accessors";
import {
	KeyValueAccessor,
	SingleAccessor,
	key_value_accessor_behavior,
	single_accessor_behavior,
} from "../syren/accessors/behaviors";

import { EngineBehavior, engine } from "../syren/engine";
import {
	delete_state_on_cleanup_behavior,
	emit_change_on_set_behavior,
	eventable_to_engine_behavior,
	run_listener_on_listening_change_event_behavior,
} from "../syren/engine/behaviors";

import { StoreEvents } from "../types";
// import { SignalStruct } from "./types";

export type Slice<T extends Record<string, any> = {}> = SingleAccessor<T> &
	KeyValueAccessor<T> &
	Emitter<StoreEvents<T>>;

// export type Slice<T extends State | undefined> = Store<KeyAccessor<T>, StoreEvents<T>>;

// export type Middleware = <T>(api: StateEngine<T> & EventEngine<StoreEvents<T>>) => void;

// export type SliceStruct = {
// 	<T extends Record<string, any>>(initial: T, middlewares?: Middleware[]): Slice<T>;
// 	<T extends Record<string, any>>(middlewares?: Middleware[]): Slice<T | undefined>;
// };

export type SliceStruct = {
	<T extends Record<string, any>>(): Slice<Partial<T>>;
	<T extends Record<string, any>>(initial: T): Slice<T>;
};

export const slice = struct(
	<T extends Record<string, any>, R>(
		initial?: T,
		middlewares?: EngineBehavior<T, Emitter<StoreEvents<T>>, R>,
	) => {
		const value = initial ?? <T>{};
		middlewares ??= (() => {}) as any;

		return syren({
			state: state(
				state_behavior(in_memory_provider(value)),
				// sync_state_behavior(local_storage_provider("key", value)),
			),
			eventable: emitter<StoreEvents<T | undefined>>(),
			accessor: accessor(single_accessor_behavior(), key_value_accessor_behavior()),
			engine: engine(
				eventable_to_engine_behavior(),
				emit_change_on_set_behavior(),
				run_listener_on_listening_change_event_behavior(),
				delete_state_on_cleanup_behavior(),
				// sync_state_behavior(local_storage_provider("key", value)),
				middlewares!,
			),
		});
	},
);

interface Counter {
	count: number;
}

const initial: Counter = { count: 0 };

export const count = slice(
	initial,
	engine(
		sync_state_behavior(local_storage_provider("key", initial)),
		//
	),
);
