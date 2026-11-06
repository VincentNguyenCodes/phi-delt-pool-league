import { describe, expect, it } from "vitest";
import {
  addDays,
  isPollOpen,
  mondayOf,
  nextOpening,
  pacificInstant,
  pacificParts,
  pollIdFor,
  weekNumber,
  ymd,
} from "../shared/schedule";

const at = (iso: string) => pacificParts(new Date(iso));

describe("poll window", () => {
  it("opens Saturday at 9am Pacific", () => {
    expect(isPollOpen(at("2026-11-07T16:59:00Z"))).toBe(false);
    expect(isPollOpen(at("2026-11-07T17:00:00Z"))).toBe(true);
  });

  it("stays open through Sunday 11:59pm and closes at midnight", () => {
    expect(isPollOpen(at("2026-11-09T07:59:00Z"))).toBe(true);
    expect(isPollOpen(at("2026-11-09T08:00:00Z"))).toBe(false);
  });

  it("is closed all week", () => {
    for (const day of ["09", "10", "11", "12", "13"]) {
      expect(isPollOpen(at(`2026-11-${day}T20:00:00Z`))).toBe(false);
    }
  });

  it("uses the Saturday date as the poll id for the whole weekend", () => {
    expect(pollIdFor(at("2026-11-07T20:00:00Z"))).toBe("2026-11-07");
    expect(pollIdFor(at("2026-11-08T20:00:00Z"))).toBe("2026-11-07");
    expect(pollIdFor(at("2026-11-10T20:00:00Z"))).toBeNull();
  });

  it("follows daylight saving", () => {
    expect(isPollOpen(at("2027-03-20T15:59:00Z"))).toBe(false);
    expect(isPollOpen(at("2027-03-20T16:00:00Z"))).toBe(true);
  });
});

describe("weeks", () => {
  it("finds the Monday of a date", () => {
    expect(ymd(mondayOf(at("2026-11-05T20:00:00Z")))).toBe("2026-11-02");
    expect(ymd(mondayOf(at("2026-11-09T20:00:00Z")))).toBe("2026-11-09");
    expect(ymd(mondayOf(at("2026-11-09T07:00:00Z")))).toBe("2026-11-02");
  });

  it("numbers issues from the first PDF week", () => {
    expect(weekNumber({ year: 2026, month: 11, day: 2 })).toBe(1);
    expect(weekNumber({ year: 2026, month: 11, day: 9 })).toBe(2);
  });

  it("converts Pacific wall time to the right instant", () => {
    expect(pacificInstant({ year: 2026, month: 11, day: 9 }, 11, 30).toISOString()).toBe("2026-11-09T19:30:00.000Z");
    expect(pacificInstant({ year: 2027, month: 3, day: 15 }, 11, 30).toISOString()).toBe("2027-03-15T18:30:00.000Z");
    expect(pacificInstant({ year: 2026, month: 11, day: 9 }).toISOString()).toBe("2026-11-09T08:00:00.000Z");
  });

  it("adds days across month ends", () => {
    expect(ymd(addDays({ year: 2026, month: 11, day: 30 }, 2))).toBe("2026-12-02");
  });
});

describe("next opening", () => {
  it("finds the coming Saturday 9am", () => {
    expect(nextOpening(new Date("2026-11-05T20:00:00Z")).toISOString()).toBe("2026-11-07T17:00:00.000Z");
  });

  it("finds next week's Saturday after the poll closes", () => {
    expect(nextOpening(new Date("2026-11-09T09:00:00Z")).toISOString()).toBe("2026-11-14T17:00:00.000Z");
  });
});
