import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "../src/useForm";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
  localStorageMock.clear();
});

afterEach(() => {
  localStorageMock.clear();
});

describe("useForm", () => {
  describe("basic state", () => {
    it("initializes with defaultValues", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "", email: "" } })
      );
      expect(result.current.getValue("name")).toBe("");
      expect(result.current.getValue("email")).toBe("");
    });

    it("sets field value", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      act(() => result.current.setValue("name", "John"));
      expect(result.current.getValue("name")).toBe("John");
    });

    it("getValue returns nested value", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { user: { email: "test@test.com" } } })
      );
      expect(result.current.getValue("user.email")).toBe("test@test.com");
    });

    it("setValue sets nested value", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { user: { email: "" } } })
      );
      act(() => result.current.setValue("user.email", "new@test.com"));
      expect(result.current.getValue("user.email")).toBe("new@test.com");
    });
  });

  describe("formState", () => {
    it("isDirty is false initially", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John" } })
      );
      expect(result.current.formState.isDirty).toBe(false);
    });

    it("isDirty becomes true after change", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John" } })
      );
      act(() => result.current.setValue("name", "Jane"));
      expect(result.current.formState.isDirty).toBe(true);
    });

    it("isValid is true with no errors", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      expect(result.current.formState.isValid).toBe(true);
    });
  });

  describe("validation", () => {
    it("trigger validates all fields", async () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      act(() => result.current.register("name", { required: true }));
      let valid: boolean = false;
      await act(async () => {
        valid = await result.current.trigger();
      });
      expect(valid).toBe(false);
      expect(result.current.formState.errors.name).toBeDefined();
    });

    it("trigger validates specific field", async () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "", email: "" } })
      );
      act(() => result.current.register("name", { required: true }));
      act(() => result.current.register("email", { required: true }));
      let valid: boolean = false;
      await act(async () => {
        valid = await result.current.trigger("name");
      });
      expect(valid).toBe(false);
      expect(result.current.formState.errors.name).toBeDefined();
      expect(result.current.formState.errors.email).toBeUndefined();
    });

    it("clearErrors clears all errors", async () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      act(() => result.current.register("name", { required: true }));
      await act(async () => { await result.current.trigger(); });
      expect(result.current.formState.errors.name).toBeDefined();
      act(() => result.current.clearErrors());
      expect(result.current.formState.errors).toEqual({});
    });

    it("clearErrors clears specific field error", async () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "", email: "" } })
      );
      act(() => result.current.register("name", { required: true }));
      act(() => result.current.register("email", { required: true }));
      await act(async () => { await result.current.trigger(); });
      act(() => result.current.clearErrors("name"));
      expect(result.current.formState.errors.name).toBeUndefined();
      expect(result.current.formState.errors.email).toBeDefined();
    });
  });

  describe("reset", () => {
    it("reset restores defaultValues", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John" } })
      );
      act(() => result.current.setValue("name", "Jane"));
      expect(result.current.getValue("name")).toBe("Jane");
      act(() => result.current.reset());
      expect(result.current.getValue("name")).toBe("John");
    });

    it("reset clears errors", async () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      act(() => result.current.register("name", { required: true }));
      await act(async () => { await result.current.trigger(); });
      expect(result.current.formState.errors.name).toBeDefined();
      act(() => result.current.reset());
      expect(result.current.formState.errors).toEqual({});
    });

    it("reset with values sets new state", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John" } })
      );
      act(() => result.current.reset({ name: "Bob" }));
      expect(result.current.getValue("name")).toBe("Bob");
    });
  });

  describe("undo/redo", () => {
    it("canUndoField is false initially", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      expect(result.current.canUndoField("name")).toBe(false);
    });

    it("canUndoField becomes true after change", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      act(() => result.current.setValue("name", "John"));
      act(() => vi.advanceTimersByTime(400));
      expect(result.current.canUndoField("name")).toBe(true);
      vi.useRealTimers();
    });

    it("undoField restores previous value", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      act(() => result.current.setValue("name", "John"));
      act(() => vi.advanceTimersByTime(400));
      act(() => result.current.undoField("name"));
      expect(result.current.getValue("name")).toBe("");
      vi.useRealTimers();
    });

    it("redoField restores undone value", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      act(() => result.current.setValue("name", "John"));
      vi.advanceTimersByTime(400);
      act(() => result.current.undoField("name"));
      act(() => result.current.redoField("name"));
      expect(result.current.getValue("name")).toBe("John");
      vi.useRealTimers();
    });
  });

  describe("watch", () => {
    it("watch() returns full state", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John", age: 25 } })
      );
      const values = result.current.watch();
      expect(values).toEqual({ name: "John", age: 25 });
    });

    it("watch('name') returns specific field", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John" } })
      );
      expect(result.current.watch("name")).toBe("John");
    });

    it("watch(['name', 'age']) returns subset", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John", age: 25 } })
      );
      expect(result.current.watch(["name", "age"])).toEqual({ name: "John", age: 25 });
    });
  });

  describe("register", () => {
    it("register returns field props", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      const field = result.current.register("name");
      expect(field.name).toBe("name");
      expect(typeof field.onChange).toBe("function");
      expect(typeof field.onBlur).toBe("function");
      expect(typeof field.ref).toBe("function");
    });
  });

  describe("handleSubmit", () => {
    it("calls onSubmit when valid", async () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John" } })
      );
      const handler = result.current.handleSubmit(onSubmit);
      await act(async () => {
        await handler({ preventDefault: () => {} } as React.FormEvent);
      });
      expect(onSubmit).toHaveBeenCalledWith({ name: "John" });
    });

    it("does not call onSubmit when invalid", async () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      act(() => result.current.register("name", { required: true }));
      const handler = result.current.handleSubmit(onSubmit);
      await act(async () => {
        await handler({ preventDefault: () => {} } as React.FormEvent);
      });
      expect(onSubmit).not.toHaveBeenCalled();
      expect(result.current.formState.errors.name).toBeDefined();
    });
  });

  describe("persist", () => {
    it("saves draft to localStorage", () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: "" },
          persist: { key: "test-draft" },
        })
      );
      act(() => result.current.setValue("name", "John"));
      vi.advanceTimersByTime(600);
      const stored = localStorageMock.getItem("test-draft");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.__s.name).toBe("John");
      expect(parsed.__v).toBe(1);
      vi.useRealTimers();
    });

    it("hydrates from localStorage", () => {
      localStorageMock.setItem("test-draft", JSON.stringify({ __s: { name: "Saved" }, __v: 1 }));
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: "" },
          persist: { key: "test-draft" },
        })
      );
      expect(result.current.getValue("name")).toBe("Saved");
    });
  });

  describe("setError", () => {
    it("sets a field error", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { email: "" } })
      );
      act(() => result.current.setError("email", { message: "Server says no", type: "server" }));
      expect(result.current.formState.errors.email).toEqual({ message: "Server says no", type: "server" });
    });

    it("sets multiple field errors", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { email: "", name: "" } })
      );
      act(() => {
        result.current.setError("email", { message: "Taken", type: "server" });
        result.current.setError("name", { message: "Invalid", type: "server" });
      });
      expect(result.current.formState.errors.email).toBeDefined();
      expect(result.current.formState.errors.name).toBeDefined();
      expect(result.current.formState.isValid).toBe(false);
    });

    it("setError persists after clearErrors on different field", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { email: "", name: "" } })
      );
      act(() => {
        result.current.setError("email", { message: "Taken", type: "server" });
        result.current.setError("name", { message: "Invalid", type: "server" });
      });
      act(() => result.current.clearErrors("name"));
      expect(result.current.formState.errors.email).toBeDefined();
      expect(result.current.formState.errors.name).toBeUndefined();
    });
  });

  describe("formState submission tracking", () => {
    it("isSubmitting is false initially", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      expect(result.current.formState.isSubmitting).toBe(false);
    });

    it("isSubmitted is false initially", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      expect(result.current.formState.isSubmitted).toBe(false);
    });

    it("submitCount is 0 initially", () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      expect(result.current.formState.submitCount).toBe(0);
    });

    it("submitCount increments on submit", async () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John" } })
      );
      const handler = result.current.handleSubmit(() => {});
      await act(async () => {
        await handler({ preventDefault: () => {} } as React.FormEvent);
      });
      expect(result.current.formState.submitCount).toBe(1);
      expect(result.current.formState.isSubmitted).toBe(true);
    });

    it("submitCount increments on failed submit", async () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "" } })
      );
      act(() => result.current.register("name", { required: true }));
      const handler = result.current.handleSubmit(() => {});
      await act(async () => {
        await handler({ preventDefault: () => {} } as React.FormEvent);
      });
      expect(result.current.formState.submitCount).toBe(1);
      expect(result.current.formState.isSubmitted).toBe(false);
    });

    it("isSubmitting is true during async onSubmit", async () => {
      let resolveSubmit!: () => void;
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John" } })
      );
      const handler = result.current.handleSubmit(() => {
        return new Promise<void>((r) => { resolveSubmit = r; });
      });
      act(() => {
        handler({ preventDefault: () => {} } as React.FormEvent);
      });
      // Need a tick for state to propagate
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(result.current.formState.isSubmitting).toBe(true);
      await act(async () => {
        resolveSubmit();
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(result.current.formState.isSubmitting).toBe(false);
    });

    it("reset clears submission state", async () => {
      const { result } = renderHook(() =>
        useForm({ defaultValues: { name: "John" } })
      );
      const handler = result.current.handleSubmit(() => {});
      await act(async () => {
        await handler({ preventDefault: () => {} } as React.FormEvent);
      });
      expect(result.current.formState.submitCount).toBe(1);
      act(() => result.current.reset());
      expect(result.current.formState.submitCount).toBe(0);
      expect(result.current.formState.isSubmitted).toBe(false);
      expect(result.current.formState.isSubmitting).toBe(false);
    });
  });
});
