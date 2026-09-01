import { useCallback, useEffect, useState } from "react";
import type { FieldRules, FieldError } from "./validation";
import { validateField } from "./validation";
import type { FormStore } from "./store";
import { getNestedValue } from "./store";

export interface UseFieldOptions {
  name: string;
  rules?: FieldRules;
}

export interface UseFieldReturn {
  value: unknown;
  error: FieldError | undefined;
  touched: boolean;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

export function useField(
  options: UseFieldOptions,
  form: {
    store: FormStore;
    undoField: (name: string) => void;
    redoField: (name: string) => void;
    canUndoField: (name: string) => boolean;
    canRedoField: (name: string) => boolean;
    _defaultValues: Record<string, unknown>;
  },
): UseFieldReturn {
  const { name, rules } = options;
  const { store, undoField, redoField, canUndoField, canRedoField } = form;

  // Subscribe to this field's changes — only re-renders when THIS field changes
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return store.subscribe(name, () => forceUpdate((v) => v + 1));
  }, [name, store]);

  const value = getNestedValue(store.getState(), name);

  // Validate locally for this field
  const [error, setError] = useState<FieldError | undefined>(undefined);

  const [touched, setTouched] = useState(false);

  // Validate when value or touched changes
  useEffect(() => {
    if (!rules) { setError(undefined); return; }
    let cancelled = false;
    validateField(value, rules).then((e) => {
      if (!cancelled) setError(e ?? undefined);
    });
    return () => { cancelled = true; };
  }, [value, touched, rules]);

  const onChange = useCallback((newValue: unknown) => {
    store.setState(name, newValue);
  }, [name, store]);

  const onBlur = useCallback(() => {
    setTouched(true);
  }, []);

  const handleUndo = useCallback(() => undoField(name), [name, undoField]);
  const handleRedo = useCallback(() => redoField(name), [name, redoField]);

  // Track canUndo/canRedo with a force update
  const [, forceHistory] = useState(0);
  useEffect(() => {
    // Subscribe to all changes to re-check canUndo/canRedo
    return store.subscribeAll(() => forceHistory((v) => v + 1));
  }, [store]);

  return {
    value,
    error,
    touched,
    onChange,
    onBlur,
    canUndo: canUndoField(name),
    canRedo: canRedoField(name),
    undo: handleUndo,
    redo: handleRedo,
  };
}
