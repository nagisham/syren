import { Lambda } from "@nagisham/standard";

type Type = string | number | symbol;

export interface State<STATE, API = any> {
	get: <TYPE extends keyof STATE>(type: TYPE) => Array<(args: STATE[TYPE], api: API) => void>;
	set: <TYPE extends keyof STATE>(
		type: TYPE,
		handlers: Array<(args: STATE[TYPE], api: API) => void>,
	) => void;
}

export type HandlersState<STATE, API = any> = {
	[TYPE in keyof STATE]?: Array<(args: STATE[TYPE], api: API) => void>;
};

interface StateProvider<STATE> {
	get: () => STATE;
	set: (value: STATE) => void;
}

function in_memory_state_provider<STATE>(ininial: STATE): StateProvider<STATE> {
	const state = { current: ininial };

	const get = () => {
		return state.current;
	};

	const set = (value: STATE) => {
		state.current = value;
	};

	return { get, set };
}

export function handlers_state<STATE, API>(
	default_type: Type | undefined,
	provider: StateProvider<HandlersState<STATE, API>>,
): State<STATE> {
	const get = <TYPE extends keyof STATE>(type: TYPE) => {
		const key = (default_type ?? type ?? "default") as TYPE;
		return (provider.get()[key] ??= []);
	};

	const set = <TYPE extends keyof STATE>(
		type: TYPE,
		handlers: Array<(args: STATE[TYPE], api: any) => void>,
	) => {
		const key = (default_type ?? type ?? "default") as TYPE;
		const state = provider.get();
		state[key] = handlers;
		provider.set(state);
	};

	return { get, set };
}

function forward_params_as_args(...params: unknown[]) {
	return params as unknown;
}

function forward_args_as_return(args: unknown) {
	return args;
}

interface RunHandlerMidleware {
	<TYPE extends keyof STATE, STATE, API>(
		handle: (args: STATE[TYPE], api: API) => void,
		args: STATE[TYPE],
		api: API,
	): void;
	<TYPE extends keyof STATE, STATE>(handle: (args: STATE[TYPE]) => void, args: STATE[TYPE]): void;
}

const run_handler_midleware: RunHandlerMidleware = (
	handle: (args: unknown, api?: unknown) => void,
	args: unknown,
	api?: unknown,
) => {
	handle(args, api);
};

interface EventRunnerOptions<STATE, PARAMS extends any[] = []> {
	request?: (<TYPE extends keyof STATE>(...params: PARAMS) => STATE[TYPE]) | undefined;
	midleware?:
		| (<TYPE extends keyof STATE>(handler: (args: STATE[TYPE]) => void, arg: STATE[TYPE]) => void)
		| undefined;
}

export function event_runner<STATE, PARAMS extends any[]>(
	options?: EventRunnerOptions<STATE, PARAMS>,
) {
	const { request, midleware } = Object.assign(
		{
			request: forward_params_as_args,
			midleware: run_handler_midleware,
		},
		options,
	);

	type RETURNS = { [KEY in keyof STATE]: void };

	return <TYPE extends keyof STATE>(
		handlers: Array<(args: STATE[TYPE], api: void) => void>,
		...params: PARAMS
	): RETURNS[TYPE] => {
		return handlers.forEach((handler) => midleware(handler, request<TYPE>(...params)));
	};
}

interface PipelineApi {
	readonly aborted: boolean;
	abort: () => void;
}

declare const pipeline_api: {
	(): PipelineApi;
};

interface PipelineRunnerOptions<
	STATE,
	API,
	RETURNS extends { [KEY in keyof STATE]: any },
	PARAMS extends any[] = [args: STATE[keyof STATE]],
> {
	request?: (<TYPE extends keyof STATE>(...params: PARAMS) => STATE[TYPE]) | undefined;
	response?: (<TYPE extends keyof STATE>(args: STATE[TYPE]) => RETURNS[TYPE]) | undefined;
	midleware?:
		| (<TYPE extends keyof STATE>(
				handler: (args: STATE[TYPE], API: API) => void,
				arg: STATE[TYPE],
				api: API,
		  ) => void)
		| undefined;
}

export function pipeline_runner<
	STATE,
	PARAMS extends any[],
	RETURNS extends { [KEY in keyof STATE]: any } = STATE,
>(options?: PipelineRunnerOptions<STATE, PipelineApi, RETURNS, PARAMS>) {
	const { request, response, midleware } = Object.assign(
		{
			request: forward_params_as_args,
			response: forward_args_as_return,
			midleware: run_handler_midleware,
		},
		options,
	);

	return <TYPE extends keyof STATE>(
		handlers: Array<(args: STATE[TYPE], api: PipelineApi) => void>,
		...params: PARAMS
	) => {
		const args = request<TYPE>(...params);
		const api = pipeline_api();

		for (const handler of handlers) {
			if (api.aborted) break;
			midleware(handler, args, api);
		}

		return response<TYPE>(args);
	};
}

type empty = void | undefined | null;

type RegisterTypeOption<TYPE> = {
	type: TYPE;
};

