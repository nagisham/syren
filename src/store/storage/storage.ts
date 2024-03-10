import { emitter } from "@nagisham/eventable";
import { in_memory_provider, struct } from "@nagisham/standard";

import { syren } from "../syren";

import { state } from "../syren/state";
import { state_behavior } from "../syren/state/behaviors";

import { accessor } from "../syren/accessors";
import { index_accessor_behavior, single_accessor_behavior } from "../syren/accessors/behaviors";

import { engine } from "../syren/engine";
import {
	array_engine_behavior,
	delete_state_on_cleanup_behavior,
	emit_change_on_set_behavior,
	eventable_to_engine_behavior,
	run_listener_on_listening_change_event_behavior,
} from "../syren/engine/behaviors";

import { StoreEvents } from "../types";
import { ArrayEvents, StorageStruct } from "./types";

export const storage = struct<StorageStruct>(<T extends any[]>(elements?: T) =>
	syren({
		state: state(state_behavior(in_memory_provider(elements ?? ([] as unknown as T)))),
		eventable: emitter<StoreEvents<T[]> & ArrayEvents<T>>(),
		accessor: accessor(single_accessor_behavior(), index_accessor_behavior()),
		engine: engine(
			eventable_to_engine_behavior(),
			emit_change_on_set_behavior(),
			run_listener_on_listening_change_event_behavior(),
			delete_state_on_cleanup_behavior(),
			array_engine_behavior(),
		),
	}),
);
