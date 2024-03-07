import { Pipeline } from "@nagisham/eventable";
import { Arguments, Lambda, Returns } from "@nagisham/standard";

export type EngineBehavior<T, R extends Lambda = any> = (
	accessor: Pipeline<
		{ state?: Returns<R>; params: Arguments<R> },
		[params: Arguments<R>],
		Returns<R> | undefined
	>,
	get: () => T | undefined,
	set: (value: T) => void,
) => void;
