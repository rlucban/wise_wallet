import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function prefixedKeys(src: string): string[] {
    const out: string[] = [];
    const re = /getPrefixedKey\("([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
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

function runSuite(os: "android" | "ios" | "web") {
    describe(`pin verify freshness window on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: freshness contract in PasscodeContext, memory-only", () => {
            const ctx = readRepo("context/PasscodeContext.tsx");
            expect(ctx).toContain("PIN_VERIFY_FRESH_MS = 5 * 60 * 1000");
            expect(ctx).toContain("lastPinVerifiedAt: number | null");
            expect(ctx).toContain("useState<number | null>(null)");
            expect(ctx).toContain("markPinVerified: () => void");
            expect(ctx).toContain("setLastPinVerifiedAt(Date.now())");
            expect(ctx).toContain("export function isPinVerificationFresh");
            expect(ctx).toContain("setLastPinVerifiedAt(null);");
            expect(prefixedKeys(ctx)).toEqual(["passcode", "passcode", "passcode", "passcode"]);
        });

        it("ACC-02: three marks, skip-open, save-gate", () => {
            const screen = readRepo("app/passcode-screen.tsx");
            expect(screen).toContain("markPinVerified();");
            expect(screen).toContain("verifyPasscode(cleaned).then((ok)");
            const settings = readRepo("app/(tabs)/settings.tsx");
            expect(
                settings.match(
                    /if \(isLocal && isPasscodeEnabled && isPinVerificationFresh\(lastPinVerifiedAt\)\) setPinStep\(2\);/g
                ) || []
            ).toHaveLength(2);
            // SPEC-89 v1.5: dead step-1 mark + live step-1 mark + save mark (old block kept, CON-23).
            expect(settings.match(/markPinVerified\(\);/g) || []).toHaveLength(3);
            expect(settings).toContain(
                "const pinFresh = isLocal && isPasscodeEnabled && isPinVerificationFresh(lastPinVerifiedAt);"
            );
            expect(settings).toContain(
                'if (isLocal && isPasscodeEnabled && !pinFresh && current.trim() === "")'
            );
            expect(settings).toContain("if (isLocal) markPinVerified();");
        });

        it("ACC-03: Cloud identical, no new copy, no platform branch", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            expect(settings).toContain(
                "body: JSON.stringify({ currentPasscode: current, newPasscode: next })"
            );
            expect(settings).toContain("Current PIN is incorrect");
            expect(settings).toContain("Too many attempts, try again later");
            expect(settings).not.toContain("PIN_VERIFY_FRESH_MS");
            expect(settings).not.toContain("recently verified");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
