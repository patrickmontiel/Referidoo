import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import AdminLayout from "../layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("AdminLayout welcome screen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ name: "Eduardo Neri" }) })) as unknown as typeof fetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("hides the welcome overlay after its timers run, even under StrictMode's double-invoked effect", async () => {
    sessionStorage.setItem("referidoo_welcome", "1");

    const { container } = render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(AdminLayout, { children: React.createElement("div", null, "content") })
      )
    );

    const findOverlay = () => container.querySelector(".z-\\[80\\]");
    expect(findOverlay()).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });

    expect(findOverlay()).toBeNull();
  });
});
