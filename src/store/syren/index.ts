export function in_memory_state_engine<T>(initial: T) {
  const state = { current: initial };

  function get() {
    return state.current;
  }

  function set(value: T): void {
    state.current = value;
  }

  return { get, set };
}

export function local_storage_state_engine<T>(key: string) {
  function get() {
    const state = localStorage.getItem(key);
    if (state) {
      return JSON.parse(state);
    }

    return undefined;
  }

  function set(value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  return { get, set };
}

// export function state_engine_builder<T>() {
//   function get() {}

//   function set(next: T) {}

//   return { get, set };
// }

export function local_storage_middleware(key: string) {
  return <T>(state: { get: () => T; set: (next: T) => void }) => {
    const { get, set } = state;

    const initial = get();
    if (initial) {
      localStorage.setItem(key, JSON.stringify(initial));
    }

    state.get = () => {
      let value = get();
      if (!value) {
        var text = localStorage.getItem(key);
        if (text) {
          try {
            value = JSON.parse(text);
          } catch (error) {
            value = text as T;
          }
        }
      }

      return value;
    };

    state.set = (next: T) => {
      localStorage.setItem(key, JSON.stringify(next));
      set(next);
    };

    // const initial = localStorage.getItem(key);

    // if (is_not_null(initial)) {
    //   set(JSON.parse(initial));
    // }

    // listen({
    //   type: 'change',
    //   each: (next) => {
    //     localStorage.setItem(key, JSON.stringify(next));
    //   },
    // });
  };
}

// function syren<S, E, M>(state: S, events: E, middlewares: M[]) {
//   function accessor() {}

//   return Object.assign(accessor, events);
// }

// syren(in_memory_state_engine(true), event_engine, [local_storage_middleware]);
