# react-form-rewind

[![npm version](https://img.shields.io/npm/v/react-form-rewind.svg)](https://www.npmjs.com/package/react-form-rewind)
[![npm downloads](https://img.shields.io/npm/dm/react-form-rewind.svg)](https://www.npmjs.com/package/react-form-rewind)
[![license](https://img.shields.io/npm/l/react-form-rewind.svg)](https://github.com/BazilSuhail/npm-react-form-rewind/blob/main/LICENSE)
[![types](https://img.shields.io/badge/types-typescript-blue.svg)](https://www.typescriptlang.org/)
[![zero deps](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)]()
[![tree shakable](https://img.shields.io/badge/tree--shaking-yes-brightgreen.svg)]()
[![react](https://img.shields.io/badge/react-18%2B-61dafb.svg)](https://react.dev/)
[![bundle size](https://img.shields.io/bundlejs/size/react-form-rewind?label=min%2Bgzip)](https://bundlejs.com/?q=react-form-rewind)
[![github](https://img.shields.io/github/stars/BazilSuhail/npm-react-form-rewind?style=social)](https://github.com/BazilSuhail/npm-react-form-rewind)

Form engine with **field-level undo/redo**, per-field history stacks, async validation, draft persistence, nested paths, field arrays, watch, and keyboard shortcuts.

Lightweight (~12KB ESM), zero dependencies, tree-shakable. Built on a ref-based store with per-field subscriptions -- only changed fields re-render.

---

## Install

```bash
npm install react-form-rewind
```

---

## Quick Start

```tsx
import { useForm, FormProvider, TextField } from "react-form-rewind";

function SignupForm() {
  const form = useForm({
    defaultValues: { name: "", email: "" },
    keyboard: true,
    persist: { key: "signup-draft" },
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit((data) => console.log(data))}>
        <TextField name="name" label="Name" rules={{ required: true }} />
        <TextField name="email" label="Email" rules={{ required: true }} />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}
```

**What happens:**
- Click into Name, type "John", press **Ctrl+Z** -- only Name undoes, Email stays
- Submit empty form -- validation runs, errors show, first error field auto-focused
- Close tab, reopen -- draft restored from localStorage

---

## TypeScript (Generic Forms)

Full generic support for type-safe form values:

```tsx
interface SignupForm {
  name: string;
  email: string;
  age: number;
}

const form = useForm<SignupForm>({
  defaultValues: { name: "", email: "", age: 0 },
});

form.setValue("name", "John");   // ✅
form.setValue("name", 123);      // ❌ Type error
form.handleSubmit((data) => {
  data.name;   // string
  data.age;    // number
});
```

---

## FormProvider & useFormContext

Wrap your form with `FormProvider` so field components connect automatically -- no prop drilling:

```tsx
import { useForm, FormProvider, TextField, SelectField } from "react-form-rewind";

function ProfileForm() {
  const form = useForm({ defaultValues: { name: "", role: "" } });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(save)}>
        <TextField name="name" label="Name" rules={{ required: true }} />
        <SelectField
          name="role"
          label="Role"
          options={[
            { value: "admin", label: "Admin" },
            { value: "user", label: "User" },
          ]}
        />
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}
```

`useFormContext` gives access inside any nested component:

```tsx
function Footer() {
  const { formState, reset } = useFormContext();
  return (
    <footer>
      {formState.isDirty && <span>Unsaved changes</span>}
      <button onClick={() => reset()}>Discard</button>
    </footer>
  );
}
```

---

## useForm API

The main hook. One call gives you everything.

```tsx
const form = useForm<FormData>({
  defaultValues: { name: "", email: "", tags: [] },
  persist: { key: "my-form" },
  keyboard: true,
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultValues` | `T` (required) | -- | Initial form values |
| `persist` | `{ key: string; version?: number }` or `false` | `false` | Auto-save to localStorage |
| `keyboard` | `boolean` | `false` | Enable field-level Ctrl+Z / Ctrl+Shift+Z |

### Returns

| Method | Description |
|--------|-------------|
| `register(name, rules?)` | Register a field. Returns `{ name, value, onChange, onBlur, ref }` to spread on native inputs. |
| `setValue(name, value)` | Set a field value. Supports nested paths like `"user.email"`. |
| `getValue(name)` | Get a field value. Supports nested paths. |
| `watch()` | Get full form state snapshot. |
| `watch("name")` | Get a single field value. |
| `watch(["name", "email"])` | Get multiple field values. |
| `reset(values?)` | Reset form to default or new values. Clears all history and errors. |
| `trigger()` | Validate all registered fields. Returns `Promise<boolean>`. |
| `trigger("email")` | Validate a specific field. |
| `trigger(["name", "email"])` | Validate multiple fields. |
| `clearErrors()` | Clear all errors. |
| `clearErrors("name")` | Clear a specific field error. |
| `setError("name", { message, type })` | Set a field error manually (for server-side errors). |
| `handleSubmit(onSubmit)` | Returns a submit handler that validates first. Auto-focuses first error field. |
| `getFieldState(name)` | Returns `{ value, error, touched }` for a field. |
| `undoField(name)` | Undo a specific field. |
| `redoField(name)` | Redo a specific field. |
| `canUndoField(name)` | Check if a field has undo history. |
| `canRedoField(name)` | Check if a field has redo history. |

### formState

| Property | Type | Description |
|----------|------|-------------|
| `errors` | `Record<string, FieldError>` | Current validation errors |
| `touched` | `Record<string, boolean>` | Which fields have been blurred |
| `isDirty` | `boolean` | `true` if any field differs from `defaultValues` |
| `isValid` | `boolean` | `true` if no validation errors |
| `isSubmitting` | `boolean` | `true` while async `onSubmit` is running |
| `isSubmitted` | `boolean` | `true` after `onSubmit` completes successfully |
| `submitCount` | `number` | Number of submission attempts |

---

## Field-Level Undo/Redo

The key feature. With `keyboard: true`, **Ctrl+Z undoes only the field your cursor is in**. Other fields stay untouched.

```
Name: [John|]        <-- cursor here, Ctrl+Z reverts just Name
Email: [john@test.com]  <-- stays exactly as-is
Age: [25]              <-- untouched
```

Each field maintains its own independent history stack:
- **Per-field debounce** -- typing "hello" fast = one undo step, not five
- **Per-field redo** -- Ctrl+Shift+Z redoes only the focused field
- **Independent stacks** -- undoing Name does not affect Email history

---

## register()

```tsx
const { register } = useForm({ defaultValues: { name: "" } });

// Spread onto a native input
<input {...register("name", { required: true })} />
```

`register(name, rules?)` returns:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Field name |
| `value` | `string \| number \| boolean` | Current value |
| `onChange` | `(e) => void` | Change handler |
| `onBlur` | `() => void` | Blur handler (marks field as touched) |
| `ref` | `(el) => void` | Ref callback for keyboard handler support |

---

## Field Components

Zero-boilerplate field components. Each subscribes to per-field store updates -- only the changed field re-renders. Requires `FormProvider` parent.

All field components accept these styling props:

| Prop | Applies to | Element |
|------|-----------|---------|
| `className` | Wrapper | `<div>` / `<fieldset>` |
| `style` | Wrapper | `<div>` / `<fieldset>` |
| `inputClassName` | Input | `<input>`, `<select>`, `<textarea>` |
| `inputStyle` | Input | `<input>`, `<select>`, `<textarea>` |
| `labelClassName` | Label | `<label>` |
| `errorClassName` | Error | `<span>` |

### TextField

```tsx
<TextField name="name" label="Name" placeholder="John" rules={{ required: true }} />
```

### NumberField

```tsx
<NumberField name="age" label="Age" rules={{ min: 0, max: 150 }} />
```

Value is stored as a number.

### CheckboxField

```tsx
<CheckboxField name="agree" label="I agree to terms" rules={{ required: true }} />
```

Boolean field. `required` means the checkbox must be checked.

### SwitchField

```tsx
<SwitchField name="darkMode" label="Dark mode" />
```

Boolean toggle styled as a switch. Uses `role="switch"` for accessibility.

### SelectField

```tsx
<SelectField
  name="country"
  label="Country"
  placeholder="Select..."
  options={[
    { value: "us", label: "United States" },
    { value: "uk", label: "United Kingdom" },
  ]}
  rules={{ required: true }}
/>
```

### RadioField

```tsx
<RadioField
  name="plan"
  label="Plan"
  options={[
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "enterprise", label: "Enterprise" },
  ]}
  orientation="horizontal"
  rules={{ required: true }}
/>
```

Renders a `<fieldset>` with `<input type="radio">` per option. `orientation` controls layout (`"vertical"` default).

### TextareaField

```tsx
<TextareaField name="bio" label="Bio" rows={4} rules={{ maxLength: 500 }} />
```

### Tailwind Example

```tsx
<TextField
  name="email"
  label="Email"
  className="flex flex-col gap-1.5"
  labelClassName="text-sm font-bold text-gray-700"
  inputClassName="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
  errorClassName="text-red-500 text-xs mt-1"
  rules={{ required: true }}
/>
```

---

## Nested Fields (Dot Notation)

Use dot notation for nested objects:

```tsx
const { register, setValue, getValue } = useForm({
  defaultValues: { user: { name: "", email: "" }, address: { city: "" } },
});

<input {...register("user.name")} />
<input {...register("user.email")} />
<input {...register("address.city")} />

// Programmatic access
setValue("user.email", "john@test.com");
getValue("user.email"); // "john@test.com"
```

---

## useField (Custom Components)

Build your own field components with full control:

```tsx
import { useForm, useField } from "react-form-rewind";

function CustomInput({ name, rules }) {
  const form = useForm({ defaultValues: { [name]: "" } });
  const { value, error, onChange, onBlur, undo, redo, canUndo, canRedo } = useField({ name, rules }, form);

  return (
    <div>
      <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      {error && <span>{error.message}</span>}
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

### useField Returns

| Property | Type | Description |
|----------|------|-------------|
| `value` | `unknown` | Current field value |
| `error` | `FieldError \| undefined` | Validation error if any |
| `touched` | `boolean` | Whether field has been blurred |
| `onChange` | `(value) => void` | Set field value |
| `onBlur` | `() => void` | Mark field as touched |
| `canUndo` | `boolean` | Whether undo is available |
| `canRedo` | `boolean` | Whether redo is available |
| `undo` | `() => void` | Undo this field |
| `redo` | `() => void` | Redo this field |

---

## useFieldArray

Dynamic field arrays for lists of items:

```tsx
import { useForm, useFieldArray } from "react-form-rewind";

function TagInput() {
  const form = useForm({ defaultValues: { tags: [] } });
  const { fields, append, remove, move } = useFieldArray({ name: "tags" }, form);

  return (
    <div>
      {fields.map((tag, i) => (
        <div key={i}>
          <span>{tag}</span>
          <button onClick={() => remove(i)}>x</button>
        </div>
      ))}
      <button onClick={() => append("new tag")}>Add</button>
    </div>
  );
}
```

### useFieldArray Returns

| Method | Description |
|--------|-------------|
| `fields` | `T[]` | Current array values |
| `append(value)` | Add item to end |
| `remove(index)` | Remove item at index |
| `move(from, to)` | Move item from one index to another |
| `insert(index, value)` | Insert item at index |
| `update(index, value)` | Replace item at index |
| `swap(a, b)` | Swap two items |
| `clear()` | Remove all items |

---

## Validation

Pass a `rules` prop to any field or via `register()`. Validation runs on blur (when touched) and on form submit. Supports both sync and async validators.

### Built-in Rules

| Rule | Type | Description |
|------|------|-------------|
| `required` | `boolean \| string` | Field must be non-empty. Pass a string for custom error message. |
| `pattern` | `RegExp \| { value: RegExp, message: string }` | Must match regex |
| `minLength` | `number \| { value: number, message: string }` | String min length |
| `maxLength` | `number \| { value: number, message: string }` | String max length |
| `min` | `number \| { value: number, message: string }` | Number minimum |
| `max` | `number \| { value: number, message: string }` | Number maximum |
| `validate` | `(value) => string \| null \| Promise<string \| null>` | Custom validator (sync or async). Return error message or null. |

### Sync Examples

```tsx
// Required with custom message
<input {...register("name", { required: "Name is required" })} />

// Email pattern with custom message
<input {...register("email", { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Bad email" } })} />

// Number range
<NumberField name="score" rules={{ min: 0, max: 100 }} />

// Custom validator
<input {...register("username", { validate: (val) => val.length < 3 ? "Too short" : null })} />
```

### Async Validation

For server-side checks (username availability, email uniqueness, etc.):

```tsx
<input
  {...register("username", {
    required: true,
    validate: async (val) => {
      const res = await fetch(`/api/check-username?u=${val}`);
      const { taken } = await res.json();
      return taken ? "Username already taken" : null;
    },
  })}
/>
```

Async validators run alongside sync rules. Errors appear after the promise resolves. Works with `trigger()`, `handleSubmit`, and on-change validation.

---

## handleSubmit

Validates all fields (sync and async) and calls your callback only if valid. Auto-focuses the first error field. Manages `isSubmitting` / `isSubmitted` / `submitCount` automatically.

```tsx
const { handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { name: "", email: "" } });

<form onSubmit={handleSubmit((data) => {
  // data is fully validated
  // only called if isValid === true
})}>
  <button disabled={isSubmitting}>
    {isSubmitting ? "Submitting..." : "Submit"}
  </button>
</form>
```

### Server-Side Error Handling

Use `setError` to map API errors back onto fields after submission:

```tsx
const { handleSubmit, setError, formState: { isSubmitting } } = useForm({
  defaultValues: { email: "", password: "" },
});

async function onSubmit(data) {
  const res = await fetch("/api/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await res.json();

  if (!res.ok) {
    // Map server errors to specific fields
    if (result.field === "email") {
      setError("email", { message: result.message, type: "server" });
    } else {
      setError("password", { message: result.message, type: "server" });
    }
  }
}
```

Errors set via `setError` appear alongside validation errors and are cleared when the field changes or `clearErrors` is called.

---

## Draft Persistence

Enable with `persist: { key: "my-form" }`. Drafts auto-save to localStorage (debounced) and restore on mount.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | (required) | localStorage key |
| `version` | `number` | `1` | Schema version (mismatches discard draft) |

```tsx
const form = useForm({
  defaultValues: { name: "", email: "" },
  persist: { key: "signup-draft", version: 1 },
});

// Later: reset to clear persisted draft
form.reset();
```

---

## Tree-Shaking

Pure ES module exports with `sideEffects: false`. Only import what you use:

```ts
// Just useForm -- no field components bundled
import { useForm } from "react-form-rewind";

// Just field components
import { TextField, NumberField } from "react-form-rewind";

// useFieldArray only
import { useFieldArray } from "react-form-rewind";
```

---

## License

[MIT](LICENSE)
