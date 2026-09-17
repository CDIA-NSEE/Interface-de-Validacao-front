import { afterEach, describe, expect, it, vi } from "vitest";

import { runViewTransition } from "../src/utils/viewTransition.js";

describe("runViewTransition", () => {
  afterEach(() => {
    delete document.startViewTransition;
    delete window.matchMedia;
  });

  it("aplica a mudança na hora quando a View Transitions API não existe", async () => {
    const update = vi.fn();

    const result = runViewTransition(update);

    expect(update).toHaveBeenCalledTimes(1);
    await expect(result).resolves.toBeUndefined();
  });

  it("roda a mudança dentro da View Transition e devolve o término dela", async () => {
    const finished = Promise.resolve("done");
    const update = vi.fn();
    document.startViewTransition = vi.fn((callback) => {
      expect(update).not.toHaveBeenCalled();
      callback();
      return { finished };
    });

    const result = runViewTransition(update);

    expect(document.startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    await expect(result).resolves.toBe("done");
  });

  it("ignora a View Transition com movimento reduzido", () => {
    const update = vi.fn();
    document.startViewTransition = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: true }));

    runViewTransition(update);

    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(document.startViewTransition).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
