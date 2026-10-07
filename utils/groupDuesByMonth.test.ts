import * as fs from "fs";
import * as path from "path";
import { groupDuesByMonth } from "./groupDuesByMonth";
import type { Due } from "../types";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

function due(id: string, date: string, amount = 100): Due {
    return { id, title: `Due ${id}`, amount, date, type: "expense", updatedAt: 0 };
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`completed dues groups on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-08a: out-of-order fixtures group into newest-first months", () => {
            const groups = groupDuesByMonth([
                due("a", "2026-08-15T10:00:00"),
                due("b", "2026-10-06T10:00:00"),
                due("c", "2026-09-01T10:00:00"),
            ]);
            expect(groups.map((g) => g.key)).toEqual(["2026-10", "2026-09", "2026-08"]);
        });

        it("ACC-08b: items within a month are newest-first; empty input yields no groups", () => {
            const groups = groupDuesByMonth([
                due("early", "2026-10-01T08:00:00"),
                due("late", "2026-10-06T18:00:00"),
            ]);
            expect(groups.length).toBe(1);
            expect(groups[0].items.map((d) => d.id)).toEqual(["late", "early"]);
            expect(groupDuesByMonth([])).toEqual([]);
        });

        it("ACC-08c: screen is month-grouped with zero filter segments", () => {
            const source = readRepo("app/completed-dues.tsx");
            expect(source).toContain("groupDuesByMonth");
            expect(source).toContain("group.label");
            for (const token of ["SegmentedButtons", "This Week", "This Month", "setFilter", "TOTAL COMPLETED"]) {
                expect(source).not.toContain(token);
            }
        });

        it("ACC-09: read-only rows, header back, and empty state intact", () => {
            const source = readRepo("app/completed-dues.tsx");
            expect(source).toContain('title="Completed Dues"');
            expect(source).toContain("Appbar.BackAction");
            expect(source).toContain("safeGoBack(router)");
            expect(source).toContain('title="No completed dues"');
            const presses = source.match(/onPress/g) ?? [];
            expect(presses.length).toBe(1);
        });
        it("SPEC-32 v1.2 ACC-10: titles read clean, zero strikethrough", () => {
            const source = readRepo("app/completed-dues.tsx");
            expect(source).not.toContain("line-through");
            expect(source).not.toContain("textDecorationLine");
            expect(source).toContain('fontWeight: "600"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
