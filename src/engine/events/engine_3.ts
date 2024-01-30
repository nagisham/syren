import { Lambda } from "@nagisham/standard";

type Type = string | number | symbol;

type Action<TYPE extends Type = Type, ARGS = void> = ARGS extends void
	? { type: TYPE }
	: { type: TYPE; args: ARGS };

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

export function handlers_state<STATE>(default_type?: Type): State<STATE> {
	const state: HandlersState<STATE> = {};

	const get = <TYPE extends keyof STATE>(type: TYPE) => {
		const key = (default_type ?? type ?? "default") as TYPE;
		return (state[key] ??= []);
	};

	const set = <TYPE extends keyof STATE>(
		type: TYPE,
		handlers: Array<(args: STATE[TYPE], api: any) => void>,
	) => {
		const key = (default_type ?? type ?? "default") as TYPE;
		state[key] = handlers;
	};

	return { get, set };
}

export type Runner<ARGS, API, PARAMS extends any[], RETURN> = (
	handlers: Array<(args: ARGS, api: API) => void>,
	...params: PARAMS
) => RETURN;

interface EventRunnerOptions<PARAMS extends any[], ARGS = PARAMS> {
	request?: Lambda<PARAMS, ARGS> | undefined;
	midleware?:
		| Lambda<[handler: (args: ARGS, api: void) => void, arg: ARGS, api: void], void>
		| undefined;
}

function forward_params_as_args<PARAMS extends any[], ARGS = PARAMS>(...params: PARAMS) {
	return params as unknown as ARGS;
}

function forward_args_as_return<ARGS, RETURN>(args: ARGS) {
	return args as unknown as RETURN;
}

function run_handler_midleware<ARGS, API>(
	handle: (args: ARGS, api?: API) => void,
	args: ARGS,
	api?: API,
) {
	handle(args, api);
}

export function event_runner<PARAMS extends any[], ARGS = PARAMS>(
	options?: EventRunnerOptions<PARAMS, ARGS>,
) {
	const { request, midleware } = Object.assign(
		{
			request: forward_params_as_args<PARAMS, ARGS>,
			midleware: run_handler_midleware<ARGS, PipelineApi>,
		},
		options,
	);

	return (handlers: Array<(args: ARGS, api: void) => void>, ...params: PARAMS) => {
		handlers.forEach((handler) => midleware(handler, request(...params)));
	};
}

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

interface PipelineRunnerOptions<PARAMS extends any[], ARGS = PARAMS, RETURN = undefined> {
	request?: Lambda<PARAMS, ARGS> | undefined;
	response?: Lambda<[args: ARGS], RETURN> | undefined;
	midleware?:
		| Lambda<[handler: (args: ARGS, api: PipelineApi) => void, arg: ARGS, api: PipelineApi], void>
		| undefined;
}

export function pipeline_runner<PARAMS extends any[], ARGS = PARAMS, RETURN = ARGS>(
	options?: PipelineRunnerOptions<PARAMS, ARGS, RETURN>,
) {
	const { request, response, midleware } = Object.assign(
		{
			request: forward_params_as_args<PARAMS, ARGS>,
			response: forward_args_as_return<ARGS, RETURN>,
			midleware: run_handler_midleware<ARGS, PipelineApi>,
		},
		options,
	);

	return (handlers: Array<(args: ARGS, api: PipelineApi) => void>, ...params: PARAMS) => {
		const args = request(...params);
		const api = pipeline_api();

		for (const handler of handlers) {
			if (api.aborted) break;
			midleware(handler, args, api);
		}

		return response(args);
	};
}

type RegisterTypeOption<TYPE> = {
	type: TYPE;
};

type RegisterSelectorOption<ARGS, SELECTED> = {
	select?: (args: ARGS) => SELECTED;
};

type RegisterHandlerOptions<ARGS, API> =
	| { once?: never; each: (args: ARGS, api: API) => void }
	| { each?: never; once: (args: ARGS, api: API) => void };

type RegisterSpotOptions = {
	patch?:
		| { mode?: never; name?: never }
		| { mode: "prepend" | "append" }
		| { mode: "before" | "after" | "instead"; name: string };
};

type RegisterOptions<API, ARGS, SELECTED = ARGS> = RegisterSelectorOption<ARGS, SELECTED> &
	RegisterSpotOptions &
	RegisterHandlerOptions<SELECTED, API>;

