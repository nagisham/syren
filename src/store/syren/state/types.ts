import { Pipeline } from "@nagisham/eventable";

export type StateBehavior<T = any> = {
	(
		get: Pipeline<{ state?: T }, [], T | undefined>,
		set: Pipeline<{ state: T }, [next: T], void>,
		del: Pipeline<{ deleted: boolean }, [], boolean>,
	): void;
};

export type State<T = any> = {
	get: Pipeline<{ state?: T }, [], T | undefined>;
	set: Pipeline<{ state: T }, [next: T], void>;
	delete: Pipeline<{ deleted: boolean }, [], boolean>;
};
