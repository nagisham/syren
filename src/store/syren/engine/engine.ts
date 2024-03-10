import { Emitter, Pipeline } from "@nagisham/eventable";

import { State } from "../state";

export type EngineBehavior<S, E extends Emitter | Pipeline, R extends Record<string, any>> = {
	(state: State<S>, eventable: E): R;
};

interface EngineAdapter {
	<T, E extends Emitter | Pipeline, R extends Record<string, any>>(
		behavior: EngineBehavior<T, E, R>,
	): EngineBehavior<T, E, R>;
	<T, E extends Emitter | Pipeline, R1 extends Record<string, any>, R2 extends Record<string, any>>(
		behavior_1: EngineBehavior<T, E, R1>,
		behavior_2: EngineBehavior<T, E, R2>,
	): EngineBehavior<T, E, R1 & R2>;
	<
		T,
		E extends Emitter | Pipeline,
		R1 extends Record<string, any>,
		R2 extends Record<string, any>,
		R3 extends Record<string, any>,
	>(
		behavior_1: EngineBehavior<T, E, R1>,
		behavior_2: EngineBehavior<T, E, R2>,
		behavior_3: EngineBehavior<T, E, R3>,
	): EngineBehavior<T, E, R1 & R2 & R3>;
	<
		T,
		E extends Emitter | Pipeline,
		R1 extends Record<string, any>,
		R2 extends Record<string, any>,
		R3 extends Record<string, any>,
		R4 extends Record<string, any>,
	>(
		behavior_1: EngineBehavior<T, E, R1>,
		behavior_2: EngineBehavior<T, E, R2>,
		behavior_3: EngineBehavior<T, E, R3>,
		behavior_4: EngineBehavior<T, E, R4>,
	): EngineBehavior<T, E, R1 & R2 & R3 & R4>;
	<
		T,
		E extends Emitter | Pipeline,
		R1 extends Record<string, any>,
		R2 extends Record<string, any>,
		R3 extends Record<string, any>,
		R4 extends Record<string, any>,
		R5 extends Record<string, any>,
	>(
		behavior_1: EngineBehavior<T, E, R1>,
		behavior_2: EngineBehavior<T, E, R2>,
		behavior_3: EngineBehavior<T, E, R3>,
		behavior_4: EngineBehavior<T, E, R4>,
		behavior_5: EngineBehavior<T, E, R5>,
	): EngineBehavior<T, E, R1 & R2 & R3 & R4 & R5>;
	<
		T,
		E extends Emitter | Pipeline,
		R1 extends Record<string, any>,
		R2 extends Record<string, any>,
		R3 extends Record<string, any>,
		R4 extends Record<string, any>,
		R5 extends Record<string, any>,
		R6 extends Record<string, any>,
	>(
		behavior_1: EngineBehavior<T, E, R1>,
		behavior_2: EngineBehavior<T, E, R2>,
		behavior_3: EngineBehavior<T, E, R3>,
		behavior_4: EngineBehavior<T, E, R4>,
		behavior_5: EngineBehavior<T, E, R5>,
		behavior_6: EngineBehavior<T, E, R6>,
	): EngineBehavior<T, E, R1 & R2 & R3 & R4 & R5 & R6>;
}

export const engine: EngineAdapter = <
	S,
	E extends Emitter | Pipeline,
	R extends Record<string, any>,
>(
	...behaviors: Array<EngineBehavior<S, E, R>>
) => {
	return (state: State<S>, eventable: E) => {
		const engines = behaviors.map((behavior) => behavior(state, eventable));
		return Object.assign({}, ...engines) as R;
	};
};
