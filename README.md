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

Zero-dependency, tree-shakable React state engine with **field-level undo/redo**, per-field history stacks, validation, draft persistence, and keyboard shortcuts.

Two APIs: a standalone hook for full control, or field components for zero-boilerplate forms.

---

## Install

```bash
npm install react-form-rewind
```

---

## Two Ways to Use

### 1. Field Components (recommended for forms)

Zero boilerplate. Field components handle registration, onChange, validation, and per-field undo/redo automatically.

```tsx
import { FormRewind, TextField, NumberField } from "react-form-rewind";

function SignupForm() {
  return (
    <FormRewind
      initialState={{ name: "", email: "", age: 0 }}
      keyboard
      persist={{ key: "signup-draft" }}
      onSubmit={(data) => console.log(data)}
    >
      <TextField name="name" label="Name" rules={{ required: true }} />
      <TextField
        name="email"
        label="Email"
        rules={{
          required: true,
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
        }}
      />
      <NumberField name="age" label="Age" rules={{ min: 18, max: 120 }} />
      <button type="submit">Submit</button>
    </FormRewind>
  );
}
```

**What happens:**
- Click into Name, type "John", press **Ctrl+Z** — only Name undoes, Email stays
- Type in both fields, submit — validation runs, errors show per field
- Close tab, reopen — draft restored from localStorage

### 2. Standalone Hook (full control)

Use `useFormHistory` for any state — not just forms. Form-level undo/redo on the entire state object.

```tsx
import { useFormHistory } from "react-form-rewind";

function Counter() {
  const { state, setState, undo, redo, canUndo, canRedo } = useFormHistory(
    { count: 0 },
    { keyboard: true }
  );

  return (
    <div>
      <button onClick={() => setState({ count: state.count - 1 })} disabled={!canUndo}>-</button>
      <span>{state.count}</span>
      <button onClick={() => setState({ count: state.count + 1 })} disabled={!canRedo}>+</button>
    </div>
  );
}
```

**Ctrl+Z** reverts the entire state. **Ctrl+Shift+Z** redoes.

---

## Field-Level Undo/Redo

The key feature. When using `<FormRewind>` with `keyboard`, **Ctrl+Z undoes only the field your cursor is in**. Other fields stay untouched.

```
Name: [John|]     <-- cursor here, Ctrl+Z reverts just Name
Email: [john@test.com]  <-- stays exactly as-is
Age: [25]              <-- untouched
```

Each field maintains its own independent history stack:
- **Per-field debounce** — typing "hello" fast = one undo step, not five
- **Per-field redo** — Ctrl+Shift+Z redoes only the focused field
- **Independent stacks** — undoing Name doesn't affect Email's history

---

## Field Components

All field components auto-register with the `<FormRewind>` context, track their own history, validate on blur, and display errors.

### TextField

```tsx
<TextField name="name" label="Name" placeholder="John" rules={{ required: true }} />
```

Props: `name`, `label?`, `rules?`, `placeholder?`, `className?`, `style?`, plus all native `<input>` props.

### NumberField

```tsx
<NumberField name="age" label="Age" rules={{ min: 0, max: 150 }} />
```

Same as TextField but type="number". Value is stored as a number.

### CheckboxField

```tsx
<CheckboxField name="agree" label="I agree to terms" rules={{ required: true }} />
```

Boolean field. `required` means the checkbox must be checked.

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

### TextareaField

```tsx
<TextareaField name="bio" label="Bio" rows={4} rules={{ maxLength: 500 }} />
```

---

## Validation

Pass a `rules` prop to any field component. Validation runs on blur (when the field is touched) and on form submit.

### Built-in Rules

| Rule | Type | Description |
|------|------|-------------|
| `required` | `boolean \| string` | Field must be non-empty. Pass a string for custom error message. |
| `pattern` | `RegExp \| { value: RegExp, message: string }` | Must match regex |
| `minLength` | `number \| { value: number, message: string }` | String min length |
| `maxLength` | `number \| { value: number, message: string }` | String max length |
| `min` | `number \| { value: number, message: string }` | Number minimum |
| `max` | `number \| { value: number, message: string }` | Number maximum |
| `validate` | `(value) => string \| null` | Custom validator. Return error message or null. |

### Examples

