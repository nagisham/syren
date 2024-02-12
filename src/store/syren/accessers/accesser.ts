import { pipeline } from "@nagisham/eventable";
import { Arguments, Lambda, Returns } from "@nagisham/standard";

import { AccesserBehaviour } from "./types";
import { State } from "../state";

type Accesser<S, R extends Lambda = any> = {
	(state: State<S>): R;
};

interface AccesserAdapter {
	<T, R extends Lambda>(behaviour: AccesserBehaviour<T, R>): Accesser<T, R>;
	<T, R1 extends Lambda, R2 extends Lambda>(
		behaviour_1: AccesserBehaviour<T, R1>,
		behaviour_2: AccesserBehaviour<T, R2>,
	): Accesser<T, R1 & R2>;
}

export const accesser: AccesserAdapter = <S, R extends Lambda = any>(
	...behaviours: Array<AccesserBehaviour<S, R>>
) => {
	const access = pipeline({
		request: (params: Arguments<R>): { state?: Returns<R>; params: Arguments<R> } => ({ params }),
		response: (arg) => arg.state,
	});

	return (state: State<S>) => {
		behaviours.forEach((behaviour) => behaviour(access, state.get.emit, state.set.emit));
		return access.emit as R;
	};
};
