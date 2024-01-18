import { Lambda } from "@nagisham/standard";

type Type = string | number | symbol;
export interface Action<TYPE = Type, ARGS = unknown, API = void> {
	type: TYPE;
	args: ARGS;
	api: API;
}

type Handler<ARGS, API = void> = Lambda<[args: ARGS, api: API], void>;

export type HandlersState<E> = {
	[K in keyof E]?: Handler<E[K]>[];
};

interface State<STATE, API = any> {
	get: <K extends keyof STATE>(type: K) => Handler<STATE[K], API>[];
	set: <K extends keyof STATE>(type: K, handler: Handler<STATE[K], API>) => void;
}

export function handlers_state<STATE>(): State<STATE> {
	const state: HandlersState<STATE> = {};

	const get = <K extends keyof STATE>(type: K) => {
		return (state[type] ??= []);
	};

	const set = <K extends keyof STATE>(type: K, handler: Handler<STATE[K]>) => {
		get(type).push(handler);
	};

	return { get, set };
}

interface Runner0<STATE, API = void> {
	run: <KEY extends keyof STATE>(
		handlers: Handler<STATE[KEY], API>[],
		args: STATE[KEY],
	) => STATE[KEY];
}

type Runner = {
	<ARGS, RETURN, API = void>(handlers: Handler<ARGS, API>[], args: ARGS): RETURN;
};

export function event_runner0<STATE>(): Runner0<STATE> {
	return {
		run: (handlers, args) => {
			handlers.forEach((handler) => handler(args));
			return args;
		},
	};
}

export const event_runner = (handlers, args) => {
	handlers.forEach((handler) => handler(args));
};

interface PipelineApi {
	readonly aborted: boolean;
	abort: () => void;
}

function pipeline_api(): PipelineApi {
	let aborted = false;

	return {
		get aborted() {
			return aborted;
		},
		abort() {
			aborted = true;
		},
	};
}

export function pipeline_runner<STATE>(): Runner0<STATE, PipelineApi> {
	return {
		run: (handlers, args) => {
			const api = pipeline_api();

			for (const handler of handlers) {
				if (api.aborted) break;
				handler(args, api);
			}

			return args;
		},
	};
}

export function engine<STATE, API>(state: State<STATE, API>, runner: Runner0<STATE, API>) {
	const { get, set, remove } = state;
	const { run } = runner;

	function dispatch<KEY extends keyof STATE>(type: KEY, arg: STATE[KEY]) {
		const handlers = get(type);
		return run<KEY>(handlers, arg);
	}

	function register<KEY extends keyof STATE>(type: KEY, handler: Handler<STATE[KEY], API>) {
		set(type, handler);
		return () => remove(type, handler);
	}

	return {
		dispatch,
		register,
	};
}

export function emiter<STATE>() {
	return engine(handlers_state<STATE>(), event_runner0());
}

const events = emiter<{ change: number }>();

events.register("change", (value) => {
	value;
});

events.dispatch("change", 1);

export function pipelines<STATE>() {
	return engine(handlers_state<STATE>(), pipeline_runner<STATE>());
}

const lines = pipelines<{ get: { count: number }; set: { text: string } }>();

lines.register("get", (args, api) => {
	args;
	api;
});

lines.dispatch("get", { count: 0 });
lines.dispatch("set", { text: "hello world" });

export function pipeline<STATE>() {
	return engine(handlers_state<{ 0: STATE }>(), pipeline_runner());
}

const get = pipeline<{ state: unknown }>();

get.register(0, (args, api) => {
	args;
	api;
});

get.dispatch(0, { state: undefined });
