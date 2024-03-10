import { Emitter } from "@nagisham/eventable";

import { SingleAccessor } from "../syren/accessors/behaviors";
import { StoreEvents } from "../types";

export type Signal<T = any> = SingleAccessor<T> & Emitter<StoreEvents<T>>;

export type SignalStruct = {
	<T>(): Signal<T | undefined>;
	<T>(initial: T): Signal<T>;
};
