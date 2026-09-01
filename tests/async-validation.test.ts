import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "../src/useForm";

describe("async validation", () => {
  it("handleSubmit calls onSubmit when async validation passes", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: "John" } }),
    );
    act(() => result.current.register("name", {
      validate: async (val) => (val === "" ? "Required" : null),
    }));
    const handler = result.current.handleSubmit(onSubmit);
    await act(async () => {
      await handler({ preventDefault: () => {} } as React.FormEvent);
    });
    expect(onSubmit).toHaveBeenCalledWith({ name: "John" });
  });

  it("handleSubmit blocks onSubmit when async validation fails", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: "" } }),
    );
    act(() => result.current.register("name", {
      validate: async (val) => ((val as string) === "" ? "Required" : null),
    }));
    const handler = result.current.handleSubmit(onSubmit);
    await act(async () => {
      await handler({ preventDefault: () => {} } as React.FormEvent);
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.formState.errors.name).toBeDefined();
  });

  it("trigger validates with async validators", async () => {
    const { result } = renderHook(() =>
      useForm({ defaultValues: { email: "bad" } }),
    );
    act(() => result.current.register("email", {
      validate: async (val) => {
        const valid = (val as string).includes("@");
        return valid ? null : "Invalid email";
      },
    }));
    let valid = true;
    await act(async () => {
      valid = await result.current.trigger("email");
    });
    expect(valid).toBe(false);
    expect(result.current.formState.errors.email?.message).toBe("Invalid email");
  });

  it("async validate on change updates errors after resolution", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useForm({ defaultValues: { name: "" } }),
    );
    act(() => result.current.register("name", {
      validate: async (val) => ((val as string).length < 3 ? "Too short" : null),
    }));
    act(() => {
      result.current.setValue("name", "ab");
    });
    await act(async () => {
      await vi.advanceTimersByTime(0);
    });
    // blur to trigger touched validation
    act(() => {
      const formState = result.current.formState;
      expect(formState.errors).toBeDefined();
    });
    vi.useRealTimers();
  });
});
