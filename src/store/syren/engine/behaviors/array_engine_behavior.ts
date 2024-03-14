import { Emitter } from "@nagisham/eventable";
import { Lambda, is_null } from "@nagisham/standard";

import { EngineBehavior } from "../engine";
import { ArrayEvents, StoreEvents } from "src/store";

export interface ArrayEngine<T extends any[]> {
	find: (predicate: Lambda<[T], boolean>) => number;
	insert: {
		(item: T): void;
		(index: number | string, item: T): void;
	};
	remove: (index: number) => T;
	len: {
		(): number;
		(index: number): void;
	};
	each: (action: Lambda<[T, number], void>) => void;
}

export function array_engine_behavior<
	S extends any[],
	E extends Emitter<StoreEvents<S> & ArrayEvents<S>>,
>(): EngineBehavior<S, E, ArrayEngine<S[number]>> {
	type T = S[number];

	return ({ state: { get, set }, eventable }) => {
		function copy() {
			return get.emit()!.slice() as T;
		}

		function find(predicate: Lambda<[T], boolean>) {
			return get.emit()!.findIndex(predicate);
		}

		function insert(item: T): void;
		function insert(index: number, item: T): void;
		function insert(index_item: number | T, item?: T) {
			const array = copy();

			let index: number;
			let element: T;

			if (is_null(item)) {
				index = array?.length;
				element = index_item as T;
			} else {
				index = index_item as number;
				element = item;
			}

			array.splice(index, 0, element);

			set.emit(array);
			eventable.emit("insert", { index, element });
		}

		function remove(index: number) {
			const array = copy();

			const element = array.splice(index, 1)[0];

			set.emit(array);
			eventable.emit("remove", { index, element });

			return element;
		}

		function len(): number;
		function len(index: number): void;
		function len(index?: number) {
			const array = get.emit()!;

			if (is_null(index)) {
				return array.length;
			}

			if (index === 0) {
				eventable.emit("cleanup");
				return;
			}

			let i = array.length;
			while (i > index) {
				i--;
				remove(i);
			}

			return;
		}

		function each(action: Lambda<[T, number], void>) {
			get.emit()!.forEach(action);
		}

		return { find, insert, remove, len, each };
	};
}
