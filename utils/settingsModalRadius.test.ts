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

const SCREEN = "app/(tabs)/settings.tsx";

function dialogBlock(source: string): string {
    const start = source.indexOf("dialog: {");
    expect(start).toBeGreaterThan(-1);
    const open = source.indexOf("{", start);
    const end = source.indexOf("},", open);
    expect(end).toBeGreaterThan(open);
    return source.slice(open + 1, end);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`settings modal radius on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: styles.dialog carries the four existing keys plus the curve", () => {
            const block = dialogBlock(readRepo(SCREEN));
            expect(block).toContain("maxWidth: 480");
            expect(block).toContain('width: "90%"');
            expect(block).toContain('alignSelf: "center"');
            expect(block).toContain("marginHorizontal: 0");
            expect(block).toContain("borderRadius: 16");
            expect(block).toContain('overflow: "hidden"');
        });

        it("ACC-02: the two curve keys live only in styles.dialog", () => {
            const source = readRepo(SCREEN);
            expect(source.match(/borderRadius: 16/g) ?? []).toHaveLength(1);
            expect(source.match(/overflow: "hidden"/g) ?? []).toHaveLength(1);
            expect(source).toContain("borderRadius: 8");
        });

        it("ACC-03: dialog block holds exactly the six keys; SPEC-65 pins intact", () => {
            const block = dialogBlock(readRepo(SCREEN));
            const keys = [...block.matchAll(/(\w+):/g)].map((m) => m[1]);
            expect(keys).toEqual([
                "maxWidth",
                "width",
                "alignSelf",
                "marginHorizontal",
                "borderRadius",
                "overflow",
            ]);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
