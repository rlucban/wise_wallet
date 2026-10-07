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
    describe(`toast legibility on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-05 §7 ACC-MD-11: bottom-docked navy toast (supersedes §6 centering)", () => {
            const source = readRepo("context/ToastContext.tsx");
            expect(source).toContain("colors.primary");
            expect(source).toContain("borderRadius: 16");
            expect(source).toContain("wrapperStyle");
            expect(source).toContain("bottom: 24");
            expect(source).toContain("justifyContent: \"flex-end\"");
            expect(source).not.toContain("justifyContent: \"center\"");
            expect(source).toContain("maxWidth: 480");
            expect(source).not.toContain("inverseSurface");
            expect(source).not.toContain("elevation.level3");
        });

        it("SPEC-05 §6 ACC-MD-08: message flow, timing, and action intact", () => {
            const source = readRepo("context/ToastContext.tsx");
            expect(source).toContain("showToast");
            expect(source).toContain("duration={5000}");
            expect(source).toContain('label: "OK"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
