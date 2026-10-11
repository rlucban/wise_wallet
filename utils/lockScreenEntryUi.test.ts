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

const SCREEN = "app/passcode-screen.tsx";

function runSuite(os: "android" | "ios" | "web") {
    describe(`lock screen ios entry parity on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: Step-1 copy, hidden native input", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("Enter passcode");
            expect(source).toContain("After 3 failed attempts you'll need to reset your passcode.");
            expect(source).toContain("[1, 2, 3, 4].map((i)");
            expect(source).toContain("input.length >= i");
            expect(source).toContain("inputRef.current?.focus()");
            expect(source).toContain('keyboardType="numeric"');
            expect(source).toContain("secureTextEntry");
            expect(source).toContain("maxLength={4}");
            expect(source).toContain("autoFocus");
            expect(source).toContain("opacity: 0");
            expect(source).toContain("height: 1");
            expect(source).toContain('position: "absolute"');
            expect(source).toContain("top: 0,");
            expect(source).not.toContain("Enter your 4-digit PIN to access WiseWallet");
            expect(source).not.toContain("4-Digit Passcode");
            expect(source).not.toContain("label=");
            expect(source).not.toContain("placeholder=");
        });

        it("ACC-02: gate behavior intact", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("cleaned.length === 4");
            expect(source).toContain("setIsUnlocked(true)");
            expect(source).toContain("markPinVerified();");
            expect(source).toContain("Incorrect passcode. Please try again.");
            expect(source).toContain('setInput("");');
            expect(source).toContain("HelperText");
        });

        it("ACC-03: adopted styles, scope confined", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("paddingHorizontal: 32");
            expect(source).toContain("paddingVertical: 48");
            expect(source).toContain("gap: 20");
            expect(source).toContain("width: 18,");
            expect(source).toContain("maxWidth: 320");
            expect(source).toContain("borderRadius: 12");
            expect(source).not.toContain("maxWidth: 440");
            expect(source).not.toContain("inputContent");
            expect(source).not.toContain("failedAttempts");
            const settings = readRepo("app/(tabs)/settings.tsx");
            expect(settings).toContain('{pinStep === 1 ? "Enter passcode"');
        });

        it("ACC-04: no KAV anywhere", () => {
            const source = readRepo(SCREEN);
            expect(source).not.toContain("KeyboardAvoidingView");
            expect(source).not.toContain("Platform");
            expect(source).not.toContain("behavior=");
            expect(source).toContain("<ScrollView");
            expect(source).toContain("</ScrollView>");
        });

        it("ACC-05: Unlock button same-path", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain('mode="contained"');
            expect(source).toMatch(/^\s*Unlock\s*$/m);
            expect(source).toContain("disabled={input.length !== 4}");
            expect(source).toContain("onPress={() => handleInputChange(input)}");
            expect(source).toContain("cleaned.length === 4");
            expect(source).toContain("unlockButtonContent");
        });

        it("ACC-08: centered container, intact, no KAV", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("flexGrow: 1");
            expect(source).toContain("justifyContent: \"center\"");
            expect(source).not.toContain("flex-start");
            expect(source).not.toContain("paddingTop: 80");
            expect(source).not.toContain("KeyboardAvoidingView");
            expect(source).toMatch(/^\s*Unlock\s*$/m);
        });

        it("ACC-09: scroll inside tap Pressable", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("ScrollView, TextInput as NativeTextInput");
            const pressOpen = source.indexOf("<Pressable");
            const scOpen = source.indexOf("<ScrollView", pressOpen);
            const scClose = source.indexOf("</ScrollView>", scOpen);
            const pressClose = source.lastIndexOf("</Pressable>");
            expect(pressOpen).toBeGreaterThan(-1);
            expect(scOpen).toBeGreaterThan(pressOpen);
            expect(scClose).toBeGreaterThan(scOpen);
            expect(pressClose).toBeGreaterThan(scClose);
            expect(source).toContain("flexGrow: 1");
            expect(source).toContain('keyboardShouldPersistTaps="handled"');
        });

        it("ACC-10: no KAV behavior or import", () => {
            const source = readRepo(SCREEN);
            expect(source).not.toContain("KeyboardAvoidingView");
            expect(source).not.toContain("behavior=");
            expect(source).not.toContain("Platform");
            expect(source).toContain("<ScrollView");
            expect(source).toContain("keyboardShouldPersistTaps");
        });

        it("ACC-11: gate themed and bounded, rest intact", () => {
            const layout = readRepo("app/_layout.tsx");
            expect(layout).toContain("if (isPasscodeEnabled && !isUnlocked)");
            expect(layout).toContain("<PaperProvider theme={theme}>");
            expect(layout).toContain("<View style={{ flex: 1 }}><PasscodeScreen /></View>");
            const source = readRepo(SCREEN);
            expect(source).not.toContain("KeyboardAvoidingView");
        });

        it("ACC-12: hidden input parked at top, handlers intact", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain('position: "absolute"');
            expect(source).toContain("top: 0,");
            expect(source).toContain("opacity: 0");
            expect(source).toContain("ref={inputRef}");
            expect(source).toContain("autoFocus");
            expect(source).toContain("onChangeText={handleInputChange}");
            expect(source).toContain("inputRef.current?.focus()");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
