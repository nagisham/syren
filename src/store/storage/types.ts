import { Emitter } from "@nagisham/eventable";

import { IndexAccessor, SingleAccessor } from "../syren/accessors/behaviors";
import { ArrayEngine } from "../syren/engine/behaviors";
import { StoreEvents } from "../types";

export type ArrayEvents<T> = {
	insert: { index: number; element: T };
	remove: { index: number; element: T };
};

export type Storage<T extends any[]> = SingleAccessor<T> &
	IndexAccessor<T> &
	Emitter<StoreEvents<T[]> & ArrayEvents<T>> &
	ArrayEngine<T>;

export type StorageStruct = {
	<T extends any[]>(): Storage<T>;
	<T extends any[]>(elements: T[]): Storage<T>;
};
