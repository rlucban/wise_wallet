jest.mock("react-native-get-random-values", () => ({}), { virtual: false });
jest.mock("uuid", () => ({}));

import * as fs from "fs";
import * as path from "path";
import { isUUID, LEGACY_NON_UUID_MESSAGE } from "./uuid";

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

function runSuite(os: "android" | "ios" | "web") {
    describe(`isUUID verdicts on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-45 v1.1 ACC-45A: canonical UUIDs pass", () => {
            expect(isUUID("067ead2b-9bc4-4369-9d86-50036965404e")).toBe(true);
            expect(isUUID("B0EEBC99-9C0B-4EF8-BB6D-6BB9BD380B19")).toBe(true);
        });

        it("SPEC-45 v1.1 ACC-45A: legacy and malformed ids fail", () => {
            expect(isUUID("9")).toBe(false);
            expect(isUUID("")).toBe(false);
            expect(isUUID("067ead2b-9bc4-4369")).toBe(false);
            expect(isUUID("not-a-uuid-at-all-!!!!")).toBe(false);
            expect(isUUID(undefined)).toBe(false);
            expect(isUUID(null)).toBe(false);
            expect(isUUID(9)).toBe(false);
        });

        it("SPEC-45 v1.1 ACC-45A: explainer copy is the approved OD-45B text", () => {
            expect(LEGACY_NON_UUID_MESSAGE).toContain("backend repair");
        });

        it("SPEC-45 v1.1 ACC-45B: context refuses non-UUID ids before any API call", () => {
            const source = readRepo("context/TransactionsContext.tsx");
            const guards = source.match(/if \(!isUUID\(id\)\) \{\s+throw new Error\(LEGACY_NON_UUID_MESSAGE\);\s+\}/g) ?? [];
            expect(guards.length).toBe(2);
            expect(source).toContain("isUUID, LEGACY_NON_UUID_MESSAGE");
        });

        it("SPEC-45 v1.1 ACC-45B: screens gate writers and explain", () => {
            const details = readRepo("app/transaction-details.tsx");
            expect(details).toContain("isLegacyId");
            expect(details).toContain("LEGACY_NON_UUID_MESSAGE");
            expect(details).toContain("!isLegacyId && !isScheduled");
            const edit = readRepo("app/edit-transaction.tsx");
            expect(edit).toContain("isLegacyId");
            expect(edit).toContain("LEGACY_NON_UUID_MESSAGE");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
