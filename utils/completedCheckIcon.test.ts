import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function collectSourceFiles(relativeDir: string): string[] {
    const root = path.resolve(__dirname, "..", relativeDir);
    const out: string[] = [];
    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
                out.push(full);
            }
        }
    };
    walk(root);
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

function runSuite(os: "android" | "ios" | "web") {
    describe(`completedCheckIcon on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: Completed card uses check-circle; no checkmark-circle in savings.tsx", () => {
            const source = readRepo("app/savings.tsx");
            expect(source).toContain('name="check-circle"');
            expect(source).not.toContain("checkmark-circle");
        });

        it("ACC-02: zero checkmark-circle repo-wide (app + components)", () => {
            const files = [...collectSourceFiles("app"), ...collectSourceFiles("components")];
            expect(files.length).toBeGreaterThan(0);
            const offenders = files.filter((f) => fs.readFileSync(f, "utf8").includes("checkmark-circle"));
            expect(offenders).toEqual([]);
        });

        it("ACC-03: icon tag, name, and size pinned (color owned by SPEC-101)", () => {
            const source = readRepo("app/savings.tsx");
            // v1.1: color excluded — SPEC-101 v1.1 recolored to primary;
            // completedCircleColors.test.ts ACC-01 owns the color pin.
            expect(source).toContain('<MaterialCommunityIcons name="check-circle" size={28}');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
