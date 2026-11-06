import { describe, expect, it } from "vitest";
import { safeEqual } from "../shared/admin";

describe("safeEqual", () => {
  it("accepts identical strings", () => {
    expect(safeEqual("correct horse", "correct horse")).toBe(true);
  });

  it("rejects different strings of any length", () => {
    expect(safeEqual("correct horse", "correct horsf")).toBe(false);
    expect(safeEqual("short", "a much longer value")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });

  it("rejects an empty guess against a real key", () => {
    expect(safeEqual("", "secret")).toBe(false);
  });
});
