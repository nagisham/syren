import { Lambda } from "@nagisham/standard";

type Type = string | number | symbol;
const default_type: symbol = Symbol("default_type");

type Action<TYPE extends Type = Type, ARGS = void> = ARGS extends void
	? { type: TYPE }
	: { type: TYPE; args: ARGS };

interface Creator<TYPE extends Type, PARAMS extends any[] = [], ARGS = undefined> {
	(...params: PARAMS): Action<TYPE, ARGS>;
	type: TYPE;
}

interface ActionConstructor {
	<TYPE extends Type>(type: TYPE): Creator<TYPE>;
	<TYPE extends Type, PARAMS extends any[], ARGS>(
		type: TYPE,
		create: (...params: PARAMS) => ARGS,
	): Creator<TYPE, PARAMS, ARGS>;
}

export const action: ActionConstructor = <TYPE extends Type, PARAMS extends any[], ARGS>(
	type: TYPE,
	create?: (...params: PARAMS) => ARGS,
) => {
	return Object.assign((...params: PARAMS) => ({ type, args: create?.(...params) }), { type });
};

export type HandlersState<E> = {
	[K in keyof E]?: Handle<E[K]>[];
};

interface SingleState<STATE, API = any> {
	get: () => Handle<STATE, API>[];
	set: (options: { handlers: Handle<STATE>[] }) => void;
}

interface MultyState<STATE, API = any> {
	get: <TYPE extends keyof STATE>(type: TYPE) => Handle<STATE[TYPE], API>[];
	set: <TYPE extends keyof STATE>(options: { type: TYPE; handlers: Handle<STATE[TYPE]>[] }) => void;
}

interface HandlersStateConstructor {
	<STATE, API = any>(): MultyState<STATE, API>;
	<STATE, API = any>(default_type: Type): SingleState<STATE, API>;
}

export const handlers_state: HandlersStateConstructor = <STATE>(default_type?: Type) => {
	const state: HandlersState<STATE> = {};

	const get = <K extends keyof STATE>(type?: K) => {
		const key = (default_type ?? type ?? "default") as K;
		return (state[key] ??= []);
	};

	const set = <TYPE extends keyof STATE>({
		type,
		handlers,
	}: {
		type?: TYPE;
		handlers: Handle<STATE[TYPE]>[];
	}) => {
		state[(default_type ?? type) as TYPE] = handlers;
	};

	return { get, set };
};

