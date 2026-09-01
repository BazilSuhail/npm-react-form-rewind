import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "../src/useForm";
import { useFieldArray } from "../src/useFieldArray";

function setupFormAndArray(defaultValues: Record<string, unknown> = { tags: [] }) {
  const formResult = renderHook(() => useForm({ defaultValues }));
  const arrayResult = renderHook(() =>
    useFieldArray({ name: "tags" }, formResult.result.current)
  );
  return { form: formResult, array: arrayResult };
}

describe("useFieldArray", () => {
  it("initializes with empty array", () => {
    const { array } = setupFormAndArray();
    expect(array.result.current.fields).toEqual([]);
  });

  it("initializes with default array", () => {
    const { array } = setupFormAndArray({ tags: ["a", "b"] });
    expect(array.result.current.fields).toEqual(["a", "b"]);
  });

  it("appends item", () => {
    const { array } = setupFormAndArray();
    act(() => array.result.current.append("new"));
    expect(array.result.current.fields).toEqual(["new"]);
  });

  it("appends multiple items", () => {
    const { array } = setupFormAndArray();
    act(() => array.result.current.append("a"));
    act(() => array.result.current.append("b"));
    expect(array.result.current.fields).toEqual(["a", "b"]);
  });

  it("removes item by index", () => {
    const { array } = setupFormAndArray({ tags: ["a", "b", "c"] });
    act(() => array.result.current.remove(1));
    expect(array.result.current.fields).toEqual(["a", "c"]);
  });

  it("moves item from one index to another", () => {
    const { array } = setupFormAndArray({ tags: ["a", "b", "c"] });
    act(() => array.result.current.move(0, 2));
    expect(array.result.current.fields).toEqual(["b", "c", "a"]);
  });

  it("inserts item at index", () => {
    const { array } = setupFormAndArray({ tags: ["a", "c"] });
    act(() => array.result.current.insert(1, "b"));
    expect(array.result.current.fields).toEqual(["a", "b", "c"]);
  });

  it("updates item at index", () => {
    const { array } = setupFormAndArray({ tags: ["a", "b"] });
    act(() => array.result.current.update(1, "B"));
    expect(array.result.current.fields).toEqual(["a", "B"]);
  });

  it("swaps two items", () => {
    const { array } = setupFormAndArray({ tags: ["a", "b", "c"] });
    act(() => array.result.current.swap(0, 2));
    expect(array.result.current.fields).toEqual(["c", "b", "a"]);
  });

  it("clears all items", () => {
    const { array } = setupFormAndArray({ tags: ["a", "b"] });
    act(() => array.result.current.clear());
    expect(array.result.current.fields).toEqual([]);
  });

  it("syncs with form state", () => {
    const { form, array } = setupFormAndArray({ tags: [] });
    act(() => array.result.current.append("hello"));
    expect(form.result.current.getValue("tags")).toEqual(["hello"]);
  });

  it("works with objects", () => {
    const { array } = setupFormAndArray<{ name: string }[]>({ tags: [] });
    act(() => array.result.current.append({ name: "Alice" }));
    act(() => array.result.current.append({ name: "Bob" }));
    expect(array.result.current.fields).toEqual([
      { name: "Alice" },
      { name: "Bob" },
    ]);
  });
});
