import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { validateField, validateAll } from "./validation";
import type { FieldRules, FieldError, FormRewindContextValue, FieldHistory } from "./types";

const FormRewindContext = createContext<FormRewindContextValue | null>(null);

export function useFormRewindContext(): FormRewindContextValue {
  const ctx = useContext(FormRewindContext);
  if (!ctx) throw new Error("useFormRewindContext must be used within <FormRewind>");
  return ctx;
}

export interface FormRewindProps {
  initialState: Record<string, unknown>;
  children: ReactNode;
  onSubmit?: (state: Record<string, unknown>) => void;
  maxHistory?: number;
  debounceMs?: number;
  persist?: { key: string; debounceMs?: number; version?: number } | false;
  keyboard?: boolean;
}

const DEFAULT_DEBOUNCE = 300;

export function FormRewind({
  initialState,
  children,
  onSubmit,
  maxHistory = 100,
  debounceMs = DEFAULT_DEBOUNCE,
  persist,
  keyboard = false,
}: FormRewindProps) {
  const [state, setStateRaw] = useState<Record<string, unknown>>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [errors, setErrors] = useState<Record<string, FieldError>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Per-field history: { fieldName: { past: [...], future: [...] } }
  const historyRef = useRef<Record<string, FieldHistory>>({});

  // Per-field debounce timers
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const pendingRef = useRef<Record<string, unknown | null>>({});
  const preDebounceRef = useRef<Record<string, unknown | null>>({});

  // Field rules registry
  const rulesRef = useRef<Record<string, FieldRules>>({});

  // Persist
  const persistConfig = persist && typeof persist === "object" ? persist : null;

  const hasStorage = typeof window !== "undefined" && !!window.localStorage;

  const saveDraft = useCallback(
    (s: Record<string, unknown>) => {
      if (!persistConfig || !hasStorage) return;
      try {
        window.localStorage.setItem(
          persistConfig.key,
          JSON.stringify({ __s: s, __v: persistConfig.version ?? 1 }),
        );
      } catch { /* silent */ }
    },
    [persistConfig, hasStorage],
  );

  const registerField = useCallback((name: string, rules?: FieldRules) => {
    rulesRef.current[name] = rules ?? {};
    if (!historyRef.current[name]) {
      historyRef.current[name] = { past: [], future: [] };
    }
  }, []);

  const unregisterField = useCallback((name: string) => {
    delete rulesRef.current[name];
    delete historyRef.current[name];
    delete debounceRef.current[name];
    delete pendingRef.current[name];
    delete preDebounceRef.current[name];
  }, []);

  const setError = useCallback((name: string, error: FieldError) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const clearError = useCallback((name: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const touch = useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  // Push old value onto field's history
  const pushFieldPast = useCallback(
    (name: string, value: unknown) => {
      const h = historyRef.current[name] ?? { past: [], future: [] };
      h.past.push(value);
      if (h.past.length > maxHistory) h.past.shift();
      h.future = []; // clear redo on new edit
      historyRef.current[name] = h;
    },
    [maxHistory],
  );

  // Set a single field value
  const setFieldValue = useCallback(
    (name: string, value: unknown) => {
      const prev = stateRef.current[name];
      if (Object.is(prev, value)) return;

      // Update form state
      const next = { ...stateRef.current, [name]: value };
      setStateRaw(next);
      stateRef.current = next;
      saveDraft(next);

      // Per-field debounce
      if (debounceMs <= 0) {
        pushFieldPast(name, prev);
        return;
      }

      if (pendingRef.current[name] === null) {
        preDebounceRef.current[name] = prev;
      }
      pendingRef.current[name] = value;

      if (debounceRef.current[name] !== null) {
        clearTimeout(debounceRef.current[name]!);
      }

      debounceRef.current[name] = setTimeout(() => {
        pushFieldPast(name, preDebounceRef.current[name]);
        debounceRef.current[name] = null;
        pendingRef.current[name] = null;
        preDebounceRef.current[name] = null;
      }, debounceMs);

      // Validate on change if touched
      if (touched[name] && rulesRef.current[name]) {
        const error = validateField(value, rulesRef.current[name]);
        if (error) {
          setErrors((prev) => ({ ...prev, [name]: error }));
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
          });
        }
      }
    },
    [debounceMs, pushFieldPast, saveDraft, touched],
  );

  // Undo a single field
  const undoField = useCallback(
    (name: string) => {
      // Flush pending debounce for this field
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
      saveDraft(next);
    },
    [pushFieldPast, saveDraft],
  );

  // Redo a single field
  const redoField = useCallback(
    (name: string) => {
      const h = historyRef.current[name];
      if (!h || h.future.length === 0) return;

      const next_val = h.future.pop()!;
      h.past.push(stateRef.current[name]);

      const next = { ...stateRef.current, [name]: next_val };
      setStateRaw(next);
      stateRef.current = next;
      saveDraft(next);
    },
    [saveDraft],
  );

  // Get focused field name from DOM
  const getFocusedField = useCallback((): string | null => {
    const el = document.activeElement;
    if (!el || !(el instanceof HTMLElement)) return null;
    const name = el.getAttribute("name") || el.getAttribute("data-field");
    if (name && rulesRef.current[name]) return name;
    return null;
  }, []);

  // Keyboard shortcuts: field-level Ctrl+Z / Ctrl+Shift+Z
  const keyboardHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  keyboardHandlerRef.current = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || e.key !== "z") return;
    const name = getFocusedField();
    if (!name) return;
    e.preventDefault();
    if (e.shiftKey) {
      redoField(name);
    } else {
      undoField(name);
    }
  };

  // Setup / teardown keyboard listener
  const keyboardRef = useRef(keyboard);
  keyboardRef.current = keyboard;

  const [listenerActive, setListenerActive] = useState(false);
  if (keyboard && !listenerActive) {
    window.addEventListener("keydown", (e) => keyboardHandlerRef.current?.(e));
    setListenerActive(true);
  }
  if (!keyboard && listenerActive) {
    window.removeEventListener("keydown", (e) => keyboardHandlerRef.current?.(e));
    setListenerActive(false);
  }

  // Submit handler
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      const allTouched: Record<string, boolean> = {};
      for (const name in rulesRef.current) {
        allTouched[name] = true;
      }
      setTouched(allTouched);

      const allErrors = validateAll(stateRef.current, rulesRef.current);
      setErrors(allErrors);

      if (Object.keys(allErrors).length === 0 && onSubmit) {
        onSubmit(stateRef.current);
      }

      return Object.keys(allErrors).length === 0;
    },
    [onSubmit],
  );

  // Build fields metadata
  const fieldsMeta: Record<string, import("./types").FieldMeta> = {};
  for (const name in rulesRef.current) {
    const h = historyRef.current[name];
    fieldsMeta[name] = {
      name,
      rules: rulesRef.current[name],
      touched: !!touched[name],
      canUndo: h ? h.past.length > 0 : false,
      canRedo: h ? h.future.length > 0 : false,
    };
  }

  const ctx: FormRewindContextValue = {
    state,
    setState: setFieldValue,
    errors,
    setError,
    clearError,
    touched,
    touch,
    fields: fieldsMeta,
    registerField,
    unregisterField,
    undoField,
    redoField,
  };

  return (
    <FormRewindContext.Provider value={ctx}>
      <form onSubmit={handleSubmit} noValidate>
        {children}
      </form>
    </FormRewindContext.Provider>
  );
}

export { FormRewindContext };
