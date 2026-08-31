import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useFormHistory } from "./useFormHistory";
import { validateField, validateAll } from "./validation";
import type { FieldRules, FieldError, FormRewindContextValue, UseFormHistoryOptions } from "./types";

const FormRewindContext = createContext<FormRewindContextValue | null>(null);

export function useFormRewindContext(): FormRewindContextValue {
  const ctx = useContext(FormRewindContext);
  if (!ctx) throw new Error("useFormRewindContext must be used within <FormRewind>");
  return ctx;
}

export interface FormRewindProps<T extends Record<string, unknown>> {
  initialState: T;
  children: ReactNode;
  onSubmit?: (state: T) => void;
  maxHistory?: UseFormHistoryOptions<T>["maxHistory"];
  debounceMs?: UseFormHistoryOptions<T>["debounceMs"];
  persist?: UseFormHistoryOptions<T>["persist"];
  keyboard?: UseFormHistoryOptions<T>["keyboard"];
}

export function FormRewind<T extends Record<string, unknown>>({
  initialState,
  children,
  onSubmit,
  maxHistory,
  debounceMs,
  persist,
  keyboard,
}: FormRewindProps<T>) {
  const form = useFormHistory(initialState as Record<string, unknown>, {
    maxHistory,
    debounceMs,
    persist: persist as UseFormHistoryOptions<Record<string, unknown>>["persist"],
    keyboard,
  });

  const [errors, setErrors] = useState<Record<string, FieldError>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fieldsRef = useRef<Record<string, FieldRules>>({});

  const registerField = useCallback((name: string, rules?: FieldRules) => {
    fieldsRef.current[name] = rules ?? {};
  }, []);

  const unregisterField = useCallback((name: string) => {
    delete fieldsRef.current[name];
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

  const setFieldValue = useCallback(
    (name: string, value: unknown) => {
      form.setState((prev) => ({ ...prev, [name]: value }), name);

      // Validate on change if touched
      if (touched[name] && fieldsRef.current[name]) {
        const error = validateField(value, fieldsRef.current[name]);
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
    [form.setState, touched],
  );

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      // Touch all fields and validate
      const allTouched: Record<string, boolean> = {};
      for (const name in fieldsRef.current) {
        allTouched[name] = true;
      }
      setTouched(allTouched);

      const allErrors = validateAll(form.state, fieldsRef.current);
      setErrors(allErrors);

      if (Object.keys(allErrors).length === 0 && onSubmit) {
        onSubmit(form.state as T);
      }

      return Object.keys(allErrors).length === 0;
    },
    [form.state, onSubmit],
  );

  const ctx: FormRewindContextValue = {
    state: form.state,
    setState: setFieldValue,
    errors,
    setError,
    clearError,
    touched,
    touch,
    fields: Object.fromEntries(
      Object.entries(fieldsRef.current).map(([name, rules]) => [
        name,
        { name, rules, touched: !!touched[name] },
      ]),
    ),
    registerField,
    unregisterField,
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
