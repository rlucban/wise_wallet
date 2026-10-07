import * as fs from "fs";
import * as path from "path";

function readLayout(): string {
    return fs.readFileSync(path.resolve(__dirname, "..", "app/_layout.tsx"), "utf8");
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
    describe(`theme startup on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-70 ACC-01/02: authenticated routes wait for profile theme", () => {
            const source = readLayout();
            const gate = source.indexOf("if (activeUserId && (profileLoading || !profile))");
            const passcode = source.indexOf("if (isPasscodeEnabled && !isUnlocked)");
            const stack = source.indexOf("<Stack screenOptions={{ headerShown: false }}>");

            expect(gate).toBeGreaterThanOrEqual(0);
            expect(passcode).toBeGreaterThan(gate);
            expect(stack).toBeGreaterThan(gate);
            expect(source.slice(gate, passcode)).toContain("<PaperProvider theme={theme}>");
            expect(source.slice(gate, passcode)).toContain("backgroundColor: theme.colors.background");
        });

        it("SPEC-70 ACC-03: full-screen root canvas follows the active theme", () => {
            const source = readLayout();
            const themedCanvas = 'style={{ flex: 1, backgroundColor: theme.colors.background }}';
            const matches = source.match(/style=\{\{ flex: 1, backgroundColor: theme\.colors\.background \}\}/g) ?? [];

            expect(matches).toHaveLength(2);
            expect(source).toContain(themedCanvas);
            expect(source).toContain("<View style={{ flex: 1, backgroundColor: theme.colors.background }}>");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
