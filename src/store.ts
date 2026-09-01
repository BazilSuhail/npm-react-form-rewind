// Lightweight ref-based store with per-field subscriptions.
// Only the fields that change re-render — not the entire form.

export type Listener = () => void;

export interface FormStore {
  getState: () => Record<string, unknown>;
  setState: (name: string, value: unknown) => void;
  setValues: (values: Record<string, unknown>) => void;
  subscribe: (name: string, listener: Listener) => () => void;
  subscribeAll: (listener: Listener) => () => void;
  getFieldValue: (name: string) => unknown;
}

export function createStore(initial: Record<string, unknown>): FormStore {
  let state = { ...initial };
  const fieldListeners = new Map<string, Set<Listener>>();
  const allListeners = new Set<Listener>();

  const notify = (name: string) => {
    fieldListeners.get(name)?.forEach((fn) => fn());
    allListeners.forEach((fn) => fn());
  };

  return {
    getState: () => state,

    setState: (name, value) => {
      if (Object.is(state[name], value)) return;
      state = { ...state, [name]: value };
      notify(name);
    },

    setValues: (values) => {
      const keys = Object.keys(values);
      const next = { ...state };
      let changed = false;
      for (const k of keys) {
        if (!Object.is(next[k], values[k])) {
          next[k] = values[k];
          changed = true;
        }
      }
      if (!changed) return;
      state = next;
      for (const k of keys) notify(k);
    },

    subscribe: (name, listener) => {
      if (!fieldListeners.has(name)) fieldListeners.set(name, new Set());
      fieldListeners.get(name)!.add(listener);
      return () => {
        fieldListeners.get(name)?.delete(listener);
      };
    },

    subscribeAll: (listener) => {
      allListeners.add(listener);
      return () => allListeners.delete(listener);
    },

    getFieldValue: (name) => state[name],
  };
}

// --- Nested path helpers (dot notation) ---

export function getNestedValue(state: Record<string, unknown>, path: string): unknown {
  if (!path.includes(".")) return state[path];
  const parts = path.split(".");
  let cur: unknown = state;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function setNestedValue(
  state: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  if (!path.includes(".")) return { ...state, [path]: value };
  const parts = path.split(".");
  const result = { ...state };
  let cur: Record<string, unknown> = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    cur[p] = { ...(cur[p] as Record<string, unknown>) };
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return result;
}

export function flattenState(
  state: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in state) {
    result[key] = state[key];
  }
  return result;
}