function event_runner<STATE>() {
	return <TYPE extends keyof STATE>(handlers: Handle<STATE[TYPE], void>[], args: STATE[TYPE]) => {
		handlers.forEach((handler) => handler(args));
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

function pipeline_runner<STATE>() {
	return <TYPE extends keyof STATE>(
		handlers: Handle<STATE[TYPE], PipelineApi>[],
		args: STATE[TYPE],
	) => {
		const api = pipeline_api();

		for (const handler of handlers) {
			if (api.aborted) break;
			handler(args, api);
		}

		return args;
	};
}

type Handle<ARGS, API = {}> = (args: ARGS, api: API) => void;
type Handler<ARGS, API> = Handle<ARGS, API> | { name: string; handle: Handle<ARGS, API> };

type RegisterTypeOption<TYPE> = {
	type: TYPE;
};

type RegisterSelectorOption<ARGS, SELECTED> = {
	select?: (args: ARGS) => SELECTED;
};

type RegisterHandlerOptions<ARGS, API> =
	| { once?: never; each: Handler<ARGS, API> }
	| { each?: never; once: Handler<ARGS, API> };

type RegisterSpotOptions = {
	patch?:
		| { mode?: never; name?: never }
		| { mode: "prepend" | "append" }
		| { mode: "before" | "after" | "instead"; name: string };
};

type RegisterOptions<API, ARGS, SELECTED = ARGS> = RegisterSelectorOption<ARGS, SELECTED> &
	RegisterSpotOptions &
	RegisterHandlerOptions<SELECTED, API>;

type Cleanup = () => void;

interface EngineConstructor {
	<STATE, API>(
		state: SingleState<STATE>,
		runner: (handlers: Handle<STATE, API>[], args: STATE) => STATE,
	): {
		emit: <TYPE extends Type>(action: Action<TYPE, STATE>) => STATE;
		register: <SELECTED = STATE>(options: RegisterOptions<API, STATE, SELECTED>) => Cleanup;
	};
	<STATE, API>(
		state: SingleState<STATE>,
		runner: (handlers: Handle<STATE, API>[], args: STATE) => void,
	): {
		emit: <TYPE extends Type>(action: Action<TYPE, STATE>) => void;
		register: <SELECTED = STATE>(options: RegisterOptions<API, STATE, SELECTED>) => Cleanup;
	};
	<STATE, API, RETURN>(
		state: SingleState<STATE>,
		runner: (handlers: Handle<STATE, API>[], args: STATE) => RETURN,
	): {
		emit: <TYPE extends Type>(action: Action<TYPE, STATE>) => RETURN;
		register: <SELECTED = STATE>(options: RegisterOptions<API, STATE, SELECTED>) => Cleanup;
	};
	<STATE, API>(
		state: MultyState<STATE>,
		runner: <TYPE extends keyof STATE>(
			handlers: Handle<STATE[TYPE], API>[],
			args: STATE[TYPE],
		) => STATE[TYPE],
	): {
		emit: <TYPE extends keyof STATE>(action: Action<TYPE, STATE[TYPE]>) => STATE[TYPE];
		register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
			options: RegisterTypeOption<TYPE> & RegisterOptions<API, STATE[TYPE], SELECTED>,
		) => Cleanup;
	};
	<STATE, API>(
		state: MultyState<STATE>,
		runner: <TYPE extends keyof STATE>(
			handlers: Handle<STATE[TYPE], API>[],
			args: STATE[TYPE],
		) => void,
	): {
		emit: <TYPE extends keyof STATE>(action: Action<TYPE, STATE[TYPE]>) => void;
		register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
			options: RegisterTypeOption<TYPE> & RegisterOptions<API, STATE[TYPE], SELECTED>,
		) => Cleanup;
	};
	<STATE, API, RETURN>(
		state: MultyState<STATE>,
		runner: <TYPE extends keyof STATE>(
			handlers: Handle<STATE[TYPE], API>[],
			args: STATE[TYPE],
		) => RETURN,
	): {
		emit: <TYPE extends keyof STATE>(action: Action<TYPE, STATE[TYPE]>) => RETURN;
		register: <TYPE extends keyof STATE, SELECTED = STATE[TYPE]>(
			options: RegisterTypeOption<TYPE> & RegisterOptions<API, STATE[TYPE], SELECTED>,
		) => Cleanup;
	};
}

export const engine = (<STATE, API, RETURN>(
	state: MultyState<STATE>,
	runner: <TYPE extends keyof STATE>(
		handlers: Handle<STATE[TYPE], API>[],
		args: STATE[TYPE],
	) => RETURN,
) => {
	const { get, set } = state;

	function emit<TYPE extends keyof STATE>(action: Action<TYPE, STATE[TYPE]>) {
		const handlers = get(action.type);

		// any because typescript is crazy here.
		return runner(handlers as any, ("args" in action ? action.args : undefined) as any);
	}

	function register<TYPE extends keyof STATE>(
		options: RegisterTypeOption<TYPE> & RegisterOptions<API, STATE[TYPE], STATE[TYPE]>,
	) {
		const { type, patch, select, once, each } = options;

		let handle: Handle<STATE[TYPE], API>;
		let name: string | undefined = undefined;

		if (once) {
			if ("handle" in once) {
				handle = once.handle;
				name = once.name;
			} else {
				handle = once;
			}
		} else {
			if ("handle" in each) {
				handle = each.handle;
				name = each.name;
			} else {
				handle = each;
			}
		}

		function listener(args: STATE[TYPE], api: API) {
			if (select) {
				args &&= select(args);
			}

			handle(args, api);
		}

		if (name) {
			Object.defineProperty(listener, "name", { value: name });
		}

		let handlers = get(type);
		if (!handlers) set({ type, handlers: [] });

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

		return () => {
			const index = handlers.indexOf(handle);
			if (index === -1) {
				console.warn("event engine: registered listener not found");
				return;
			}

			handlers.splice(index, 1);
		};
	}

	return { emit, register };
}) as EngineConstructor;

export function emitter<STATE>() {
	return engine(handlers_state<STATE>(), event_runner<STATE>());
}

interface Events<T> {
	change: T;
	cleanup: void;
}

const events = emitter<Events<number>>();

events.register({
	type: "change",
	each: (value) => {
		console.log(value);
	},
});

events.emit({ type: "change", args: 1 });
events.emit({ type: "change" });
events.emit({ type: "cleanup" });

export function pipeline<STATE>() {
	return engine(handlers_state<STATE>("d"), pipeline_runner<{ d: STATE }>());
}

interface CounterState {
	state: { count: number };
}

const counter = pipeline<CounterState>();
