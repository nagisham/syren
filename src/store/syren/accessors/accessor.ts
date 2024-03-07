import { pipeline } from "@nagisham/eventable";
import { Arguments, Lambda, Returns } from "@nagisham/standard";

import { AccessorBehavior } from "./types";
import { State } from "../state";

type Accessor<S, R extends Lambda = any> = {
	(state: State<S>): R;
};

interface AccessorAdapter {
	<T, R extends Lambda>(behavior: AccessorBehavior<T, R>): Accessor<T, R>;
	<T, R1 extends Lambda, R2 extends Lambda>(
		behavior_1: AccessorBehavior<T, R1>,
		behavior_2: AccessorBehavior<T, R2>,
	): Accessor<T, R1 & R2>;
}

export const accessor: AccessorAdapter = <S, R extends Lambda = any>(
	...behaviors: Array<AccessorBehavior<S, R>>
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
