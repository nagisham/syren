import { Pipeline } from "@nagisham/eventable";
import { Arguments, Lambda, Returns } from "@nagisham/standard";
import { State } from "../state";

export type AccessorBehavior<T, R extends Lambda = any> = (options: {
	access: Pipeline<
		{ state?: Returns<R>; params: Arguments<R> },
		[params: Arguments<R>],
		Returns<R> | undefined
	>;
	state: State<T>;
}) => void;
