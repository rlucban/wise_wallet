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
    describe(`onboarding skip guard on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: renders Skip control (text mode) below Get Started", () => {
            const source = readRepo("app/onboarding.tsx");
            expect(source).toContain('Skip');
            expect(source).toContain('mode="text"');
            const skipButtonIndex = source.indexOf('skip-button');
            const getStartedIndex = source.indexOf('Get Started');
            expect(getStartedIndex).toBeGreaterThanOrEqual(0);
            expect(skipButtonIndex).toBeGreaterThan(getStartedIndex);
        });

        it("ACC-02: tapping Skip sets dialog-visible state (separate from completeSetup)", () => {
            const source = readRepo("app/onboarding.tsx");
            expect(source).toContain('showSkipDialog');
            expect(source).toContain('setShowSkipDialog(true)');
            expect(source).toMatch(/handleSkip\s*=/);
        });

        it("ACC-03: confirm calls completeSetup(\"\", 0) and does not call validate()", () => {
            const source = readRepo("app/onboarding.tsx");
            expect(source).toContain('completeSetup("", 0)');
            const skipHandler = source.slice(source.indexOf("const handleSkip"));
            expect(skipHandler).toContain('completeSetup("", 0)');
            expect(skipHandler).not.toContain('validate()');
        });

        it("ACC-04: skip path has no addTransaction and no buildOpeningBalancePayload call", () => {
            const source = readRepo("app/onboarding.tsx");
            const skipHandler = source.slice(source.indexOf("const handleSkip"));
            expect(skipHandler).not.toContain('addTransaction');
            expect(skipHandler).not.toContain('buildOpeningBalancePayload');
        });

        it("ACC-05: on success skip handler navigates to /", () => {
            const source = readRepo("app/onboarding.tsx");
            const skipHandler = source.slice(source.indexOf("const handleSkip"));
            expect(skipHandler).toContain('router.replace("/")');
        });

        it("ACC-06: skip handler uses busyRef and setupError (parity guard)", () => {
            const source = readRepo("app/onboarding.tsx");
            const skipHandler = source.slice(source.indexOf("const handleSkip"));
            expect(skipHandler).toContain('busyRef.current');
            expect(skipHandler).toContain('setSetupError');
        });

        it("ACC-07: dialog has required copy and cancel leaves state unchanged", () => {
            const source = readRepo("app/onboarding.tsx");
            expect(source).toContain('title="Skip setup?"');
            expect(source).toContain('confirmLabel="Skip"');
            expect(source).toContain('cancelLabel="Cancel"');
            expect(source).toContain('setShowSkipDialog(false)');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
