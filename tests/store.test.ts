import { describe, it, expect } from "vitest";
import { createStore, getNestedValue, setNestedValue } from "../src/store";

describe("createStore", () => {
  it("returns initial state", () => {
    const store = createStore({ name: "John", age: 25 });
    expect(store.getState()).toEqual({ name: "John", age: 25 });
  });

  it("sets a field value", () => {
    const store = createStore({ name: "John" });
    store.setState("name", "Jane");
    expect(store.getState()).toEqual({ name: "Jane" });
  });

  it("does not notify if value unchanged", () => {
    const store = createStore({ name: "John" });
    let called = false;
    store.subscribe("name", () => { called = true; });
    store.setState("name", "John");
    expect(called).toBe(false);
  });

  it("notifies field subscribers on change", () => {
    const store = createStore({ name: "John" });
    let called = false;
    store.subscribe("name", () => { called = true; });
    store.setState("name", "Jane");
    expect(called).toBe(true);
  });

  it("does not notify other field subscribers", () => {
    const store = createStore({ name: "John", age: 25 });
    let nameCalled = false;
    let ageCalled = false;
    store.subscribe("name", () => { nameCalled = true; });
    store.subscribe("age", () => { ageCalled = true; });
    store.setState("name", "Jane");
    expect(nameCalled).toBe(true);
    expect(ageCalled).toBe(false);
  });

  it("notifies all subscribers", () => {
    const store = createStore({ name: "John" });
    let called = false;
    store.subscribeAll(() => { called = true; });
    store.setState("name", "Jane");
    expect(called).toBe(true);
  });

  it("unsubscribe stops notifications", () => {
    const store = createStore({ name: "John" });
    let count = 0;
    const unsub = store.subscribe("name", () => { count++; });
    store.setState("name", "Jane");
    unsub();
    store.setState("name", "Bob");
    expect(count).toBe(1);
  });

  it("setValues updates multiple fields", () => {
    const store = createStore({ a: 1, b: 2, c: 3 });
    store.setValues({ a: 10, c: 30 });
    expect(store.getState()).toEqual({ a: 10, b: 2, c: 30 });
  });

  it("getFieldValue returns specific field", () => {
    const store = createStore({ name: "John", age: 25 });
    expect(store.getFieldValue("name")).toBe("John");
    expect(store.getFieldValue("age")).toBe(25);
  });
});

describe("getNestedValue", () => {
  it("returns flat value", () => {
    expect(getNestedValue({ name: "John" }, "name")).toBe("John");
  });

  it("returns nested value", () => {
    expect(getNestedValue({ user: { email: "test@test.com" } }, "user.email")).toBe("test@test.com");
  });

  it("returns undefined for missing path", () => {
    expect(getNestedValue({}, "name")).toBeUndefined();
  });

  it("returns undefined for deep missing path", () => {
    expect(getNestedValue({ user: {} }, "user.address.city")).toBeUndefined();
  });
});

describe("setNestedValue", () => {
  it("sets flat value", () => {
    expect(setNestedValue({ name: "John" }, "name", "Jane")).toEqual({ name: "Jane" });
  });

  it("sets nested value", () => {
    const result = setNestedValue({ user: { email: "old@test.com" } }, "user.email", "new@test.com");
    expect(result).toEqual({ user: { email: "new@test.com" } });
  });

  it("does not mutate original", () => {
    const original = { user: { email: "old@test.com" } };
    setNestedValue(original, "user.email", "new@test.com");
    expect(original.user.email).toBe("old@test.com");
  });

  it("creates intermediate objects", () => {
    const result = setNestedValue({}, "user.address.city", "NYC");
    expect(result).toEqual({ user: { address: { city: "NYC" } } });
  });
});
