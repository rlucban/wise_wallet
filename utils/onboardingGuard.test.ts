import * as fs from "fs";
import * as path from "path";

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
    describe(`onboarding once-only guard on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: addTransaction is gated on an opening-existence check", () => {
            const source = readRepo("app/onboarding.tsx");
            expect(source).toContain("OPENING_BALANCE_CATEGORY_ID");
            expect(source).toContain("hasOpening");
            const gate = source.indexOf("hasOpening");
            const write = source.indexOf("await addTransaction(openingPayload)");
            expect(gate).toBeGreaterThanOrEqual(0);
            expect(write).toBeGreaterThan(gate);
        });

        it("ACC-02: synchronous busy guard claimed before await, released in finally", () => {
            const source = readRepo("app/onboarding.tsx");
            expect(source).toContain("busyRef.current) return;");
            expect(source).toContain("busyRef.current = true;");
            expect(source).toContain("busyRef.current = false;");
            const claim = source.indexOf("busyRef.current = true;");
            const firstAwait = source.indexOf("await completeSetup");
            expect(claim).toBeGreaterThanOrEqual(0);
            expect(firstAwait).toBeGreaterThan(claim);
        });

        it("ACC-03: existence match uses the dedicated category id, not title alone", () => {
            const source = readRepo("app/onboarding.tsx");
            expect(source).toContain("t.category?.id === OPENING_BALANCE_CATEGORY_ID");
            expect(source).not.toContain('t.title === "Opening Balance"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");

describe("SPEC-43 marker export", () => {
    it("category id constant is exported for the guard", () => {
        const source = readRepo("utils/onboardingPayload.ts");
        expect(source).toContain("export const OPENING_BALANCE_CATEGORY_ID");
    });
});
