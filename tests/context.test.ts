import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement } from "react";
import { useForm } from "../src/useForm";
import { FormProvider, useFormContext } from "../src/context";

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(FormProvider, { children } as any);
}

function createProvider(formResult: any) {
  return function Provider({ children }: { children: React.ReactNode }) {
    return createElement(FormProvider, { ...formResult.current }, children);
  };
}

describe("FormContext", () => {
  it("throws when useFormContext is used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useFormContext());
    }).toThrow("useFormContext must be used within a <FormProvider>");
    spy.mockRestore();
  });

  it("provides form state via context", () => {
    const { result } = renderHook(
      () => useForm({ defaultValues: { name: "John" } }),
    );
    const Provider = createProvider(result);

    const { result: ctxResult } = renderHook(
      () => useFormContext(),
      { wrapper: Provider },
    );

    expect(ctxResult.current.watch("name")).toBe("John");
  });

  it("setValue through context updates field", () => {
    const { result } = renderHook(
      () => useForm({ defaultValues: { name: "" } }),
    );
    const Provider = createProvider(result);

    const { result: ctxResult } = renderHook(
      () => useFormContext(),
      { wrapper: Provider },
    );

    act(() => ctxResult.current.setValue("name", "Jane"));
    expect(ctxResult.current.watch("name")).toBe("Jane");
  });
});
