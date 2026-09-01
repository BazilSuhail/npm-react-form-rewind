import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FieldRules, FieldError } from "./validation";
import { validateField, validateAll } from "./validation";
import { createStore, getNestedValue, setNestedValue } from "./store";
import type { FormStore } from "./store";

export interface UseFormOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  defaultValues: T;
  persist?: { key: string; version?: number } | false;
  keyboard?: boolean;
}

export interface FormState {
  errors: Record<string, FieldError>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitCount: number;
}

export interface UseFormReturn<T extends Record<string, unknown> = Record<string, unknown>> {
  register: (name: keyof T & string, rules?: FieldRules) => {
    name: string;
    value: string | number | boolean | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
    ref: (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => void;
  };
  getFieldState: (name: keyof T & string) => {
    value: unknown;
    error: FieldError | undefined;
    touched: boolean;
  };
  setValue: (name: keyof T & string, value: unknown) => void;
  getValue: (name: keyof T & string) => unknown;
  watch: (fields?: (keyof T & string) | (keyof T & string)[]) => unknown | Record<string, unknown>;
  reset: (values?: Partial<T>) => void;
  clearErrors: (name?: keyof T & string) => void;
  setError: (name: keyof T & string, error: FieldError) => void;
  trigger: (fields?: (keyof T & string) | (keyof T & string)[]) => Promise<boolean>;
  handleSubmit: (onSubmit: (data: T) => void | Promise<void>) => (e?: React.FormEvent) => Promise<boolean>;
  formState: FormState;
  undoField: (name: keyof T & string) => void;
  redoField: (name: keyof T & string) => void;
  canUndoField: (name: keyof T & string) => boolean;
  canRedoField: (name: keyof T & string) => boolean;
  store: FormStore;
  _defaultValues: T;
  _syncFieldState: (name: keyof T & string, value: unknown) => void;
}

// ---- Draft persistence ----

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readDraft(key: string, version: number): Record<string, unknown> | null {
  try {
    if (!hasStorage()) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.__v !== version) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.__s;
  } catch {
    return null;
  }
}

function writeDraft(key: string, state: Record<string, unknown>, version: number): void {
  try {
    if (!hasStorage()) return;
    window.localStorage.setItem(key, JSON.stringify({ __s: state, __v: version }));
  } catch { /* silent */ }
}

function removeDraft(key: string): void {
  try {
    if (!hasStorage()) return;
    window.localStorage.removeItem(key);
  } catch { /* silent */ }
}

// ---- Field history (per-field undo/redo) ----

interface FieldHistory {
  past: unknown[];
  future: unknown[];
}

const MAX_HISTORY = 100;
const DEFAULT_DEBOUNCE = 300;

