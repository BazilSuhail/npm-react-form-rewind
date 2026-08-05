import { useCallback, useRef, useState } from "react";
import type { HistoryEntry, UseFormHistoryOptions, UseFormHistoryReturn } from "./types";

const DEFAULT_MAX_HISTORY = 100;

export function useFormHistory<T>(
  initialState: T,
  options: UseFormHistoryOptions<T> = {},
): UseFormHistoryReturn<T> {
  const { maxHistory = DEFAULT_MAX_HISTORY, onUndo, onRedo, onSnapshot } = options;

  const pastRef = useRef<HistoryEntry<T>[]>([]);
  const futureRef = useRef<HistoryEntry<T>[]>([]);

  const [state, setStateRaw] = useState<T>(initialState);
  const stateRef = useRef<T>(initialState);
  stateRef.current = state;

  const [past, setPast] = useState<HistoryEntry<T>[]>([]);
  const [future, setFuture] = useState<HistoryEntry<T>[]>([]);

  const pushToPast = useCallback(
    (entry: HistoryEntry<T>) => {
      const next = [...pastRef.current, entry];
      if (next.length > maxHistory) {
        next.splice(0, next.length - maxHistory);
      }
      pastRef.current = next;
      setPast(next);
    },
    [maxHistory],
  );

  const setState = useCallback(
    (value: T | ((prev: T) => T), label?: string) => {
      const prev = stateRef.current;
      const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

      if (Object.is(prev, next)) return;

      const entry: HistoryEntry<T> = { state: prev, timestamp: Date.now(), label };

      pushToPast(entry);
      futureRef.current = [];
      setFuture([]);
      setStateRaw(next);
      stateRef.current = next;
    },
    [pushToPast],
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    const prev = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, -1);
    pastRef.current = newPast;
    setPast(newPast);

    const currentEntry: HistoryEntry<T> = {
      state: stateRef.current,
      timestamp: Date.now(),
    };
    futureRef.current = [...futureRef.current, currentEntry];
    setFuture(futureRef.current);

    setStateRaw(prev.state);
    stateRef.current = prev.state;
    onUndo?.(prev.state);
  }, [onUndo]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const next = futureRef.current[futureRef.current.length - 1];
    const newFuture = futureRef.current.slice(0, -1);
    futureRef.current = newFuture;
    setFuture(newFuture);

    const currentEntry: HistoryEntry<T> = {
      state: stateRef.current,
      timestamp: Date.now(),
    };
    pastRef.current = [...pastRef.current, currentEntry];
    setPast(pastRef.current);

    setStateRaw(next.state);
    stateRef.current = next.state;
    onRedo?.(next.state);
  }, [onRedo]);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setPast([]);
    setFuture([]);
  }, []);

  const snapshot = useCallback(
    (label?: string) => {
      const entry: HistoryEntry<T> = {
        state: stateRef.current,
        timestamp: Date.now(),
        label,
      };
      pushToPast(entry);
      futureRef.current = [];
      setFuture([]);
      onSnapshot?.(entry);
    },
    [pushToPast, onSnapshot],
  );

  const clearDraft = useCallback(() => {
    clearHistory();
    setStateRaw(initialState);
    stateRef.current = initialState;
  }, [clearHistory, initialState]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    clearHistory,
    clearDraft,
    snapshot,
    past,
    future,
  };
}
