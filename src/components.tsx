import { useCallback, useEffect, useState } from "react";
import type { FieldRules, FieldError } from "./validation";
import { validateField } from "./validation";
import { useFormContext } from "./context";

interface BaseFieldProps {
  name: string;
  label?: string;
  rules?: FieldRules;
  className?: string;
  style?: React.CSSProperties;
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
  labelClassName?: string;
  errorClassName?: string;
}

function useFieldComponent(name: string, rules?: FieldRules) {
  const { store } = useFormContext();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return store.subscribe(name, () => forceUpdate((v) => v + 1));
  }, [name, store]);

  const value = store.getFieldValue(name);

  const [error, setError] = useState<FieldError | undefined>(undefined);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!rules) { setError(undefined); return; }
    let cancelled = false;
    validateField(value, rules).then((e) => {
      if (!cancelled) setError(e ?? undefined);
    });
    return () => { cancelled = true; };
  }, [value, touched, rules]);

  const onChange = useCallback((v: unknown) => store.setState(name, v), [name, store]);
  const onBlur = useCallback(() => setTouched(true), []);

  const isRequired = !!rules?.required;

  return { value, error, touched, onChange, onBlur, isRequired };
}

// ---- TextField ----

export function TextField({ name, label, rules, className, style, inputClassName, inputStyle, labelClassName, errorClassName, ...inputProps }: BaseFieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange" | "className" | "style">) {
  const { value, error, onChange, onBlur, isRequired } = useFieldComponent(name, rules);

  return (
    <div className={className} style={style}>
      {label && <label className={labelClassName} htmlFor={name}>{label}</label>}
      <input
        id={name}
        type="text"
        name={name}
        data-field={name}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={inputClassName}
        style={inputStyle}
        aria-invalid={!!error}
        aria-required={isRequired || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <span id={`${name}-error`} className={errorClassName} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}

// ---- NumberField ----

export function NumberField({ name, label, rules, className, style, inputClassName, inputStyle, labelClassName, errorClassName, ...inputProps }: BaseFieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange" | "type" | "className" | "style">) {
  const { value, error, onChange, onBlur, isRequired } = useFieldComponent(name, rules);

  return (
    <div className={className} style={style}>
      {label && <label className={labelClassName} htmlFor={name}>{label}</label>}
      <input
        id={name}
        type="number"
        name={name}
        data-field={name}
        value={value === "" || value == null ? "" : Number(value)}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        onBlur={onBlur}
        className={inputClassName}
        style={inputStyle}
        aria-invalid={!!error}
        aria-required={isRequired || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <span id={`${name}-error`} className={errorClassName} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}

// ---- CheckboxField ----

export function CheckboxField({ name, label, rules, className, style, inputClassName, inputStyle, labelClassName, errorClassName, ...inputProps }: BaseFieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "checked" | "onChange" | "className" | "style">) {
  const { value, error, onChange, onBlur, isRequired } = useFieldComponent(name, rules);

  return (
    <div className={className} style={style}>
      <label className={labelClassName}>
        <input
          type="checkbox"
          name={name}
          data-field={name}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
          className={inputClassName}
          style={inputStyle}
          aria-invalid={!!error}
          aria-required={isRequired || undefined}
          {...inputProps}
        />
        {label}
      </label>
      {error && (
        <span className={errorClassName} role="alert">{error.message}</span>
      )}
    </div>
  );
}

// ---- SwitchField ----

export function SwitchField({ name, label, rules, className, style, inputClassName, inputStyle, labelClassName, errorClassName }: BaseFieldProps) {
  const { value, error, onChange, isRequired } = useFieldComponent(name, rules);

  return (
    <div className={className} style={style}>
      <label className={labelClassName}>
        <input
          type="checkbox"
          role="switch"
          name={name}
          data-field={name}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className={inputClassName}
          style={inputStyle}
          aria-invalid={!!error}
          aria-required={isRequired || undefined}
        />
        {label}
      </label>
      {error && (
        <span className={errorClassName} role="alert">{error.message}</span>
      )}
    </div>
  );
}

// ---- SelectField ----

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends BaseFieldProps {
  options: SelectOption[];
  placeholder?: string;
}

export function SelectField({ name, label, rules, options, placeholder, className, style, inputClassName, inputStyle, labelClassName, errorClassName }: SelectFieldProps) {
  const { value, error, onChange, onBlur, isRequired } = useFieldComponent(name, rules);

  return (
    <div className={className} style={style}>
      {label && <label className={labelClassName} htmlFor={name}>{label}</label>}
      <select
        id={name}
        name={name}
        data-field={name}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={inputClassName}
        style={inputStyle}
        aria-invalid={!!error}
        aria-required={isRequired || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <span id={`${name}-error`} className={errorClassName} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}

// ---- RadioField ----

interface RadioFieldProps extends BaseFieldProps {
  options: SelectOption[];
  orientation?: "horizontal" | "vertical";
}

export function RadioField({ name, label, rules, options, orientation = "vertical", className, style, inputClassName, inputStyle, labelClassName, errorClassName }: RadioFieldProps) {
  const { value, error, onChange, onBlur, isRequired } = useFieldComponent(name, rules);

  return (
    <fieldset className={className} style={style} aria-invalid={!!error} aria-required={isRequired || undefined}>
      {label && <legend className={labelClassName}>{label}</legend>}
      <div style={{ display: "flex", flexDirection: orientation === "horizontal" ? "row" : "column", gap: "0.5rem" }}>
        {options.map((opt) => (
          <label key={opt.value} className={labelClassName} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <input
              type="radio"
              name={name}
              data-field={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              className={inputClassName}
              style={inputStyle}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && (
        <span className={errorClassName} role="alert">{error.message}</span>
      )}
    </fieldset>
  );
}

// ---- TextareaField ----

export function TextareaField({ name, label, rules, className, style, inputClassName, inputStyle, labelClassName, errorClassName, ...textareaProps }: BaseFieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "value" | "onChange" | "className" | "style">) {
  const { value, error, onChange, onBlur, isRequired } = useFieldComponent(name, rules);

  return (
    <div className={className} style={style}>
      {label && <label className={labelClassName} htmlFor={name}>{label}</label>}
      <textarea
        id={name}
        name={name}
        data-field={name}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={inputClassName}
        style={inputStyle}
        aria-invalid={!!error}
        aria-required={isRequired || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...textareaProps}
      />
      {error && (
        <span id={`${name}-error`} className={errorClassName} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}
