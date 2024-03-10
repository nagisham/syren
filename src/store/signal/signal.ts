import { emitter } from "@nagisham/eventable";
import { in_memory_provider, struct } from "@nagisham/standard";

import { syren } from "../syren";

import { state } from "../syren/state";
import { state_behavior } from "../syren/state/behaviors";

import { accessor } from "../syren/accessors";
import { single_accessor_behavior } from "../syren/accessors/behaviors";

import { engine } from "../syren/engine";
import {
	delete_state_on_cleanup_behavior,
	emit_change_on_set_behavior,
	eventable_to_engine_behavior,
	run_listener_on_listening_change_event_behavior,
} from "../syren/engine/behaviors";

import { StoreEvents } from "../types";
import { SignalStruct } from "./types";

export const signal = struct<SignalStruct>(<T>(initial?: T) =>
	syren({
		state: state(state_behavior(in_memory_provider(initial))),
		eventable: emitter<StoreEvents<T | undefined>>(),
		accessor: accessor(single_accessor_behavior<T | undefined>()),
		engine: engine(
			eventable_to_engine_behavior(),
			emit_change_on_set_behavior(),
			run_listener_on_listening_change_event_behavior(),
			delete_state_on_cleanup_behavior(),
		),
	}),
);
