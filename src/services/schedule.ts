import { DateTime } from "luxon";

// Pure scheduling helpers, kept free of Discord so they can be tested on their own

function atTime(date: DateTime<boolean>, time: string): DateTime<boolean> {
    const [hour, minute] = time.split(":").map(Number);
    return date.set({ hour, minute, second: 0, millisecond: 0 });
}

// Parses "12:00", "9:30" or "12pm" into "HH:mm"
export function parseTime(input: string): string | null {
    const match = input.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);
    if (match[3]) {
        if (hour < 1 || hour > 12) return null;
        hour = (hour % 12) + (match[3] === "pm" ? 12 : 0);
    }
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// First run on or after 'from' that is in the future, stepping by intervalDays
export function nextRun(from: DateTime<boolean>, time: string, intervalDays: number, now: DateTime<boolean> = DateTime.now()): DateTime<boolean> {
    let candidate = atTime(from, time);
    while (candidate <= now) candidate = atTime(candidate.plus({ days: intervalDays }), time);
    return candidate;
}