type RegisterSelectorOption<ARGS, SELECTED> = ARGS extends empty
	? { select?: never }
	: { select?: (args: ARGS) => SELECTED };

type HandleOption<ARGS, API = void> = API extends empty
	?
			| Lambda<[...params: ARGS extends empty ? [] : [args: ARGS]], void>
			| {
					mode?: "once" | "each";
					name?: string;
					handle: Lambda<[...params: ARGS extends empty ? [] : [args: ARGS]], void>;
			  }
	:
			| Lambda<[args: ARGS, api: API], void>
			| {
					mode?: "once" | "each";
					name?: string;
					handle: Lambda<[args: ARGS, api: API], void>;
			  };

type RegisterHandlerOptions<ARGS, API = void> = {
	handler: HandleOption<ARGS, API>;
};

type RegisterSpotOptions = {
	patch?:
		| { mode?: never; name?: never }
		| { mode: "prepend" | "append" }
		| { mode: "before" | "after" | "instead"; name: string };
};

type RegisterOptions<TYPE, API, ARGS, SELECTED = ARGS> = RegisterTypeOption<TYPE> &
	RegisterSelectorOption<ARGS, SELECTED> &
	RegisterSpotOptions &
	RegisterHandlerOptions<SELECTED, API>;

type RegisterTypelessOptions<API, ARGS, SELECTED = ARGS> = RegisterSelectorOption<ARGS, SELECTED> &
	RegisterSpotOptions &
	RegisterHandlerOptions<SELECTED, API>;

type Cleanup = () => void;

interface EngineConstructor {
	<STATE, API, RETURNS extends { [KEY in keyof STATE]: any }, PARAMS extends any[]>(options: {
		type?: Type;
		state_provider: StateProvider<HandlersState<STATE, API>>;
		runner: <TYPE extends keyof STATE>(
			handlers: Array<(args1: STATE[TYPE], api: API) => void>,
			...params: PARAMS
		) => RETURNS[TYPE];
	}): {
		emit: <TYPE extends keyof STATE>(
			...params: STATE[TYPE] extends empty ? [type: TYPE] : [type: TYPE, args: STATE[TYPE]]
		) => RETURNS[TYPE];
		register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
			options: RegisterOptions<TYPE, API, STATE[TYPE], SELECTED>,
		) => Cleanup;
	};
	<
		STATE extends Record<Type, any>,
		API,
		RETURN,
		PARAMS extends any[],
		TYPE extends keyof STATE = STATE extends Record<infer T, any> ? T : never,
		ARGS = STATE extends Record<Type, infer A> ? A : never,
	>(options: {
		type?: TYPE;
		state_provider: StateProvider<HandlersState<STATE, API>>;
		runner: (handlers: Array<(args: ARGS, api: API) => void>, ...params: PARAMS) => RETURN;
		event: (params: PARAMS) => readonly [type: TYPE, ...params: PARAMS];
	}): {
		emit: (...params: PARAMS) => RETURN;
		register: <SELECTED = ARGS>(options: RegisterTypelessOptions<API, ARGS, SELECTED>) => Cleanup;
	};
}

export const engine: EngineConstructor = <
	STATE extends Record<Type, any>,
	RETURNS extends { [KEY in keyof STATE]: any },
	API,
	PARAMS extends any[],
	TYPE extends keyof STATE = STATE extends Record<infer T, any> ? T : never,
>(options: {
	type?: TYPE;
	state_provider: StateProvider<HandlersState<STATE, API>>;
	runner: <TYPE extends keyof STATE>(
		handlers: Array<(args1: STATE[TYPE], api: API) => void>,
		...params: PARAMS
	) => RETURNS[TYPE];
	event?: (params: PARAMS) => readonly [type: TYPE, ...params: PARAMS];
}) => {
	const { runner, event } = options;
	const { get, set } = handlers_state<STATE, API>(options.type, options.state_provider);

	function emit(...params: PARAMS | [type: TYPE, ...params: PARAMS]) {
		const [type, ...args] = event
			? event(params as PARAMS)
			: (params as [type: TYPE, ...params: PARAMS]);

		return runner(get(type), ...args);
	}

	function register<TYPE extends keyof STATE, SELECTED>(
		options: { type?: TYPE } & RegisterTypelessOptions<API, STATE[TYPE], SELECTED>,
	) {
		const { type = "default", patch, select, handler } = options;

		let mode: "once" | "each";
		let name: string;
		let handle: Lambda<[args: SELECTED | void, api?: API], void>;

		if (typeof handler === "function") {
			mode = "each";
			name = "handle";
			handle = handler as Lambda<[args: SELECTED | void, api?: API], void>;
		} else {
			mode = handler.mode ?? "each";
			name = handler.name ?? "handle";
			handle = handler.handle as Lambda<[args: SELECTED | void, api?: API], void>;
		}

		function listener(args: SELECTED | void, api?: API) {
			if (select) {
				args &&= select(args);
			}

			switch (mode) {
				case "each":
					handle(args, api);
					break;
				case "once":
					handle(args, api);
					clear();
					break;
				default:
					console.error("wrong handler mode");
					break;
			}
		}

		function clear() {
			const index = handlers.indexOf(listener);
			if (index === -1) {
				console.warn("event engine: registered listener not found");
				return;
			}

			handlers.splice(index, 1);
		}

		Object.defineProperty(listener, "name", { value: name });

		let handlers = get(type);
		if (!handlers) set(type, (handlers = []));

		switch (patch?.mode) {
			case "prepend": {
				handlers.splice(0, 0, listener);
				break;
			}
			case "append": {
				handlers.push(listener);
				break;
			}
			case "after": {
				const index = handlers.findIndex((handler) => handler.name === patch.name);
				handlers.splice(index + 1, 0, listener);
				break;
			}
			case "before": {
				const index = handlers.findIndex((handler) => handler.name === patch.name);
				handlers.splice(index, 0, listener);
				break;
			}
			case "instead": {
				const index = handlers.findIndex((handler) => handler.name === patch.name);
				handlers.splice(index, 1, listener);
				break;
			}
			default: {
				handlers.push(listener);
				break;
			}
		}

		return clear;
	}

	return { emit, register };
};

