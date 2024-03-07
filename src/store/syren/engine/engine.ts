import { pipeline } from "@nagisham/eventable";
import { Arguments, Lambda, Returns } from "@nagisham/standard";

import { EngineBehavior } from "./types";
import { State } from "../state";

type Engine<S, R extends Lambda = any> = {
	(state: State<S>): R;
};

interface EngineAdapter {
	<T, R extends Lambda>(behavior: EngineBehavior<T, R>): Engine<T, R>;
	<T, R1 extends Lambda, R2 extends Lambda>(
		behavior_1: EngineBehavior<T, R1>,
		behavior_2: EngineBehavior<T, R2>,
	): Engine<T, R1 & R2>;
}

export const engine: EngineAdapter = <S, R extends Lambda = any>(
	...behaviors: Array<EngineBehavior<S, R>>
) => {
	const access = pipeline({
		request: (params: Arguments<R>): { state?: Returns<R>; params: Arguments<R> } => ({ params }),
		response: (arg) => arg.state,
	});

	return (state: State<S>) => {
		behaviors.forEach((behavior) => behavior(access, state.get.emit, state.set.emit));
		return access.emit as R;
	};
};
