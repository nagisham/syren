import { Pipeline, Emiter, emiter } from "@nagisham/eventable";
import { Provider, in_memory_provider } from "@nagisham/standard";
import { accesser, single_accesser_behaviour } from "./accessers";

type SytrenOptions<STATE, ACCESSOR, EVENTABLE, ENGINE> = {
	provider: Provider<STATE>;
	eventable: EVENTABLE;
	accessor: (provider: Provider<STATE>) => ACCESSOR;
	engine?: (provider: Provider<STATE>, eventable: EVENTABLE) => ENGINE;
};

export const syren = <STATE, ACCESSOR extends {}, EVENTABLE extends Emiter | Pipeline, ENGINE>(
	options: SytrenOptions<STATE, ACCESSOR, EVENTABLE, ENGINE>,
) => {
	const { provider, eventable, accessor, engine } = options;
	return Object.assign(accessor(provider), eventable, engine?.(provider, eventable));
};

export type StoreEvents<T = any> = {
	change: T;
	cleanup: void;
};

export function signal<T>(initial?: T) {
	return syren({
		provider: in_memory_provider(initial),
		eventable: emiter<StoreEvents<T>>(),
		accessor: accesser(single_accesser_behaviour()),
	});
}