```tsx
// Required with custom message
<TextField name="name" rules={{ required: "Name is required" }} />

// Email pattern with custom message
<TextField name="email" rules={{ pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Bad email" } }} />

// Number range
<NumberField name="score" rules={{ min: 0, max: 100 }} />

// Custom validator
<TextField
  name="username"
  rules={{
    validate: (val) => (val as string).length < 3 ? "Too short" : null,
  }}
/>
```

---

## FormRewind Provider

The `<FormRewind>` component wraps your form and provides context to all field components.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialState` | `Record<string, unknown>` | (required) | Initial form values |
| `keyboard` | `boolean` | `false` | Enable field-level Ctrl+Z / Ctrl+Shift+Z |
| `debounceMs` | `number` | `300` | Per-field debounce window |
| `maxHistory` | `number` | `100` | Max history entries per field |
| `persist` | `{ key, debounceMs?, version? }` or `false` | `false` | localStorage draft persistence |
| `onSubmit` | `(state) => void` | — | Called after validation passes |
| `children` | `ReactNode` | (required) | Form fields |

Renders a `<form>` element with `noValidate`. Handles submit, runs validation, calls `onSubmit` only if all fields pass.

---

## Standalone Hook API

### `useFormHistory<T>(initialState, options?)`

| Property | Type | Description |
|----------|------|-------------|
| `state` | `T` | Current state |
| `setState` | `(value \| updater, label?) => void` | Update state |
| `undo` | `() => void` | Revert to previous state |
| `redo` | `() => void` | Re-apply undone state |
| `canUndo` | `boolean` | Whether undo is available |
| `canRedo` | `boolean` | Whether redo is available |
| `clearHistory` | `() => void` | Reset history, keep current state |
| `clearDraft` | `() => void` | Clear persisted draft from storage |
| `snapshot` | `(label?) => void` | Force-commit current state to history |
| `past` | `HistoryEntry<T>[]` | Past history entries |
| `future` | `HistoryEntry<T>[]` | Future (undone) entries |

Options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxHistory` | `number` | `100` | Max past entries |
| `debounceMs` | `number` | `300` | Debounce window (0 = no debounce) |
| `persist` | `boolean \| PersistOptions` | `false` | Draft persistence |
| `keyboard` | `boolean` | `false` | Ctrl+Z / Ctrl+Shift+Z (form-level) |
| `onUndo` | `(state: T) => void` | — | Callback after undo |
| `onRedo` | `(state: T) => void` | — | Callback after redo |
| `onSnapshot` | `(entry) => void` | — | Callback on snapshot |

---

## useFormRewindContext

Access form context from outside field components:

```tsx
import { useFormRewindContext } from "react-form-rewind";

function UndoButton() {
  const { undoField, fields } = useFormRewindContext();
  // undoField("name") — undo just the name field
  // fields.name.canUndo — check if name has undo history
}
```

| Property | Type | Description |
|----------|------|-------------|
| `state` | `Record<string, unknown>` | Full form state |
| `setState` | `(name, value) => void` | Set a single field |
| `errors` | `Record<string, FieldError>` | Current validation errors |
| `touched` | `Record<string, boolean>` | Which fields have been blurred |
| `fields` | `Record<string, FieldMeta>` | Per-field metadata (touched, canUndo, canRedo) |
| `undoField` | `(name) => void` | Undo a specific field |
| `redoField` | `(name) => void` | Redo a specific field |
| `setError` | `(name, error) => void` | Manually set a field error |
| `clearError` | `(name) => void` | Clear a field error |

---

## Draft Persistence

Enable with `persist: { key: "my-form" }`. Drafts auto-save to `localStorage` (debounced) and restore on mount.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | (required) | localStorage key |
| `debounceMs` | `number` | `500` | Auto-save debounce |
| `version` | `number` | `1` | Schema version (mismatches discard draft) |

---

## Tree-Shaking

Pure ES module exports with `sideEffects: false`. Only import what you use:

```ts
// Just the hook — no field components bundled
import { useFormHistory } from "react-form-rewind";

// Just field components — no standalone hook logic
import { FormRewind, TextField } from "react-form-rewind";
```

---

## TypeScript

Full generics, all types exported. State is inferred from `initialState`:

```ts
const { state } = useFormHistory({ count: 0 });
// state is typed as { count: number }
```

---

## License

[MIT](LICENSE)