interface EngineConstructor {
	<ARGS, STATE extends Action<Type, ARGS>, API, RETURN, PARAMS extends any[]>(options: {
		state: State<STATE>;
		runner: Runner<STATE, API, PARAMS, RETURN>;
	}): {
		emit: <TYPE extends keyof STATE>(action: Action<TYPE, STATE[TYPE]>) => RETURN;
		register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
			options: RegisterTypeOption<TYPE> & RegisterOptions<API, STATE[TYPE], SELECTED>,
		) => Cleanup;
	};
	<STATE, API, RETURN, PARAMS extends any[], ARGS>(options: {
		state: State<STATE>;
		runner: Runner<STATE[keyof STATE], API, PARAMS, RETURN>;
		action: (args: ARGS) => { type: Type; args: ARGS };
	}): {
		emit: (...args: PARAMS) => RETURN;
		register: <SELECTED = ARGS>(options: RegisterOptions<API, ARGS, SELECTED>) => Cleanup;
	};
}

export const engine: EngineConstructor = <STATE, API, RETURN, PARAMS extends any[], ARGS>(options: {
	state: State<STATE>;
	runner: Runner<STATE[keyof STATE], API, PARAMS, RETURN>;
	action?: (...params: PARAMS) => { type: Type; args: ARGS };
}) => {
	options;
	return {} as any;
};

export type Cleanup = () => void;

interface EmitterOptions<PARAMS extends any[], ARGS = PARAMS> {
	request?: Lambda<PARAMS, ARGS> | undefined;
	midleware?:
		| Lambda<[handler: (args: ARGS, api: void) => void, arg: ARGS, api: void], void>
		| undefined;
	// processors?: Processor<ARGS>[];
}

export function emitter<STATE, PARAMS extends any[] = []>(options?: EmitterOptions<PARAMS, STATE>) {
	const { request, midleware } = options ?? {};

	return engine<STATE, STATE, void, [], PARAMS>({
		state: handlers_state<STATE>(),
		runner: event_runner({ request, midleware }),
	});
}

interface Events<T> {
	change: T;
	cleanup: void;
}

export const events = emitter<Events<number>>();

events.emit({ type: "change", args: 1 });

events.register({
	type: "change",
	each: (number) => {
		console.log("change", number);
	},
});

events.emit({ type: "cleanup" });

events.register({
	type: "cleanup",
	each: () => {
		console.log("cleanup");
	},
});

export function pipelines<STATE>() {
	return engine({
		state: handlers_state<STATE>(),
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

counter.emit({ type: "increment", args: { amount: 1 } });

counter.register({
	type: "increment",
	each: (args, api) => {
		if (api.aborted) return;
		console.log("increment", args.amount);
	},
});

interface PipelineOptions<PARAMS extends any[], ARGS = PARAMS, RETURN = ARGS> {
	request?: Lambda<PARAMS, ARGS> | undefined;
	response?: Lambda<[ARGS], RETURN> | undefined;
	midleware?:
		| Lambda<[handler: (args: ARGS, api: PipelineApi) => void, arg: ARGS, api: PipelineApi], void>
		| undefined;
	// processors?: Processor<ARGS>[];
}

interface PipelineConstructor {
	<STATE, PARAMS extends any[] = [args: STATE], RETURN = STATE>(
		options?: PipelineOptions<PARAMS, STATE, RETURN>,
	): ReturnType<typeof engine<{ type: STATE }, RETURN, PipelineApi, PARAMS, STATE>>;
}

/*
export type Runner<ARGS, API, PARAMS extends any[], RETURN> = (
	handlers: Array<(args: ARGS, api: API) => void>,
	...params: PARAMS
) => RETURN;
*/

export const pipeline = <STATE, PARAMS extends any[] = [args: STATE], RETURN = STATE>(
	options?: PipelineOptions<PARAMS, STATE, RETURN>,
) => {
	const { request, response, midleware } = options ?? {};
	const type = Symbol();

	return engine({
		state: handlers_state<{ type: STATE }>(),
		runner: pipeline_runner({ request, response, midleware }),
		action: (args: STATE) => ({ type, args }),
	});
};

export const increment = pipeline<Increment>();

increment.emit({ amount: 1 });

increment.register({
	each: (args, api) => {
		if (api.aborted) return;
		console.log("increment", args.amount);
	},
});

export const decrement = pipeline({
	request: (amount: number): Decrement => ({ amount }),
});

decrement.emit(1);

decrement.register({
	each: (args, api) => {
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
	each: (args, api) => {
		if (api.aborted) return;
		console.log("increment", args.amount);
	},
});
