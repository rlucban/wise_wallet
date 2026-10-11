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

function runSuite(os: "android" | "ios" | "web") {
    describe(`change-passcode ios entry ui on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: Step-1 ios visuals, hidden native input", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain('{pinStep === 1 ? "Enter passcode"');
            expect(source).toContain("After 3 failed attempts you'll need to reset your passcode.");
            expect(source).toContain("[1, 2, 3, 4].map((i)");
            expect(source).toContain("currentPasscodeInput.length >= i");
            expect(source).toContain("hiddenPinInputRef.current?.focus()");
            expect(source).toContain("secureTextEntry");
            expect(source).toContain('keyboardType="numeric"');
            expect(source).toContain("maxLength={4}");
            expect(source).toContain('slice(0, 4)');
            expect(source).toContain("autoFocus");
            expect(source).toContain("opacity: 0");
            expect(source).not.toContain('pinStep === 1 ? "Change Passcode"');
            const step1 = source.slice(
                source.indexOf("pinStep === 1 ? ("),
                source.indexOf("// Step 2: Enter new passcode")
            );
            expect(step1).not.toContain("Enter your current passcode to verify.");
            expect(step1).not.toContain('label="Current Passcode"');
        });

        it("ACC-02: verify behavior intact", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("/^\\d{4}$/");
            expect(source).toContain("Enter your current 4-digit PIN.");
            expect(source).toContain("Incorrect Current PIN. Try again.");
            expect(source).toContain("setPinStep(2)");
            expect(source).toContain("currentPasscodeInput.trim().length !== 4");
            expect(source).toContain("Verify Current PIN");
            expect(source).toContain('"Enter New Passcode"');
            expect(source).toContain("Choose a new 4-digit passcode.");
        });

        it("ACC-03: scope confined, no lockout machinery", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain('presentationStyle="overFullScreen"');
            expect(source).toContain("styles.dialog");
            expect(source).not.toContain("failedAttempts");
            expect(source).not.toContain("lockout");
            expect(source).not.toContain("resetPasscode");
        });

        it("ACC-04: blur backdrop, dim gone in change dialog", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain('from "expo-blur"');
            const start = source.indexOf("visible={showChangePasscodeDialog && (!isPasscodeEnabled || pinStep === 2)}");
            if (start < 0) throw new Error("change dialog missing");
            const block = source.slice(start, source.indexOf("</NativeModal>", start));
            expect(block).toContain('<BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />');
            expect(block).not.toContain("rgba(0, 0, 0, 0.32)");
            expect(block).toContain("onPress={closeChangePasscodeDialog}");
            expect(readRepo("package.json")).toContain('"expo-blur"');
        });

        it("ACC-05: shared dialog intact, Step-1 local override", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("maxWidth: 480,");
            expect(source).toContain('width: "90%",');
            expect(source).toContain("maxWidth: 520, paddingVertical: 16");
            expect(source).toContain('style={{ flexDirection: "row", justifyContent: "center", marginVertical: 28 }}');
            expect(source).toContain("hiddenPinInputRef.current?.focus()");
        });

        it("ACC-06: lock-screen dots, v1.0 copies intact", () => {
            const source = readRepo(SCREEN);
            const step1 = source.slice(
                source.indexOf("pinStep === 1 ? ("),
                source.indexOf("// Step 2: Enter new passcode")
            );
            expect(step1).toContain("width: 16,");
            expect(step1).toContain("height: 16,");
            expect(step1).not.toContain("borderWidth");
            expect(step1).toContain("paperTheme.colors.outlineVariant");
            expect(source).toContain('{pinStep === 1 ? "Enter passcode"');
            expect(step1).toContain("After 3 failed attempts you'll need to reset your passcode.");
        });
        it("ACC-07: change-dialog keyboard avoidance wraps the Surface", () => {
            const source = readRepo(SCREEN);
            const start = source.indexOf("visible={showChangePasscodeDialog && (!isPasscodeEnabled || pinStep === 2)}");
            if (start < 0) throw new Error("change dialog missing");
            const block = source.slice(start, source.indexOf("</NativeModal>", start));
            expect(block).toContain("<KeyboardAvoidingView");
            expect(block).toContain('behavior={Platform.OS === "ios" ? "padding" : "height"}');
            expect(block).toContain("</KeyboardAvoidingView>");
            expect(block).toContain("<Surface");
            expect(block).toContain("onPress={closeChangePasscodeDialog}");
        });

        it("ACC-09: scroll-bounded dialog inside KAV", () => {
            const source = readRepo(SCREEN);
            const start = source.indexOf("visible={showChangePasscodeDialog && (!isPasscodeEnabled || pinStep === 2)}");
            if (start < 0) throw new Error("change dialog missing");
            const block = source.slice(start, source.indexOf("</NativeModal>", start));
            expect(block).toContain('style={{ flex: 1, width: "100%" }}');
            expect(block).toContain("<ScrollView");
            expect(block).toContain("flexGrow: 1");
            expect(block).toContain('keyboardShouldPersistTaps="handled"');
            expect(block).toContain("</ScrollView>");
            expect(block).toContain("</KeyboardAvoidingView>");
        });

        it("ACC-10: bounded scroll, no centering extras", () => {
            const source = readRepo(SCREEN);
            const start = source.indexOf("visible={showChangePasscodeDialog && (!isPasscodeEnabled || pinStep === 2)}");
            if (start < 0) throw new Error("change dialog missing");
            const block = source.slice(start, source.indexOf("</NativeModal>", start));
            expect(block).toContain('style={{ flex: 1, width: "100%" }}');
            expect(block).not.toContain('width: "100%", alignItems: "center", justifyContent: "center"');
            expect(block).toContain("flexGrow: 1");
            expect(block).toContain("<Surface");
        });
        it("ACC-11: modal-1 scroll wrap, design intact", () => {
            const source = readRepo(SCREEN);
            const m1 = source.indexOf("visible={showChangePasscodeDialog && isPasscodeEnabled && pinStep === 1}");
            if (m1 < 0) throw new Error("modal 1 missing");
            const b1 = source.slice(m1, source.indexOf("</NativeModal>", m1));
            expect(b1).toContain("<ScrollView");
            expect(b1).toContain("</ScrollView>");
            expect(b1).toContain("flexGrow: 1");
            expect(b1).toContain("headlineMedium");
            expect(b1).toContain("Verify");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
