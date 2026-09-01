import type { FieldRules, FieldError } from "./validation";

export interface HistoryEntry<T> {
  state: T;
  timestamp: number;
  label?: string;
}

export interface UseFormHistoryOptions<T> {
  maxHistory?: number;
  debounceMs?: number;
  persist?: boolean | PersistOptions;
  keyboard?: boolean;
  onUndo?: (state: T) => void;
  onRedo?: (state: T) => void;
  onSnapshot?: (entry: HistoryEntry<T>) => void;
}

export interface PersistOptions {
  key: string;
  debounceMs?: number;
  version?: number;
}

export interface UseFormHistoryReturn<T> {
  state: T;
  setState: (value: T | ((prev: T) => T), label?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  clearDraft: () => void;
  snapshot: (label?: string) => void;
  past: HistoryEntry<T>[];
  future: HistoryEntry<T>[];
}

export interface FieldMeta {
  name: string;
  rules?: FieldRules;
  touched: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export interface FieldHistory {
  past: unknown[];
  future: unknown[];
}

export type { FieldRules, FieldError };
