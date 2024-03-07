import { Lambda } from "@nagisham/standard";

interface PipelineApi {
	aborted: boolean;
	abort: () => void;
}

export type Process<T> = Lambda<[arg: T, api: PipelineApi], void>;
export type Processor<T> = Process<T> & { type: string };

interface ProcessorConstructor {
	<T>(process: Process<T>): Processor<T>;
	<T>(options: ProcessorOptions<T>): Processor<T>;
}

interface ProcessorOptions<T> {
	type?: string;
	process: Process<T>;
}

export const processor: ProcessorConstructor = <T>(
	options?: Process<T> | ProcessorOptions<T>,
): Processor<T> => {
	if (typeof options === "function") {
		return Object.assign(options, { type: "processor" }) as Processor<T>;
	}
	if (typeof options === "object") {
		const { type = "processor", process } = options;
		return Object.assign(process, { type }) as Processor<T>;
	}

	throw new Error("invalid arguments");
};

export type PipelineRegisterer<A = {}> = Lambda<[options: Process<A> | AddOptions<A>], void>;
export type PipelineRunner<P extends any[] = [], R = void> = Lambda<[...params: P], R>;

export type Pipeline<P extends any[], A = P, R = void> = {
	add: PipelineRegisterer<A>;
	run: PipelineRunner<P, R>;
};

interface PipelineOptions<P extends any[], A = P, R = void> {
	request?: (...params: P) => A;
	response?: (args: A) => R;
	middleware?: (processor: Processor<A>, arg: A, api: PipelineApi) => void;
	processors?: Processor<A>[];
}

interface PipelineConstructor {
	<A extends any[] = []>(): Pipeline<A, A, void>;
	<P extends any[], A = P, R = void>(options?: PipelineOptions<P, A, R>): Pipeline<P, A, R>;
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

function pipeline_options<P extends any[], A = P, R = void>(options?: PipelineOptions<P, A, R>) {
	return Object.assign(
		{
			processors: new Array<Processor<A>>(),
			request(...params: A[]) {
				return params;
			},
			middleware(processor: Processor<A>, arg: A, api: PipelineApi) {
				processor(arg, api);
			},
		},
		options,
	);
}

type AddOptions<A> = (
	| { type?: string; process: Process<A>; processor?: never }
	| { type?: never; process?: never; processor: Processor<A> }
) &
	(
		| {
				before?: string | Processor<A>;
				after?: never;
		  }
		| {
				before?: never;
				after?: string | Processor<A>;
		  }
	);

const padding_option = { before: 0, after: 1 };

export const pipeline: PipelineConstructor = <P extends any[], A = P, R = void>(
	options?: PipelineOptions<P, A, R>,
) => {
	const { processors, request, response, middleware: middleware } = pipeline_options(options);

	function try_register(options: AddOptions<A>, where: keyof typeof padding_option) {
		const target = options[where];
		if (typeof target === "undefined") return;

		const index = processors.findIndex(
			typeof target === "string"
				? (processor) => target === processor.type
				: (processor) => target === processor,
		);

		if (index === -1) return;

		if (options.processor) {
			processors.splice(index + padding_option[where], 0, options.processor);
			return true;
		}
	}

	function add(options: Process<A> | AddOptions<A>) {
		if (typeof options === "function") {
			processors.push(processor(options));
			return;
		}

		if (typeof options === "object") {
			options.processor ??= processor(options);

			if (try_register(options, "before")) return;
			if (try_register(options, "after")) return;

			processors.push(options.processor);
			return;
		}

		throw new Error("invalid arguments");
	}

	function run(...params: P) {
		const arg = request(...params);
		const api = pipeline_api();

		for (const processor of processors) {
			if (api.aborted) break;
			middleware(processor, arg, api);
		}

		return response?.(arg);
	}

	return { add, run };
};
