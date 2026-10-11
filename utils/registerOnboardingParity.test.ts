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

const SCREEN = "app/onboarding.tsx";

function runSuite(os: "android" | "ios" | "web") {
    describe(`register-flow onboarding parity on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: Initial Balance marked optional exactly once", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain('label="Initial Balance (Optional)"');
            expect(source).not.toContain('label="Initial Balance"');
            const occurrences = source.match(/optional/gi) || [];
            expect(occurrences).toHaveLength(1);
        });

        it("ACC-02: header uses main wallet glyph, no cash emoji", () => {
            const source = readRepo(SCREEN);
            expect(source).not.toContain("walletEmoji");
            expect(source).not.toContain("💰");
            expect(source).toContain('name="wallet"');
            expect(source).toContain('color="#fff"');
            expect(readRepo("app/register.tsx")).toContain('name="wallet"');
            expect(readRepo("app/login.tsx")).toContain('name="wallet"');
        });

        it("ACC-03: onboarding-only scope, behavior intact", () => {
            const source = readRepo(SCREEN);
            expect(source.match(/cash-multiple/g) || []).toHaveLength(1);
            expect(source).toContain('useState("0")');
            expect(source).toContain("parseAmount(balance) > 10000000");
            expect(source).toContain("buildOpeningBalancePayload");
            expect(readRepo("app/register.tsx")).not.toContain("Initial Balance");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
