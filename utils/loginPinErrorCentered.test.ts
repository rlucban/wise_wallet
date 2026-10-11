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

const SCREEN = "app/login.tsx";

function runSuite(os: "android" | "ios" | "web") {
    describe(`login pin error centered on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: PIN error centered, email error untouched", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain('visible={!!pinError} style={{ textAlign: "center" }}');
            expect(source).toContain('<HelperText type="error" visible={!!nameError}>');
            expect(source).not.toContain('textAlign: "left"');
        });

        it("ACC-02: PIN strings, logic, and flow intact", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("Passcode must be exactly 4 digits");
            expect(source).toContain("visible={!!pinError}");
            expect(source).toContain("{pinError}");
            expect(source).toContain('placeholder="Enter a 4-digit PIN"');
            expect(source).toContain("onPress={() => handleLogin(false)}");
        });

        it("ACC-03: scope confined", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain('<HelperText type="error" visible={!!nameError}>');
            expect(source).toContain("onPress={() => router.replace(\"/register\")}");
            expect(source).toContain("secureTextEntry={!showPin}");
            expect(source).toContain("maxLength={4}");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
