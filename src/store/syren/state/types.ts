import { Pipeline } from "@nagisham/eventable";

export type StateBehavior<S = any> = {
	(options: { state: State<S> }): void;
};

export type State<T = any> = {
	get: Pipeline<{ state?: T }, [], T | undefined>;
	set: Pipeline<{ state: T }, [next: T], void>;
	delete: Pipeline<{ deleted: boolean }, [], boolean>;
};
