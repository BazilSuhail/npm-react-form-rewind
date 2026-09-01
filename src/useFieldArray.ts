import { useCallback, useEffect, useState } from "react";
import type { FormStore } from "./store";
import { getNestedValue, setNestedValue } from "./store";

export interface UseFieldArrayOptions {
  name: string;
}

export interface UseFieldArrayReturn<T = unknown> {
  fields: T[];
  append: (value: T) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  insert: (index: number, value: T) => void;
  update: (index: number, value: T) => void;
  swap: (a: number, b: number) => void;
  clear: () => void;
}

export function useFieldArray<T = unknown>(
  options: UseFieldArrayOptions,
  form: {
    store: FormStore;
    _defaultValues: Record<string, unknown>;
    _syncFieldState?: (name: string, value: unknown) => void;
  },
): UseFieldArrayReturn<T> {
  const { name } = options;
  const { store, _syncFieldState } = form;

  // Subscribe to this field's array changes
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return store.subscribe(name, () => forceUpdate((v) => v + 1));
  }, [name, store]);

  const fields = (getNestedValue(store.getState(), name) ?? []) as T[];

  const setArray = useCallback((arr: T[]) => {
    store.setState(name, arr);
    _syncFieldState?.(name, arr);
  }, [name, store, _syncFieldState]);

  const append = useCallback((value: T) => {
    const current = (getNestedValue(store.getState(), name) ?? []) as T[];
    setArray([...current, value]);
  }, [name, store, setArray]);

  const remove = useCallback((index: number) => {
    const current = (getNestedValue(store.getState(), name) ?? []) as T[];
    const next = current.filter((_, i) => i !== index);
    setArray(next);
  }, [name, store, setArray]);

  const move = useCallback((from: number, to: number) => {
    const current = (getNestedValue(store.getState(), name) ?? []) as T[];
    const next = [...current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setArray(next);
  }, [name, store, setArray]);

  const insert = useCallback((index: number, value: T) => {
    const current = (getNestedValue(store.getState(), name) ?? []) as T[];
    const next = [...current];
    next.splice(index, 0, value);
    setArray(next);
  }, [name, store, setArray]);

  const update = useCallback((index: number, value: T) => {
    const current = (getNestedValue(store.getState(), name) ?? []) as T[];
    const next = [...current];
    next[index] = value;
    setArray(next);
  }, [name, store, setArray]);

  const swap = useCallback((a: number, b: number) => {
    const current = (getNestedValue(store.getState(), name) ?? []) as T[];
    const next = [...current];
    const temp = next[a];
    next[a] = next[b];
    next[b] = temp;
    setArray(next);
  }, [name, store, setArray]);

  const clear = useCallback(() => {
    setArray([]);
  }, [setArray]);

  return { fields, append, remove, move, insert, update, swap, clear };
}
