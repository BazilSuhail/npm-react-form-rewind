import { describe, it, expect } from "vitest";
import { validateField, validateAll } from "../src/validation";

describe("validateField", () => {
  describe("required", () => {
    it("passes non-empty string", async () => {
      expect(await validateField("hello", { required: true })).toBeNull();
    });

    it("fails empty string", async () => {
      expect(await validateField("", { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
    });

    it("fails whitespace-only string", async () => {
      expect(await validateField("   ", { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
    });

    it("fails null/undefined", async () => {
      expect(await validateField(null, { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
      expect(await validateField(undefined, { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
    });

    it("fails false (checkbox)", async () => {
      expect(await validateField(false, { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
    });

    it("passes true (checkbox)", async () => {
      expect(await validateField(true, { required: true })).toBeNull();
    });

    it("uses custom message", async () => {
      expect(await validateField("", { required: "This field is mandatory" })).toEqual({
        message: "This field is mandatory",
        type: "required",
      });
    });
  });

  describe("pattern", () => {
    it("passes matching pattern", async () => {
      expect(await validateField("test@email.com", { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })).toBeNull();
    });

    it("fails non-matching pattern", async () => {
      expect(await validateField("not-an-email", { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })).toEqual({
        message: "Invalid format",
        type: "pattern",
      });
    });

    it("uses custom message from object", async () => {
      expect(await validateField("bad", { pattern: { value: /^\d+$/, message: "Numbers only" } })).toEqual({
        message: "Numbers only",
        type: "pattern",
      });
    });
  });

  describe("minLength", () => {
    it("passes when long enough", async () => {
      expect(await validateField("hello", { minLength: 3 })).toBeNull();
    });

    it("fails when too short", async () => {
      expect(await validateField("hi", { minLength: 3 })).toEqual({
        message: "Min 3 characters",
        type: "minLength",
      });
    });

    it("uses custom message from object", async () => {
      expect(await validateField("a", { minLength: { value: 5, message: "Too short" } })).toEqual({
        message: "Too short",
        type: "minLength",
      });
    });
  });

  describe("maxLength", () => {
    it("passes when short enough", async () => {
      expect(await validateField("hi", { maxLength: 5 })).toBeNull();
    });

    it("fails when too long", async () => {
      expect(await validateField("hello world", { maxLength: 5 })).toEqual({
        message: "Max 5 characters",
        type: "maxLength",
      });
    });
  });

  describe("min (number)", () => {
    it("passes when >= min", async () => {
      expect(await validateField(10, { min: 5 })).toBeNull();
      expect(await validateField(5, { min: 5 })).toBeNull();
    });

    it("fails when < min", async () => {
      expect(await validateField(3, { min: 5 })).toEqual({
        message: "Min 5",
        type: "min",
      });
    });

    it("parses string to number", async () => {
      expect(await validateField("3", { min: 5 })).toEqual({
        message: "Min 5",
        type: "min",
      });
    });
  });

  describe("max (number)", () => {
    it("passes when <= max", async () => {
      expect(await validateField(5, { max: 10 })).toBeNull();
      expect(await validateField(10, { max: 10 })).toBeNull();
    });

    it("fails when > max", async () => {
      expect(await validateField(15, { max: 10 })).toEqual({
        message: "Max 10",
        type: "max",
      });
    });
  });

  describe("validate (custom)", () => {
    it("passes when returns null", async () => {
      expect(await validateField("abc", { validate: () => null })).toBeNull();
    });

    it("fails when returns string", async () => {
      expect(await validateField("abc", { validate: () => "Custom error" })).toEqual({
        message: "Custom error",
        type: "validate",
      });
    });

    it("supports async validate", async () => {
      expect(await validateField("abc", { validate: async () => "Async error" })).toEqual({
        message: "Async error",
        type: "validate",
      });
    });

    it("supports async validate passing", async () => {
      expect(await validateField("abc", { validate: async () => null })).toBeNull();
    });
  });

  describe("no rules", () => {
    it("passes any value", async () => {
      expect(await validateField("anything", {})).toBeNull();
      expect(await validateField(123, {})).toBeNull();
      expect(await validateField(null, {})).toBeNull();
    });
  });
});

describe("validateAll", () => {
  it("returns empty object when all valid", async () => {
    const state = { name: "John", email: "john@test.com" };
    const rules = {
      name: { required: true },
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    };
    expect(await validateAll(state, rules)).toEqual({});
  });

  it("returns errors for invalid fields", async () => {
    const state = { name: "", email: "bad" };
    const rules = {
      name: { required: true },
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    };
    const errors = await validateAll(state, rules);
    expect(errors.name).toEqual({ message: "Required", type: "required" });
    expect(errors.email).toEqual({ message: "Invalid format", type: "pattern" });
  });

  it("ignores fields not in rules", async () => {
    const state = { name: "John", age: 25 };
    const rules = { name: { required: true } };
    expect(await validateAll(state, rules)).toEqual({});
  });
});
