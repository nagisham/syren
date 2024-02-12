export type SingleAccesser<T> = {
	(): T;
	(next: Partial<T>): void;
};

export type KeyValueAccesser<T extends Record<string, any>> = {
	<K extends keyof T>(key: K): T[K];
	<K extends keyof T>(key: K, next: T[K]): void;
};

export type IndexAccesser<T extends any[]> = {
	(key: number): T[number];
	(key: number, next: T[number]): void;
};
