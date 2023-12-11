export interface StateEngine<T> {
  get: (previous?: boolean) => T;
  set: (value: T) => void;
}
