import { test } from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { nextRun, parseTime } from "../src/services/schedule.js";

test("parseTime accepts 24h and am/pm", () => {
    assert.equal(parseTime("12:00"), "12:00");
    assert.equal(parseTime("9:05"), "09:05");
    assert.equal(parseTime("12pm"), "12:00");
    assert.equal(parseTime("12am"), "00:00");
    assert.equal(parseTime("6:30 pm"), "18:30");
    assert.equal(parseTime("25:00"), null);
    assert.equal(parseTime("13pm"), null);
    assert.equal(parseTime("noon"), null);
});

test("nextRun picks today's time if it hasn't passed", () => {
    const now = DateTime.fromISO("2026-10-22T09:00", { zone: "Asia/Singapore" });
    assert.equal(nextRun(now, "12:00", 2, now).toISO(), "2026-10-22T12:00:00.000+08:00");
});

test("nextRun steps by the interval across month ends", () => {
    const from = DateTime.fromISO("2026-10-30T12:00", { zone: "Asia/Singapore" });
    const now = DateTime.fromISO("2026-10-30T12:00", { zone: "Asia/Singapore" });
    assert.equal(nextRun(from, "12:00", 2, now).toISO(), "2026-11-01T12:00:00.000+08:00");
});

test("nextRun keeps wall-clock time across DST", () => {
    const from = DateTime.fromISO("2026-10-31T12:00", { zone: "America/New_York" });
    const now = from.plus({ minutes: 1 });
    assert.equal(nextRun(from, "12:00", 1, now).toISO(), "2026-11-01T12:00:00.000-05:00");
});
