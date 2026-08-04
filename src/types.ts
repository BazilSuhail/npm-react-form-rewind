export interface HistoryEntry<T> {
  state: T;
  timestamp: number;
  label?: string;
}

export interface HistoryStack<T> {
  past: HistoryEntry<T>[];
  present: T;
  future: HistoryEntry<T>[];
}

export interface UseFormHistoryOptions<T> {
  maxHistory?: number;
  debounceMs?: number;
  persist?: boolean | PersistOptions;
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
