import { describe, expect, it } from "vitest";
import { cleanName, findExisting } from "../src/lib/names";

describe("cleanName", () => {
  it("trims and collapses spaces", () => {
    expect(cleanName("  Mike   Ross ")).toBe("Mike Ross");
  });

  it("capitalizes names typed in all lowercase", () => {
    expect(cleanName("john doe")).toBe("John Doe");
    expect(cleanName("o'neil")).toBe("O'Neil");
    expect(cleanName("mary-jane")).toBe("Mary-Jane");
  });

  it("keeps names that already have capitals", () => {
    expect(cleanName("DJ Khaled")).toBe("DJ Khaled");
  });

  it("rejects empty, long and odd names", () => {
    expect(() => cleanName("   ")).toThrow();
    expect(() => cleanName("a".repeat(41))).toThrow();
    expect(() => cleanName("<script>")).toThrow();
  });
});

describe("findExisting", () => {
  const players = [{ name: "AK" }, { name: "Nick Mo" }, { name: "Andrew Chen" }];

  it("matches regardless of case", () => {
    expect(findExisting("nick mo", players)?.name).toBe("Nick Mo");
  });

  it("matches known nicknames to the real player", () => {
    expect(findExisting("Ahmed", players)?.name).toBe("AK");
    expect(findExisting("nickmo", players)?.name).toBe("Nick Mo");
    expect(findExisting("Chen", players)?.name).toBe("Andrew Chen");
  });

  it("returns nothing for a new name", () => {
    expect(findExisting("Taylor", players)).toBeUndefined();
  });
});
