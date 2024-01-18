function storage_in_browser(storage: Storage) {
  function getItem<T>(key: string) {
    let value = storage.getItem(key);

    try {
      if (value) {
        value = JSON.parse(value);
      }
    } catch {
      // value is just text;
    }

    return value as T | null;
  }

  function setItem<T>(key: string, value: T) {
    storage.setItem(key, JSON.stringify(value));
  }

  function removeItem(key: string) {
    storage.removeItem(key);
  }

  function key(index: number) {
    return storage.key(index);
  }

  function clear() {
    storage.clear();
  }

  return {
    get length() {
      return storage.length;
    },
    getItem,
    setItem,
    removeItem,
    key,
    clear,
  };
}

function storage_in_memory() {
  let state: Record<string, string> = {};

  function getItem<T>(key: string) {
    let value = state[key];

    try {
      if (value) {
        value = JSON.parse(value);
      }
    } catch {
      // value is just text;
    }

    return (value ? value : null) as T | null;
  }

  function setItem<T>(key: string, value: T) {
    state[key] = JSON.stringify(value);
  }

  function removeItem(key: string) {
    delete state[key];
  }

  function key(index: number) {
    return Object.keys(state)[index] ?? null;
  }

  function clear() {
    state = {};
  }

  return {
    get length() {
      return localStorage.length;
    },
    getItem,
    setItem,
    removeItem,
    key,
    clear,
  };
}

export function local_storage() {
  return typeof localStorage === 'undefined'
    ? storage_in_memory()
    : storage_in_browser(localStorage);
}

export function session_storage() {
  return typeof sessionStorage === 'undefined'
    ? storage_in_memory()
    : storage_in_browser(sessionStorage);
}
