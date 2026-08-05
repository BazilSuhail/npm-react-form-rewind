import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useFormHistory } from "../src/useFormHistory";

describe("useFormHistory", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("updates state with value", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    expect(result.current.state).toEqual({ count: 1 });
    expect(result.current.past).toHaveLength(1);
  });

  it("updates state with functional updater", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.setState((prev) => ({ count: prev.count + 1 }));
    });
    expect(result.current.state).toEqual({ count: 1 });
  });

  it("does not push same reference to past", () => {
    const initial = { count: 0 };
    const { result } = renderHook(() => useFormHistory(initial));
    act(() => {
      result.current.setState(initial);
    });
    expect(result.current.past).toHaveLength(0);
  });

  it("undo reverts to previous state", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.setState({ count: 2 });
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.state).toEqual({ count: 1 });
    expect(result.current.future).toHaveLength(1);
  });

  it("undo is noop when past is empty", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.undo();
    });
    expect(result.current.state).toEqual({ count: 0 });
  });

  it("redo re-applies undone state", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });
    expect(result.current.state).toEqual({ count: 1 });
    expect(result.current.future).toHaveLength(0);
  });

  it("redo is noop when future is empty", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.redo();
    });
    expect(result.current.state).toEqual({ count: 0 });
  });

  it("new state after undo clears future", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.setState({ count: 2 });
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.setState({ count: 3 });
    });
    expect(result.current.state).toEqual({ count: 3 });
    expect(result.current.future).toHaveLength(0);
    expect(result.current.past).toHaveLength(2);
  });

  it("respects maxHistory cap", () => {
    const { result } = renderHook(() => useFormHistory(0, { maxHistory: 3 }));
    for (let i = 1; i <= 5; i++) {
      act(() => {
        result.current.setState(i);
      });
    }
    expect(result.current.past).toHaveLength(3);
    expect(result.current.past[0].state).toBe(2);
  });

  it("clearHistory resets past and future", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.past).toHaveLength(0);
    expect(result.current.future).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("clearDraft resets to initial state", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.clearDraft();
    });
    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.past).toHaveLength(0);
    expect(result.current.future).toHaveLength(0);
  });

  it("snapshot forces a history entry", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.snapshot();
    });
    expect(result.current.past).toHaveLength(1);
    expect(result.current.state).toEqual({ count: 0 });
  });

  it("snapshot supports label", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.snapshot("manual save");
    });
    expect(result.current.past[0].label).toBe("manual save");
  });

  it("onUndo callback fires", () => {
    const onUndo = vi.fn();
    const { result } = renderHook(() =>
      useFormHistory({ count: 0 }, { onUndo }),
    );
    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.undo();
    });
    expect(onUndo).toHaveBeenCalledWith({ count: 0 });
  });

  it("onRedo callback fires", () => {
    const onRedo = vi.fn();
    const { result } = renderHook(() =>
      useFormHistory({ count: 0 }, { onRedo }),
    );
    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });
    expect(onRedo).toHaveBeenCalledWith({ count: 1 });
  });

  it("onSnapshot callback fires", () => {
    const onSnapshot = vi.fn();
    const { result } = renderHook(() =>
      useFormHistory({ count: 0 }, { onSnapshot }),
    );
    act(() => {
      result.current.snapshot("test");
    });
    expect(onSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ state: { count: 0 }, label: "test" }),
    );
  });

  it("sets label on setState", () => {
    const { result } = renderHook(() => useFormHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 }, "increment");
    });
    expect(result.current.past[0].label).toBe("increment");
  });
});
