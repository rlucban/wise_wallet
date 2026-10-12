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
    describe(`completedCircleColors on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: Completed circle uses surfaceVariant + primary blue", () => {
            const source = readRepo("app/savings.tsx");
            // Scoped to the circle block: the badge reuses ec.successContainer
            // and must NOT trip this pin.
            const anchor = source.indexOf("{/* Middle: Green Checkmark Circle */}");
            expect(anchor).toBeGreaterThan(-1);
            const end = source.indexOf("{/* Far Right: Only Delete */}", anchor);
            expect(end).toBeGreaterThan(anchor);
            const block = source.slice(anchor, end);
            expect(block).toContain("backgroundColor: theme.colors.surfaceVariant,");
            expect(block).toContain('name="check-circle" size={28} color={theme.colors.primary}');
            expect(block).not.toContain("ec.successContainer");
            expect(block).not.toContain("ec.onSuccessContainer");
            expect(block).not.toContain("theme.colors.onSurface");
        });

        it("ACC-02: neighbors intact (glyph, size, badge, bar, ec declaration)", () => {
            const source = readRepo("app/savings.tsx");
            expect(source).toContain('name="check-circle"');
            expect(source).toContain("Goal Reached");
            expect(source).toContain("backgroundColor: ec.success || theme.colors.tertiary,");
            expect(source).toContain("const ec = theme.colors as ExtendedColors;");
        });

        it("ACC-03: no new import, dep, or platform branch", () => {
            const source = readRepo("app/savings.tsx");
            expect(source).not.toContain("Platform.OS");
            expect(source).toContain('import { useSavings } from "../hooks/useSavings";');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
