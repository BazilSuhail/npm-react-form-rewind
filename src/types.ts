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
}

export interface FormRewindContextValue {
  state: Record<string, unknown>;
  setState: (name: string, value: unknown) => void;
  errors: Record<string, FieldError>;
  setError: (name: string, error: FieldError) => void;
  clearError: (name: string) => void;
  touched: Record<string, boolean>;
  touch: (name: string) => void;
  fields: Record<string, FieldMeta>;
  registerField: (name: string, rules?: FieldRules) => void;
  unregisterField: (name: string) => void;
}

export type { FieldRules, FieldError } from "./validation";
