import { useCallback, useEffect, useRef, useState } from "react";
import type { HistoryEntry, PersistOptions, UseFormHistoryOptions, UseFormHistoryReturn } from "./types";

const DEFAULT_MAX_HISTORY = 100;
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_PERSIST_DEBOUNCE_MS = 500;
const DEFAULT_PERSIST_VERSION = 1;

interface PersistStorage {
  key: string;
  debounceMs: number;
  version: number;
}

function normalizePersist(persist: boolean | PersistOptions | undefined): PersistStorage | null {
  if (!persist) return null;
  if (typeof persist === "boolean") return null;
  return {
    key: persist.key,
    debounceMs: persist.debounceMs ?? DEFAULT_PERSIST_DEBOUNCE_MS,
    version: persist.version ?? DEFAULT_PERSIST_VERSION,
  };
}

function readDraft<T>(key: string, version: number): T | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.__version !== version) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.__state as T;
  } catch {
    return null;
  }
}

function writeDraft<T>(key: string, state: T, version: number): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify({ __state: state, __version: version }));
  } catch {
    // localStorage full or disabled — silently ignore
  }
}

function removeDraft(key: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    // silently ignore
  }
}

export function useFormHistory<T>(
  initialState: T,
  options: UseFormHistoryOptions<T> = {},
): UseFormHistoryReturn<T> {
  const {
    maxHistory = DEFAULT_MAX_HISTORY,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    persist: persistOption,
    onUndo,
    onRedo,
    onSnapshot,
  } = options;

  const persist = normalizePersist(persistOption);
  const initializedRef = useRef(false);

  // Hydrate from localStorage on first render
  const [state, setStateRaw] = useState<T>(() => {
    if (persist) {
      const draft = readDraft<T>(persist.key, persist.version);
      if (draft !== null) {
        initializedRef.current = true;
        return draft;
      }
    }
    return initialState;
  });

  const stateRef = useRef<T>(state);
  stateRef.current = state;

  const pastRef = useRef<HistoryEntry<T>[]>([]);
  const futureRef = useRef<HistoryEntry<T>[]>([]);

  const [past, setPast] = useState<HistoryEntry<T>[]>([]);
  const [future, setFuture] = useState<HistoryEntry<T>[]>([]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStateRef = useRef<T | null>(null);
  const preDebounceStateRef = useRef<T | null>(null);

  // Persist debounce timer
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      if (persistTimerRef.current !== null) {
        clearTimeout(persistTimerRef.current);
      }
    };
  }, []);

  // Debounced persist helper
  const schedulePersist = useCallback(
    (nextState: T) => {
      if (!persist) return;
      if (persistTimerRef.current !== null) {
        clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = setTimeout(() => {
        writeDraft(persist.key, nextState, persist.version);
        persistTimerRef.current = null;
      }, persist.debounceMs);
    },
    [persist],
  );

  // Persist immediately (used by undo/redo/snapshot/clearDraft which bypass debounce)
  const persistNow = useCallback(
    (nextState: T) => {
      if (!persist) return;
      if (persistTimerRef.current !== null) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      writeDraft(persist.key, nextState, persist.version);
    },
    [persist],
  );

  const setState = useCallback(
    (value: T | ((prev: T) => T), label?: string) => {
      const prev = stateRef.current;
      const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

      if (Object.is(prev, next)) return;

      setStateRaw(next);
      stateRef.current = next;
      schedulePersist(next);

      if (debounceMs <= 0) {
        const entry: HistoryEntry<T> = { state: prev, timestamp: Date.now(), label };
        pushToPast(entry);
        futureRef.current = [];
        setFuture([]);
        return;
      }

      if (pendingStateRef.current === null) {
        preDebounceStateRef.current = prev;
      }

      pendingStateRef.current = next;

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const entry: HistoryEntry<T> = {
          state: preDebounceStateRef.current!,
          timestamp: Date.now(),
          label,
        };
        pushToPast(entry);
        futureRef.current = [];
        setFuture([]);
        debounceTimerRef.current = null;
        pendingStateRef.current = null;
        preDebounceStateRef.current = null;
      }, debounceMs);
    },
    [debounceMs, pushToPast, schedulePersist],
  );

  const undo = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (pendingStateRef.current !== null && preDebounceStateRef.current !== null) {
      const entry: HistoryEntry<T> = {
        state: preDebounceStateRef.current,
        timestamp: Date.now(),
      };
      pushToPast(entry);
      futureRef.current = [];
      setFuture([]);
      pendingStateRef.current = null;
      preDebounceStateRef.current = null;
    }

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
    persistNow(prev.state);
    onUndo?.(prev.state);
  }, [pushToPast, onUndo, persistNow]);

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
    persistNow(next.state);
    onRedo?.(next.state);
  }, [onRedo, persistNow]);

  const clearHistory = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingStateRef.current = null;
    preDebounceStateRef.current = null;
    pastRef.current = [];
    futureRef.current = [];
    setPast([]);
    setFuture([]);
  }, []);

  const snapshot = useCallback(
    (label?: string) => {
      let didFlush = false;

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (pendingStateRef.current !== null && preDebounceStateRef.current !== null) {
        const entry: HistoryEntry<T> = {
          state: preDebounceStateRef.current,
          timestamp: Date.now(),
        };
        pushToPast(entry);
        futureRef.current = [];
        setFuture([]);
        pendingStateRef.current = null;
        preDebounceStateRef.current = null;
        didFlush = true;
      }

      if (!didFlush) {
        const entry: HistoryEntry<T> = {
          state: stateRef.current,
          timestamp: Date.now(),
          label,
        };
        pushToPast(entry);
        futureRef.current = [];
        setFuture([]);
        onSnapshot?.(entry);
      } else if (label && pastRef.current.length > 0) {
        pastRef.current[pastRef.current.length - 1].label = label;
        setPast([...pastRef.current]);
      }
    },
    [pushToPast, onSnapshot],
  );

  const clearDraft = useCallback(() => {
    clearHistory();
    if (persist) {
      removeDraft(persist.key);
    }
    setStateRaw(initialState);
    stateRef.current = initialState;
  }, [clearHistory, initialState, persist]);

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
