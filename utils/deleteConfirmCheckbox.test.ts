import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function countOf(source: string, needle: string): number {
    return source.split(needle).length - 1;
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

function confirmBlock(source: string): string {
    const anchor = source.indexOf("I understand this action is permanent and cannot be undone");
    expect(anchor).toBeGreaterThan(-1);
    return source.slice(Math.max(0, anchor - 400), anchor + 600);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`deleteConfirmCheckbox on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: explicit Checkbox.Android with pinned colors, no Checkbox.Item", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            const block = confirmBlock(source);
            // v1.1: forced Android variant — bare <Checkbox> resolves to the
            // box-less iOS variant on iPhone (CheckboxIOS opacity: 0).
            expect(block).toContain("<Checkbox.Android");
            expect(countOf(block, "<Checkbox")).toBe(1);
            expect(block).toContain('status={deleteConfirmed ? "checked" : "unchecked"}');
            expect(block).toContain("onPress={() => setDeleteConfirmed(!deleteConfirmed)}");
            expect(block).toContain("color={paperTheme.colors.primary}");
            expect(block).toContain("uncheckedColor={paperTheme.colors.onSurfaceVariant}");
            expect(block).toContain('flexDirection: "row"');
            // The swallowed-box suspect is gone (was the sole file-wide occurrence).
            expect(block).not.toContain("Checkbox.Item");
            expect(countOf(source, "Checkbox.Item")).toBe(0);
        });

        it("ACC-02: copy, gate, and imports byte-identical", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).toContain("I understand this action is permanent and cannot be undone");
            expect(source).toContain("disabled={isSyncing || !pinVerified || !deleteConfirmed}");
            expect(source).toContain("const [deleteConfirmed, setDeleteConfirmed] = useState(false);");
            expect(source).toContain("Checkbox, useTheme as usePaperTheme");
        });

        it("ACC-03: no platform branch, no other control touched", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            const block = confirmBlock(source);
            expect(block).not.toContain("Platform.OS");
            // Sibling KAV dialogs (SPEC-93/94/95/102) still wrapped.
            expect(countOf(source, 'behavior={Platform.OS === "ios" ? "padding" : "height"}')).toBeGreaterThanOrEqual(4);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
