// useForm — main hook (preferred API)
export { useForm } from "./useForm";
export type { UseFormOptions, UseFormReturn, FormState } from "./useForm";

// FormContext — clean component wiring
export { FormProvider, useFormContext } from "./context";

// useField — field-level hook for custom components
export { useField } from "./useField";
export type { UseFieldOptions, UseFieldReturn } from "./useField";

// useFieldArray — dynamic field arrays
export { useFieldArray } from "./useFieldArray";
export type { UseFieldArrayOptions, UseFieldArrayReturn } from "./useFieldArray";

// Field components
export { TextField, NumberField, CheckboxField, SwitchField, SelectField, RadioField, TextareaField } from "./components";

// Validation
export { validateField, validateAll } from "./validation";
export type { FieldRules, FieldError } from "./validation";

// Store (for advanced usage)
export { createStore, getNestedValue, setNestedValue } from "./store";
export type { FormStore } from "./store";

// Types (backward compat)
export type {
  HistoryEntry,
  UseFormHistoryOptions,
  PersistOptions,
  UseFormHistoryReturn,
  FieldMeta,
  FieldHistory,
} from "./types";
