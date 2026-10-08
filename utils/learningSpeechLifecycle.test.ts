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

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-64 Learning speech lifecycle on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01..03: both screens stop speech and reset playback on blur", () => {
            const screens = [
                {
                    path: "app/(tabs)/learning.tsx",
                    reset: "setActiveArticleId(null);",
                },
                {
                    path: "app/(tabs)/learning-detail.tsx",
                    reset: "setIsPlaying(false);",
                },
            ];

            for (const screen of screens) {
                const source = readRepo(screen.path);
                expect(source).toContain("useFocusEffect(");
                const cleanup = source.match(
                    /useFocusEffect\(\s*useCallback\(\(\) => \{\s*return \(\) => \{([\s\S]*?)\n\s*\};\s*\}, \[\]\)\s*\)/
                );
                expect(cleanup).not.toBeNull();
                expect(cleanup?.[1]).toContain("Speech.stop();");
                expect(cleanup?.[1]).toContain(screen.reset);
            }
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");