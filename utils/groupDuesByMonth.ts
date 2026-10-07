import type { Due } from "../types";

export interface DueMonthGroup {
    /** "YYYY-MM" of the due date in device-local time. */
    key: string;
    /** e.g. "October 2026". */
    label: string;
    /** Newest-first. */
    items: Due[];
}

/**
 * Groups dues by calendar month, newest month first with
 * newest-first items (SPEC-32 v1.1 DEC-05).
 *
 * Pure by design: no react-native imports, so it stays safe for the jest
 * node env (roots: utils), Expo Go import time, and web export.
 */
export function groupDuesByMonth(dues: Due[]): DueMonthGroup[] {
    const sorted = [...dues].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const groups = new Map<string, DueMonthGroup>();
    for (const item of sorted) {
        const d = new Date(item.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        let group = groups.get(key);
        if (!group) {
            group = {
                key,
                label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
                items: [],
            };
            groups.set(key, group);
        }
        group.items.push(item);
    }
    return [...groups.values()];
}
