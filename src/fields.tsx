import { useEffect } from "react";
import { useFormRewindContext } from "./FormRewindContext";
import type { FieldRules } from "./types";

interface BaseFieldProps {
  name: string;
  label?: string;
  rules?: FieldRules;
  className?: string;
  style?: React.CSSProperties;
}

interface TextFieldProps extends BaseFieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange"> {}

export function TextField({ name, label, rules, className, style, ...inputProps }: TextFieldProps) {
  const ctx = useFormRewindContext();

  useEffect(() => {
    ctx.registerField(name, rules);
    return () => ctx.unregisterField(name);
  }, [name, rules, ctx.registerField, ctx.unregisterField]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    ctx.setState(name, e.target.value);
  };

  const handleBlur = () => {
    ctx.touch(name);
  };

  const error = ctx.errors[name];
  const value = String(ctx.state[name] ?? "");

  return (
    <div className={className} style={style}>
      {label && <label htmlFor={name}>{label}</label>}
      <input
        id={name}
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <span id={`${name}-error`} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}

interface NumberFieldProps extends BaseFieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange" | "type"> {}

export function NumberField({ name, label, rules, className, style, ...inputProps }: NumberFieldProps) {
  const ctx = useFormRewindContext();

  useEffect(() => {
    ctx.registerField(name, rules);
    return () => ctx.unregisterField(name);
  }, [name, rules, ctx.registerField, ctx.unregisterField]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? "" : Number(e.target.value);
    ctx.setState(name, val);
  };

  const handleBlur = () => {
    ctx.touch(name);
  };

  const error = ctx.errors[name];
  const value = ctx.state[name];

  return (
    <div className={className} style={style}>
      {label && <label htmlFor={name}>{label}</label>}
      <input
        id={name}
        type="number"
        value={value === "" || value == null ? "" : Number(value)}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <span id={`${name}-error`} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}

interface CheckboxFieldProps extends BaseFieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "checked" | "onChange"> {}

export function CheckboxField({ name, label, rules, className, style, ...inputProps }: CheckboxFieldProps) {
  const ctx = useFormRewindContext();

  useEffect(() => {
    ctx.registerField(name, rules);
    return () => ctx.unregisterField(name);
  }, [name, rules, ctx.registerField, ctx.unregisterField]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    ctx.setState(name, e.target.checked);
  };

  const error = ctx.errors[name];
  const checked = !!ctx.state[name];

  return (
    <div className={className} style={style}>
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          aria-invalid={!!error}
          {...inputProps}
        />
        {label}
      </label>
      {error && (
        <span role="alert">{error.message}</span>
      )}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends BaseFieldProps {
  options: SelectOption[];
  placeholder?: string;
}

export function SelectField({ name, label, rules, options, placeholder, className, style }: SelectFieldProps) {
  const ctx = useFormRewindContext();

  useEffect(() => {
    ctx.registerField(name, rules);
    return () => ctx.unregisterField(name);
  }, [name, rules, ctx.registerField, ctx.unregisterField]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    ctx.setState(name, e.target.value);
  };

  const handleBlur = () => {
    ctx.touch(name);
  };

  const error = ctx.errors[name];
  const value = String(ctx.state[name] ?? "");

  return (
    <div className={className} style={style}>
      {label && <label htmlFor={name}>{label}</label>}
      <select
        id={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={`${name}-error`} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}

interface TextareaFieldProps extends BaseFieldProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "value" | "onChange"> {}

export function TextareaField({ name, label, rules, className, style, ...textareaProps }: TextareaFieldProps) {
  const ctx = useFormRewindContext();

  useEffect(() => {
    ctx.registerField(name, rules);
    return () => ctx.unregisterField(name);
  }, [name, rules, ctx.registerField, ctx.unregisterField]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    ctx.setState(name, e.target.value);
  };

  const handleBlur = () => {
    ctx.touch(name);
  };

  const error = ctx.errors[name];
  const value = String(ctx.state[name] ?? "");

  return (
    <div className={className} style={style}>
      {label && <label htmlFor={name}>{label}</label>}
      <textarea
        id={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        {...textareaProps}
      />
      {error && (
        <span id={`${name}-error`} role="alert">
          {error.message}
        </span>
      )}
    </div>
  );
}
