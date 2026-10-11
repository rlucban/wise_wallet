import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function quotedEntries(block: string): string[] {
    const out: string[] = [];
    const re = /"([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) {
        out.push(m[1]);
    }
    return out;
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

const BADGE_FILE = "app/(tabs)/learning.tsx";
const GUARD_FILE = "utils/themeColors.test.js";
const MARKER = "SPEC-87 pinned";
const EXPECTED_BADGE_LINE =
    'return { backgroundColor: "#FFDAB9", textColor: "#5D4037" }; // SPEC-87 pinned: SPEC-74 peach badge';

const EXPECTED_SCAN_FILES = [
    "app/add-allocation.tsx",
    "app/dues.tsx",
    "app/add-due.tsx",
    "app/savings.tsx",
    "app/category-settings.tsx",
    "app/(tabs)/learning.tsx",
    "app/(tabs)/learning-detail.tsx",
    "components/FinancialTip.tsx",
];

const EXPECTED_EXCEPTIONS = [
    "theme.colors.",
    "theme.dark.",
    "theme.light.",
    "DefaultTheme",
    "DarkTheme",
    "transparent",
    "currentColor",
    "inherit",
    "Green",
    "shadowColor",
    "boxShadow",
    "SPEC-87 pinned",
];

function runSuite(os: "android" | "ios" | "web") {
    describe(`peach badge guard exception on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: badge line exact hex plus marker, each exactly once", () => {
            const source = readRepo(BADGE_FILE);
            expect(source).toContain(EXPECTED_BADGE_LINE);
            expect(source.match(/SPEC-87 pinned/g) || []).toHaveLength(1);
            expect(source.match(/#FFDAB9/g) || []).toHaveLength(1);
            expect(source.match(/#5D4037/g) || []).toHaveLength(1);
        });

        it("ACC-02: ONE guard entry, scan list and rest intact", () => {
            const guard = readRepo(GUARD_FILE);
            expect(guard.match(/SPEC-87 pinned/g) || []).toHaveLength(1);
            const scanBlock = guard.slice(
                guard.indexOf("FILES_TO_CHECK"),
                guard.indexOf("HARDCODED_COLOR_PATTERNS")
            );
            expect(quotedEntries(scanBlock)).toEqual(EXPECTED_SCAN_FILES);
            const excBlock = guard.slice(
                guard.indexOf("ALLOWED_EXCEPTIONS"),
                guard.indexOf("function hasHardcodedColor")
            );
            expect(quotedEntries(excBlock)).toEqual(EXPECTED_EXCEPTIONS);
        });

        it("ACC-03: badge line matches the guard's own exception", () => {
            const source = readRepo(BADGE_FILE);
            const guard = readRepo(GUARD_FILE);
            const badgeLine = source.split("\n").find((l) => l.includes("#FFDAB9"));
            if (!badgeLine) throw new Error("badge line missing");
            const excBlock = guard.slice(
                guard.indexOf("ALLOWED_EXCEPTIONS"),
                guard.indexOf("function hasHardcodedColor")
            );
            const entries = quotedEntries(excBlock);
            expect(entries.some((e) => badgeLine.includes(e))).toBe(true);
            expect(MARKER).toBe("SPEC-87 pinned");
        });

        it("ACC-04: no duplicate content key in learning-detail", () => {
            const detail = readRepo("app/(tabs)/learning-detail.tsx");
            const guideBlock = detail.slice(
                detail.indexOf("wisewallet_app_guide"),
                detail.indexOf("app_guide_getting_started")
            );
            expect(guideBlock.match(/content:/g) || []).toHaveLength(1);
            expect(guideBlock).toContain("content: APP_GUIDE_CONTENT");
            expect(detail).not.toContain("content: `Welcome to WiseWallet. This guide helps");
            expect(detail).toContain('} from "../../utils/learningGuideContent";');
            expect(detail).toContain("app_guide_getting_started");
            expect(detail).toContain("budgeting_101");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
