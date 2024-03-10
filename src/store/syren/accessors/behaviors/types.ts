export type SingleAccessor<T> = {
	(): T;
	(next: Partial<T>): void;
};

export type KeyValueAccessor<T extends Record<string, any>> = {
	<K extends keyof T>(key: K): T[K];
	<K extends keyof T>(key: K, next: T[K]): void;
};

export type IndexAccessor<T extends any[]> = {
	(key: number): T[number];
	(key: number, next: T[number]): void;
};
