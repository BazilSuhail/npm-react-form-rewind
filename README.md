# react-form-rewind

[![npm version](https://img.shields.io/npm/v/react-form-rewind.svg)](https://www.npmjs.com/package/react-form-rewind)
[![npm downloads](https://img.shields.io/npm/dm/react-form-rewind.svg)](https://www.npmjs.com/package/react-form-rewind)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-form-rewind)](https://bundlephobia.com/package/react-form-rewind)
[![license](https://img.shields.io/npm/l/react-form-rewind.svg)](LICENSE)
[![react](https://img.shields.io/badge/react-%3E%3D18.0.0-blue.svg)](https://reactjs.org)
[![typescript](https://img.shields.io/badge/typescript-5.3%2B-3178c6.svg)](https://www.typescriptlang.org/)

Zero-dependency, tree-shakable React state engine with auto-saved history stacks, time-traveling undo/redo, keyboard shortcuts, and draft persistence.

---

## Why?

| Problem | Solution |
|---------|----------|
| No native Ctrl+Z / Ctrl+Y in React forms | Built-in keyboard shortcuts with history tracking |
| User progress lost on tab reload | Auto-save drafts to `localStorage` with schema versioning |
| Manual debouncers for history snapshots | Automated keystroke coalescing into logical snapshots |
| Heavy form libraries add validation bloat | Focused solely on history and state persistence |

## Quick Start

```bash
npm install react-form-rewind
```

```tsx
import { useFormHistory } from "react-form-rewind";

function MyForm() {
  const { state, setState, undo, redo, canUndo, canRedo } = useFormHistory(
    { name: "", email: "" },
    { persist: { key: "my-form-draft" } }
  );

  return (
    <form>
      <input
        value={state.name}
        onChange={(e) => setState({ ...state, name: e.target.value })}
      />
      <input
        value={state.email}
        onChange={(e) => setState({ ...state, email: e.target.value })}
      />
      <button type="button" onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" onClick={redo} disabled={!canRedo}>
        Redo
      </button>
    </form>
  );
}
```

Press **Ctrl+Z** to undo, **Ctrl+Shift+Z** or **Ctrl+Y** to redo.

---

## API Reference

### `useFormHistory<T>(initialState, options?)`

The core hook that manages a history-backed state stack.

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `state` | `T` | Current present state |
| `setState` | `(value: T \| ((prev: T) => T), label?: string) => void` | Update state (pushes to history) |
| `undo` | `() => void` | Revert to previous state |
| `redo` | `() => void` | Re-apply undone state |
| `canUndo` | `boolean` | Whether undo is available |
| `canRedo` | `boolean` | Whether redo is available |
| `clearHistory` | `() => void` | Reset history, keep current state |
| `clearDraft` | `() => void` | Clear persisted draft from storage |
| `snapshot` | `(label?: string) => void` | Force-commit current state to history |
| `past` | `HistoryEntry<T>[]` | Past history entries |
| `future` | `HistoryEntry<T>[]` | Future (undone) entries |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxHistory` | `number` | `100` | Maximum past entries to retain |
| `debounceMs` | `number` | `300` | Debounce window for rapid state changes |
| `persist` | `boolean \| PersistOptions` | `false` | Enable draft persistence |
| `onUndo` | `(state: T) => void` | — | Callback after undo |
| `onRedo` | `(state: T) => void` | — | Callback after redo |
| `onSnapshot` | `(entry: HistoryEntry<T>) => void` | — | Callback when a snapshot is committed |

### `PersistOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | — | `localStorage` key for draft storage |
| `debounceMs` | `number` | `500` | Debounce for auto-save writes |
| `version` | `number` | `1` | Schema version (mismatches discard draft) |

---

## Features

### Keyboard Shortcuts

Shortcuts are enabled by default. Press **Ctrl+Z** to undo, **Ctrl+Shift+Z** or **Ctrl+Y** to redo. On macOS, **Ctrl** maps to **Cmd** automatically.

### Snapshot Debouncing

Rapid keystrokes (typing "hello" quickly) are coalesced into a single history entry instead of one per keystroke. The debounce window defaults to 300ms.

### Draft Persistence

Enable with `persist: { key: "my-form" }`. Drafts are auto-saved to `localStorage` and restored on mount. Schema versioning prevents stale drafts from hydrating incorrectly.

---

## Tree-Shaking

`react-form-rewind` uses pure ES module exports with `sideEffects: false` in `package.json`. Bundlers like Webpack, Rollup, and esbuild will only include code you actually import.

```ts
// Only the hook is bundled — no extra code
import { useFormHistory } from "react-form-rewind";
```

---

## TypeScript

Full type definitions are included. All generics are inferred from your initial state:

```ts
const { state } = useFormHistory({ count: 0 });
// state is typed as { count: number }
```

---

## Browser Support

- Chrome 80+
- Firefox 78+
- Safari 14+
- Edge 80+

Requires `React 18+` and native `Array`, `localStorage`, and `addEventListener` APIs.

---

## License

[MIT](LICENSE)
