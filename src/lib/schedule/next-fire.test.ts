import { describe, expect, it } from "vitest";
import { computeNextFire } from "./next-fire";

function at(y: number, mo: number, d: number, h: number, mi: number): Date {
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

describe("computeNextFire", () => {
  describe("fixed_times", () => {
    it("returns earliest future time today", () => {
      const now = at(2026, 5, 9, 14, 0);
      const next = computeNextFire(
        { type: "fixed_times", times: ["13:00", "17:00", "21:00", "01:00"] },
        now,
      );
      expect(new Date(next).getHours()).toBe(17);
      expect(new Date(next).getDate()).toBe(9);
    });

    it("rolls to tomorrow's earliest if all times passed", () => {
      const now = at(2026, 5, 9, 23, 30);
      const next = computeNextFire(
        { type: "fixed_times", times: ["13:00", "17:00", "21:00"] },
        now,
      );
      expect(new Date(next).getHours()).toBe(13);
      expect(new Date(next).getDate()).toBe(10);
    });

    it("handles past-midnight time today (01:00 after 23:30)", () => {
      const now = at(2026, 5, 9, 23, 30);
      const next = computeNextFire(
        { type: "fixed_times", times: ["13:00", "01:00"] },
        now,
      );
      expect(new Date(next).getHours()).toBe(1);
      expect(new Date(next).getDate()).toBe(10);
    });
  });

  describe("daily", () => {
    it("today if future", () => {
      const now = at(2026, 5, 9, 8, 0);
      const next = computeNextFire({ type: "daily", time: "12:30" }, now);
      expect(new Date(next).getHours()).toBe(12);
      expect(new Date(next).getDate()).toBe(9);
    });

    it("tomorrow if past", () => {
      const now = at(2026, 5, 9, 14, 0);
      const next = computeNextFire({ type: "daily", time: "12:30" }, now);
      expect(new Date(next).getDate()).toBe(10);
    });
  });

  describe("every_n_days", () => {
    it("first fire today/tomorrow when no lastFireAt", () => {
      const now = at(2026, 5, 9, 8, 0);
      const next = computeNextFire(
        { type: "every_n_days", n: 3, time: "10:00" },
        now,
      );
      expect(new Date(next).getDate()).toBe(9);
      expect(new Date(next).getHours()).toBe(10);
    });

    it("advances by N days from last fire", () => {
      const last = at(2026, 5, 6, 10, 0).getTime();
      const now = at(2026, 5, 7, 12, 0);
      const next = computeNextFire(
        { type: "every_n_days", n: 3, time: "10:00" },
        now,
        last,
      );
      expect(new Date(next).getDate()).toBe(9);
    });

    it("catches up when behind multiple intervals", () => {
      const last = at(2026, 5, 1, 10, 0).getTime();
      const now = at(2026, 5, 9, 12, 0);
      const next = computeNextFire(
        { type: "every_n_days", n: 3, time: "10:00" },
        now,
        last,
      );
      expect(new Date(next).getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe("interval (90 min, window 12:00 → 03:00 wrapping midnight)", () => {
    const sched = {
      type: "interval" as const,
      intervalMinutes: 90,
      activeFrom: "12:00",
      activeTo: "03:00",
    };

    it("fires at next slot inside the window", () => {
      const now = at(2026, 5, 9, 13, 30);
      const next = computeNextFire(sched, now);
      const d = new Date(next);
      expect(d.getHours()).toBeGreaterThanOrEqual(13);
      expect(next).toBeGreaterThan(now.getTime());
    });

    it("after midnight (still in window) keeps firing", () => {
      const now = at(2026, 5, 10, 1, 30);
      const next = computeNextFire(sched, now);
      expect(next).toBeGreaterThan(now.getTime());
      const d = new Date(next);
      const inWindow =
        d.getHours() >= 12 || d.getHours() < 3 ||
        (d.getHours() === 3 && d.getMinutes() === 0);
      expect(inWindow).toBe(true);
    });

    it("outside window jumps to next window start", () => {
      const now = at(2026, 5, 9, 9, 0);
      const next = computeNextFire(sched, now);
      const d = new Date(next);
      expect(d.getHours()).toBe(12);
      expect(d.getMinutes()).toBe(0);
    });

    it("advances by intervalMinutes from lastFireAt while inside window", () => {
      const last = at(2026, 5, 9, 13, 30).getTime();
      const now = at(2026, 5, 9, 13, 35);
      const next = computeNextFire(sched, now, last);
      expect(next).toBe(last + 90 * 60_000);
    });

    it("catches up after missed slots within today's window", () => {
      // System asleep / app closed between 12:30 and 13:35.
      // lastFireAt is 12:00, but the 13:30 slot has already passed.
      // Engine should jump to the next slot strictly > now (15:00).
      const last = at(2026, 5, 9, 12, 0).getTime();
      const now = at(2026, 5, 9, 13, 35);
      const next = computeNextFire(sched, now, last);
      const d = new Date(next);
      expect(d.getHours()).toBe(15);
      expect(d.getMinutes()).toBe(0);
      expect(next).toBeGreaterThan(now.getTime());
    });
  });
});