export function emitter<STATE>() {
	return engine({
		state_provider: in_memory_state_provider<HandlersState<STATE>>({}),
		runner: event_runner(),
	});
}

interface Events<T> {
	change: T;
	cleanup: void;
}

export const events = emitter<Events<number>>();

events.emit("change", 1);

events.register({
	type: "change",
	handler: function named(number) {
		console.log("change", number);
	},
});

events.emit("cleanup");

events.register({
	type: "cleanup",
	handler: {
		mode: "once",
		handle: () => {
			console.log("cleanup");
		},
	},
});

export function pipe_emitter<STATE>() {
	return engine({
		state_provider: in_memory_state_provider<HandlersState<STATE>>({}),
		runner: pipeline_runner(),
	});
}

export const pipe_events = pipe_emitter<Events<number>>();

pipe_events.emit("change", 1);

pipe_events.register({
	type: "change",
	handler: (number, api) => {
		if (api.aborted) return;
		console.log("change", number);
	},
});

pipe_events.emit("cleanup");

pipe_events.register({
	type: "cleanup",
	handler: (_, api) => {
		if (api.aborted) return;
		console.log("cleanup");
	},
});

export function pipelines<STATE>() {
	return engine({
		state_provider: in_memory_state_provider<HandlersState<STATE>>({}),
		runner: pipeline_runner(),
	});
}

interface Increment {
	amount: number;
}

interface Decrement {
	amount: number;
}

interface CounterState {
	increment: Increment;
	decrement: Decrement;
}

export const counter = pipelines<CounterState>();

counter.emit("increment", { amount: 1 });
counter.emit("decrement", { amount: 1 });

counter.register({
	type: "increment",
	handler: (args, api) => {
		if (api.aborted) return;
		console.log("increment", args.amount);
	},
});

interface PipelineOptions<STATE, PARAMS extends any[], RETURN> {
	request?: ((...params: PARAMS) => STATE) | undefined;
	response?: ((args: STATE) => RETURN) | undefined;
	midleware?:
		| ((handler: (args: STATE, API: PipelineApi) => void, arg: STATE, api: PipelineApi) => void)
		| undefined;
	handlers?: Array<Lambda<[args: STATE, api: PipelineApi], void>>;
}

export const pipeline = <ARGS, PARAMS extends any[] = [args: ARGS], RETURN = ARGS>(
	options?: PipelineOptions<ARGS, PARAMS, RETURN>,
) => {
	const { request, response, midleware, handlers } = options ?? {};
	const type = Symbol();

	type STATE = Record<typeof type, ARGS>;
	type RETURNS = Record<typeof type, RETURN>;

	return engine({
		type,
		state_provider: in_memory_state_provider<HandlersState<STATE, PipelineApi>>({
			[type]: handlers ?? [],
		}),
		runner: pipeline_runner<STATE, PARAMS, RETURNS>({
			request,
			response,
			midleware,
		}),
		event: (params: PARAMS) => <const>[type, ...params],
	});
};

export const increment = pipeline<Increment>();

increment.emit({ amount: 1 });

increment.register({
	handler: (args, api) => {
		if (api.aborted) return;
		console.log("increment", args.amount);
	},
});

increment.register({
	select: (args) => args.amount,
	handler: (amount, api) => {
		if (api.aborted) return;
		console.log("increment", amount);
	},
});

export const decrement = pipeline({
	request: (amount: number): Decrement => ({ amount }),
});

decrement.emit(1);

decrement.register({
	handler: (args, api) => {
		if (api.aborted) return;
		console.log("increment", args.amount);
	},
});

export const count = pipeline({
	request: (amount: number) => ({ amount }),
	response: (args) => args.amount,
});

count.emit(1);

count.register({
	handler: (args, api) => {
		if (api.aborted) return;
		console.log("increment", args.amount);
	},
});

count.register({
	handler: (args, api) => {
		if (api.aborted) return;
		console.log("increment", args.amount);
	},
});
