import { Pipeline } from "@nagisham/eventable";

export type StateBehaviour<T = any> = {
	(
		get: Pipeline<{ state?: T }, [], T | undefined>,
		set: Pipeline<{ state: T }, [next: T], void>,
		del: Pipeline<{ deleted: boolean }, [], boolean>,
	): void;
};
