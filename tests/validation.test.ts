import { describe, it, expect } from "vitest";
import { validateField, validateAll } from "../src/validation";

describe("validateField", () => {
  describe("required", () => {
    it("passes non-empty string", () => {
      expect(validateField("hello", { required: true })).toBeNull();
    });

    it("fails empty string", () => {
      expect(validateField("", { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
    });

    it("fails whitespace-only string", () => {
      expect(validateField("   ", { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
    });

    it("fails null/undefined", () => {
      expect(validateField(null, { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
      expect(validateField(undefined, { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
    });

    it("fails false (checkbox)", () => {
      expect(validateField(false, { required: true })).toEqual({
        message: "Required",
        type: "required",
      });
    });

    it("passes true (checkbox)", () => {
      expect(validateField(true, { required: true })).toBeNull();
    });

    it("uses custom message", () => {
      expect(validateField("", { required: "This field is mandatory" })).toEqual({
        message: "This field is mandatory",
        type: "required",
      });
    });
  });

  describe("pattern", () => {
    it("passes matching pattern", () => {
      expect(validateField("test@email.com", { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })).toBeNull();
    });

    it("fails non-matching pattern", () => {
      expect(validateField("not-an-email", { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })).toEqual({
        message: "Invalid format",
        type: "pattern",
      });
    });

    it("uses custom message from object", () => {
      expect(validateField("bad", { pattern: { value: /^\d+$/, message: "Numbers only" } })).toEqual({
        message: "Numbers only",
        type: "pattern",
      });
    });
  });

  describe("minLength", () => {
    it("passes when long enough", () => {
      expect(validateField("hello", { minLength: 3 })).toBeNull();
    });

    it("fails when too short", () => {
      expect(validateField("hi", { minLength: 3 })).toEqual({
        message: "Min 3 characters",
        type: "minLength",
      });
    });

    it("uses custom message from object", () => {
      expect(validateField("a", { minLength: { value: 5, message: "Too short" } })).toEqual({
        message: "Too short",
        type: "minLength",
      });
    });
  });

  describe("maxLength", () => {
    it("passes when short enough", () => {
      expect(validateField("hi", { maxLength: 5 })).toBeNull();
    });

    it("fails when too long", () => {
      expect(validateField("hello world", { maxLength: 5 })).toEqual({
        message: "Max 5 characters",
        type: "maxLength",
      });
    });
  });

  describe("min (number)", () => {
    it("passes when >= min", () => {
      expect(validateField(10, { min: 5 })).toBeNull();
      expect(validateField(5, { min: 5 })).toBeNull();
    });

    it("fails when < min", () => {
      expect(validateField(3, { min: 5 })).toEqual({
        message: "Min 5",
        type: "min",
      });
    });

    it("parses string to number", () => {
      expect(validateField("3", { min: 5 })).toEqual({
        message: "Min 5",
        type: "min",
      });
    });
  });

  describe("max (number)", () => {
    it("passes when <= max", () => {
      expect(validateField(5, { max: 10 })).toBeNull();
      expect(validateField(10, { max: 10 })).toBeNull();
    });

    it("fails when > max", () => {
      expect(validateField(15, { max: 10 })).toEqual({
        message: "Max 10",
        type: "max",
      });
    });
  });

  describe("validate (custom)", () => {
    it("passes when returns null", () => {
      expect(validateField("abc", { validate: () => null })).toBeNull();
    });

    it("fails when returns string", () => {
      expect(validateField("abc", { validate: () => "Custom error" })).toEqual({
        message: "Custom error",
        type: "validate",
      });
    });
  });

  describe("no rules", () => {
    it("passes any value", () => {
      expect(validateField("anything", {})).toBeNull();
      expect(validateField(123, {})).toBeNull();
      expect(validateField(null, {})).toBeNull();
    });
  });
});

describe("validateAll", () => {
  it("returns empty object when all valid", () => {
    const state = { name: "John", email: "john@test.com" };
    const rules = {
      name: { required: true },
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    };
    expect(validateAll(state, rules)).toEqual({});
  });

  it("returns errors for invalid fields", () => {
    const state = { name: "", email: "bad" };
    const rules = {
      name: { required: true },
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    };
    const errors = validateAll(state, rules);
    expect(errors.name).toEqual({ message: "Required", type: "required" });
    expect(errors.email).toEqual({ message: "Invalid format", type: "pattern" });
  });

  it("ignores fields not in rules", () => {
    const state = { name: "John", age: 25 };
    const rules = { name: { required: true } };
    expect(validateAll(state, rules)).toEqual({});
  });
});