export function useForm<T extends Record<string, unknown> = Record<string, unknown>>(options: UseFormOptions<T>): UseFormReturn<T> {
  const { defaultValues, persist: persistOpt, keyboard = false } = options;
  const persist = persistOpt && typeof persistOpt === "object" ? persistOpt : null;

  // ---- State ----
  const [state, setStateRaw] = useState<Record<string, unknown>>(() => {
    if (persist) {
      const draft = readDraft(persist.key, persist.version ?? 1);
      if (draft) return draft;
    }
    return { ...defaultValues };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const [errors, setErrors] = useState<Record<string, FieldError>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  // Refs for fast access
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const touchedRef = useRef(touched);
  touchedRef.current = touched;

  // ---- Store (for field subscriptions) ----
  const storeRef = useRef<FormStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createStore(state);
  }
  const store = storeRef.current;

  // ---- Field history ----
  const historyRef = useRef<Record<string, FieldHistory>>({});
  const rulesRef = useRef<Record<string, FieldRules>>({});
  const fieldElsRef = useRef<Record<string, HTMLElement>>({});

  // ---- Debounce ----
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const pendingRef = useRef<Record<string, unknown | null>>({});
  const preDebounceRef = useRef<Record<string, unknown | null>>({});

  // ---- Persist ----
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistConfigRef = useRef(persist);
  persistConfigRef.current = persist;

  const schedulePersist = useCallback((next: Record<string, unknown>) => {
    const pc = persistConfigRef.current;
    if (!pc) return;
    if (persistTimerRef.current !== null) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      writeDraft(pc.key, next, pc.version ?? 1);
      persistTimerRef.current = null;
    }, 500);
  }, []);

  const persistNow = useCallback((next: Record<string, unknown>) => {
    const pc = persistConfigRef.current;
    if (!pc) return;
    if (persistTimerRef.current !== null) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    writeDraft(pc.key, next, pc.version ?? 1);
  }, []);

  // ---- Push to field history ----
  const pushFieldPast = useCallback((name: string, value: unknown) => {
    const h = historyRef.current[name] ?? { past: [], future: [] };
    h.past.push(value);
    if (h.past.length > MAX_HISTORY) h.past.shift();
    h.future = [];
    historyRef.current[name] = h;
  }, []);

  // ---- Set a single field value ----
  const setValue = useCallback((name: string, value: unknown) => {
    const prev = getNestedValue(stateRef.current, name);
    if (Object.is(prev, value)) return;

    const next = setNestedValue(stateRef.current, name, value);
    setStateRaw(next);
    stateRef.current = next;
    store.setState(name, value);
    schedulePersist(next);

    // Debounce history push
    if (DEFAULT_DEBOUNCE <= 0) {
      pushFieldPast(name, prev);
    } else {
      if (pendingRef.current[name] == null) {
        preDebounceRef.current[name] = prev;
      }
      pendingRef.current[name] = value;
      if (debounceRef.current[name] !== null) clearTimeout(debounceRef.current[name]!);
      debounceRef.current[name] = setTimeout(() => {
        pushFieldPast(name, preDebounceRef.current[name]);
        debounceRef.current[name] = null;
        pendingRef.current[name] = null;
        preDebounceRef.current[name] = null;
      }, DEFAULT_DEBOUNCE);
    }

    // Validate on change if touched
    if (touchedRef.current[name] && rulesRef.current[name]) {
      validateField(value, rulesRef.current[name]).then((error) => {
        setErrors((prev) => {
          if (error) return { ...prev, [name]: error };
          const next = { ...prev };
          delete next[name];
          return next;
        });
      });
    }
  }, [pushFieldPast, schedulePersist, store]);

  const getValue = useCallback((name: string) => {
    return getNestedValue(store.getState(), name);
  }, [store]);

  // ---- Undo / Redo a single field ----
  const undoField = useCallback((name: string) => {
    if (debounceRef.current[name] !== null) {
      clearTimeout(debounceRef.current[name]!);
      debounceRef.current[name] = null;
      if (pendingRef.current[name] !== null && preDebounceRef.current[name] !== null) {
        pushFieldPast(name, preDebounceRef.current[name]);
        pendingRef.current[name] = null;
        preDebounceRef.current[name] = null;
      }
    }
    const h = historyRef.current[name];
    if (!h || h.past.length === 0) return;
    const prev = h.past.pop()!;
    h.future.push(stateRef.current[name]);
    const next = { ...stateRef.current, [name]: prev };
    setStateRaw(next);
    stateRef.current = next;
    store.setState(name, prev);
    persistNow(next);
  }, [pushFieldPast, persistNow, store]);

  const redoField = useCallback((name: string) => {
    const h = historyRef.current[name];
    if (!h || h.future.length === 0) return;
    const nextVal = h.future.pop()!;
    h.past.push(stateRef.current[name]);
    const next = { ...stateRef.current, [name]: nextVal };
    setStateRaw(next);
    stateRef.current = next;
    store.setState(name, nextVal);
    persistNow(next);
  }, [persistNow, store]);

  const canUndoField = useCallback((name: string) => {
    const h = historyRef.current[name];
    return h ? h.past.length > 0 : false;
  }, []);

  const canRedoField = useCallback((name: string) => {
    const h = historyRef.current[name];
    return h ? h.future.length > 0 : false;
  }, []);

  // ---- Watch (reads from store — the source of truth) ----
  const watch = useCallback((fields?: string | string[]): unknown | Record<string, unknown> => {
    const current = store.getState();
    if (!fields) return current;
    if (typeof fields === "string") return getNestedValue(current, fields);
    const result: Record<string, unknown> = {};
    for (const f of fields) {
      result[f] = getNestedValue(current, f);
    }
    return result;
  }, [store]);

  // ---- Register field ----
  const register = useCallback((name: string, rules?: FieldRules) => {
    rulesRef.current[name] = rules ?? {};
    if (!historyRef.current[name]) {
      historyRef.current[name] = { past: [], future: [] };
    }

    return {
      name,
      value: stateRef.current[name] as string | number | boolean | undefined ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const val = e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
        setValue(name, val);
      },
      onBlur: () => {
        setTouched((prev) => ({ ...prev, [name]: true }));
      },
      ref: (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
        if (el) {
          fieldElsRef.current[name] = el;
          // Set name attribute for keyboard handler
          if (!el.getAttribute("name")) el.setAttribute("name", name);
          if (!el.getAttribute("data-field")) el.setAttribute("data-field", name);
        } else {
          delete fieldElsRef.current[name];
        }
      },
    };
  }, [setValue]);

  // ---- Get field state ----
  const getFieldState = useCallback((name: string) => {
    return {
      value: getNestedValue(store.getState(), name),
      error: errorsRef.current[name],
      touched: !!touchedRef.current[name],
    };
  }, [store]);

  // ---- Clear errors ----
  const clearErrors = useCallback((name?: string) => {
    if (name) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } else {
      setErrors({});
    }
  }, []);

  // ---- Set error (for server-side errors) ----
  const setError = useCallback((name: string, error: FieldError) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  // ---- Trigger validation ----
  const trigger = useCallback(async (fields?: string | string[]): Promise<boolean> => {
    const currentState = store.getState();
    const fieldsToValidate = fields
      ? (typeof fields === "string" ? [fields] : fields)
      : Object.keys(rulesRef.current);

    let allValid = true;
    const newErrors: Record<string, FieldError> = {};

    for (const name of fieldsToValidate) {
      if (!rulesRef.current[name]) continue;
      const error = await validateField(currentState[name], rulesRef.current[name]);
      if (error) {
        newErrors[name] = error;
        allValid = false;
      }
    }

    // Merge with existing errors
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return allValid;
  }, [store]);

  // ---- Handle submit ----
  const handleSubmit = useCallback(
    (onSubmit: (data: T) => void | Promise<void>) => {
      return async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Read latest state from store (source of truth)
        const currentState = store.getState();

        // Touch all fields
        const allTouched: Record<string, boolean> = {};
        for (const name in rulesRef.current) allTouched[name] = true;
        setTouched(allTouched);

        // Validate all (async)
        const allErrors = await validateAll(currentState, rulesRef.current);
        setErrors(allErrors);

        if (Object.keys(allErrors).length === 0) {
          setIsSubmitting(true);
          try {
            await onSubmit(currentState as T);
            setIsSubmitted(true);
            setSubmitCount((c) => c + 1);
          } catch {
            // onSubmit threw — isSubmitting will be reset below
          } finally {
            setIsSubmitting(false);
          }
        } else {
          // Focus first error field
          const firstName = Object.keys(allErrors)[0];
          const el = fieldElsRef.current[firstName];
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          setSubmitCount((c) => c + 1);
        }

        return Object.keys(allErrors).length === 0;
      };
    },
    [store],
  );

  // ---- Sync field state (for useFieldArray) ----
  const _syncFieldState = useCallback((name: string, value: unknown) => {
    const next = setNestedValue(stateRef.current, name, value);
    setStateRaw(next);
    stateRef.current = next;
    schedulePersist(next);
  }, [schedulePersist]);

  // ---- Reset ----
  const reset = useCallback((values?: Record<string, unknown>) => {
    const next = values ?? { ...defaultValues };
    setStateRaw(next);
    stateRef.current = next;
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsSubmitted(false);
    setSubmitCount(0);
    historyRef.current = {};
    for (const name in debounceRef.current) {
      if (debounceRef.current[name] !== null) clearTimeout(debounceRef.current[name]!);
    }
    debounceRef.current = {};
    pendingRef.current = {};
    preDebounceRef.current = {};
    // Update store for all fields
    store.setValues(next);
    if (persist) writeDraft(persist.key, next, persist.version ?? 1);
  }, [defaultValues, persist, store]);

  // ---- Keyboard shortcuts ----
  const keyboardHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  keyboardHandlerRef.current = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || e.key !== "z") return;
    // Find focused field
    const el = document.activeElement;
    if (!el || !(el instanceof HTMLElement)) return;
    const name = el.getAttribute("name") || el.getAttribute("data-field");
    if (name && rulesRef.current[name]) {
      e.preventDefault();
      if (e.shiftKey) redoField(name);
      else undoField(name);
    }
  };

  useEffect(() => {
    if (!keyboard) return;
    const handler = (e: KeyboardEvent) => keyboardHandlerRef.current?.(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keyboard]);

  // ---- Cleanup timers on unmount ----
  useEffect(() => {
    return () => {
      for (const name in debounceRef.current) {
        if (debounceRef.current[name] !== null) clearTimeout(debounceRef.current[name]!);
      }
      if (persistTimerRef.current !== null) clearTimeout(persistTimerRef.current);
    };
  }, []);

  // ---- Form state flags ----
  // Subscribe to store to recompute isDirty when field components update store directly
  const [, forceStoreSync] = useState(0);
  useEffect(() => {
    return store.subscribeAll(() => forceStoreSync((v) => v + 1));
  }, [store]);

  const currentStoreState = store.getState();
  const isDirty = useMemo(() => {
    for (const key in defaultValues) {
      if (!Object.is(currentStoreState[key], defaultValues[key])) return true;
    }
    return false;
  }, [currentStoreState, defaultValues]);

  const isValid = Object.keys(errors).length === 0;

  const formState: FormState = useMemo(() => ({
    errors,
    touched,
    isDirty,
    isValid,
    isSubmitting,
    isSubmitted,
    submitCount,
  }), [errors, touched, isDirty, isValid, isSubmitting, isSubmitted, submitCount]);

  // ---- Subscribe to store for watch reactivity ----
  // The watch() function is reactive when called during render
  // It uses a ref so the latest state is always available

  return {
    register,
    getFieldState,
    setValue,
    getValue,
    watch,
    reset,
    clearErrors,
    setError,
    trigger,
    handleSubmit,
    formState,
    undoField,
    redoField,
    canUndoField,
    canRedoField,
    store,
    _defaultValues: defaultValues,
    _syncFieldState,
  };
}
