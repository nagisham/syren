import { Emitter, Pipeline } from "@nagisham/eventable";
import { State } from "../state";

export type EngineBehavior<S, E extends Emitter | Pipeline> = (
	state: State<S>,
	eventable: E,
) => void;
