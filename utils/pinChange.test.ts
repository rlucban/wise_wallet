import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function sliceFunction(source: string, startMarker: string, endMarker: string): string {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-35 pin change on ${os}`, () => {
        it("ACC-01: converged writes, no plaintext-only path", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const handler = sliceFunction(
                settings,
                "const handleChangePasscode",
                "// Local: fully offline"
            );
            // Cloud branch reaches the server endpoint …
            expect(handler).toContain('authFetch<{ token?: string }>("auth/change-passcode"');
            // … and both branches converge the local mirror + lock.
            expect(settings).toContain("await updateUserPasscode(activeUserId, next)");
            expect(handler).toContain("setPasscode(next)");
            // Lock persists hashed, never plaintext.
            const ctx = readRepo("context/PasscodeContext.tsx");
            expect(ctx).toContain("CryptoDigestAlgorithm.SHA256");
            expect(ctx).toContain("setSecureItem(key, h)");
            expect(ctx).not.toContain("setSecureItem(key, passcode)");
            expect(ctx).not.toContain("setSecureItem(key, plain)");
        });

        it("ACC-02: Cloud save blocked offline with exact copy", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            // Handler guard precedes any endpoint call …
            const handler = sliceFunction(
                settings,
                "const handleChangePasscode",
                "// Local: fully offline"
            );
            expect(handler).toContain("if (!isOnline) {");
            expect(handler.indexOf("if (!isOnline) {")).toBeLessThan(
                handler.indexOf("auth/change-passcode")
            );
            // … dialog notice + both save buttons share the gate and copy.
            const gates = settings.match(/!isLocal && !isOnline/g) ?? [];
            expect(gates.length).toBeGreaterThanOrEqual(3);
            const copies = settings.match(/Connect to change your Cloud PIN\./g) ?? [];
            expect(copies.length).toBe(2);
        });

        it("ACC-03: validation parity + single-source branching", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            // The passcode-vs-flag split is gone — entry button and dialog agree.
            expect(settings).not.toContain("{passcode ? (");
            // new !== current enforced at disable time, not just late in the handler.
            const parity = settings.match(
                /currentPasscodeInput\.trim\(\) !== "" && newPasscodeInput\.trim\(\) === currentPasscodeInput\.trim\(\)/g
            ) ?? [];
            expect(parity.length).toBe(2);
        });

        it("ACC-04: mapped failures never report partial success", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const handler = sliceFunction(
                settings,
                "const handleChangePasscode",
                "// Local: fully offline"
            );
            expect(handler).toContain("result.status === 401");
            expect(handler).toContain("Current PIN is incorrect");
            expect(handler).toContain("result.status === 429");
            expect(handler).toContain("Too many attempts, try again later");
            // The !ok path returns before any success dialog.
            const failure = sliceFunction(handler, "if (!result.ok) {", "const freshToken");
            expect(failure).not.toContain("setMessageDialog");
        });

        it("ACC-05: lock hydrates before gate, clears on sign-out", () => {
            const ctx = readRepo("context/PasscodeContext.tsx");
            expect(ctx).toContain('getPrefixedKey("passcode"');
            expect(ctx).toContain("if (!hydrated) return null;");
            expect(ctx).toContain("removeSecureItem(await getPrefixedKey(");
            expect(ctx).toContain("verifyPasscode");
            const screen = readRepo("app/passcode-screen.tsx");
            expect(screen).toContain("verifyPasscode(cleaned)");
        });

        it("ACC-06: 401 session_ended path untouched", () => {
            const api = readRepo("utils/apiClient.ts");
            expect(api).toContain("onAuthFailure('session_ended')");
            const settings = readRepo("app/(tabs)/settings.tsx");
            expect(settings).not.toContain("onAuthFailure");
            expect(settings).not.toContain("clearAuthStorage");
            const layout = readRepo("app/_layout.tsx");
            expect(layout).toContain('authFailureReason === "session_ended"');
        });

        it(`online gating is platform-neutral on ${os}`, () => {
            // The change path gates on useNetwork (which owns the web pin),
            // never on an inline Platform.OS branch.
            const settings = readRepo("app/(tabs)/settings.tsx");
            const handler = sliceFunction(
                settings,
                "const handleChangePasscode",
                "const autoBackup"
            );
            expect(handler).not.toContain("Platform.OS");
            expect(settings).toContain("const { isOnline } = useNetwork();");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
