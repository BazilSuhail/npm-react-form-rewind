export interface FieldRules {
  required?: boolean | string;
  pattern?: RegExp | { value: RegExp; message: string };
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  validate?: (value: unknown) => string | null;
}

export interface FieldError {
  message: string;
  type: string;
}

function unwrap<T>(rule: T | { value: T; message: string }, fallback: string): { value: T; message: string } {
  if (rule && typeof rule === "object" && "value" in rule) {
    return rule as { value: T; message: string };
  }
  return { value: rule as T, message: fallback };
}

export function validateField(value: unknown, rules: FieldRules): FieldError | null {
  const str = typeof value === "string" ? value : String(value ?? "");
  const num = typeof value === "number" ? value : Number(value);

  if (rules.required) {
    const isEmpty = typeof value === "string" ? value.trim() === "" : value == null || value === false;
    if (isEmpty) {
      const msg = typeof rules.required === "string" ? rules.required : "Required";
      return { message: msg, type: "required" };
    }
  }

  if (rules.pattern != null) {
    const { value: pat, message } = unwrap(rules.pattern, "Invalid format");
    if (typeof value === "string" && !pat.test(value)) {
      return { message, type: "pattern" };
    }
  }

  if (rules.minLength != null && typeof value === "string") {
    const { value: min, message } = unwrap(rules.minLength, `Min ${rules.minLength} characters`);
    if (value.length < min) {
      return { message, type: "minLength" };
    }
  }

  if (rules.maxLength != null && typeof value === "string") {
    const { value: max, message } = unwrap(rules.maxLength, `Max ${rules.maxLength} characters`);
    if (value.length > max) {
      return { message, type: "maxLength" };
    }
  }

  if (rules.min != null && !isNaN(num)) {
    const { value: min, message } = unwrap(rules.min, `Min ${rules.min}`);
    if (num < min) {
      return { message, type: "min" };
    }
  }

  if (rules.max != null && !isNaN(num)) {
    const { value: max, message } = unwrap(rules.max, `Max ${rules.max}`);
    if (num > max) {
      return { message, type: "max" };
    }
  }

  if (rules.validate) {
    const err = rules.validate(value);
    if (err) {
      return { message: err, type: "validate" };
    }
  }

  return null;
}

export function validateAll(
  state: Record<string, unknown>,
  fieldRules: Record<string, FieldRules>,
): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {};
  for (const name in fieldRules) {
    const error = validateField(state[name], fieldRules[name]);
    if (error) {
      errors[name] = error;
    }
  }
  return errors;
}
