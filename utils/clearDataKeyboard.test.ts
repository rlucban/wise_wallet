import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-57 clear-data dialog keyboard on ${os}`, () => {
        it("ACC-01: avoidance wrapper is conditionally mounted", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            // Regression guard: an always-mounted KeyboardAvoidingView renders a
            // full-height flex layer inside the Portal, which on web swallows
            // scroll and taps (reported 2026-10-07). It MUST be gated on the
            // dialog being open.
            expect(settings).toContain("{showPinPrompt && (");
            expect(settings).toContain("<KeyboardAvoidingView");
            expect(settings).toContain(
                'behavior={Platform.OS === "ios" ? "padding" : "height"}'
            );
            expect(settings).toContain("style={{ flex: 1 }}");
        });

        it("ACC-02: exactly one wrapper, and it closes the showPinPrompt dialog", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const wrappers = settings.match(/<KeyboardAvoidingView/g) ?? [];
            expect(wrappers.length).toBe(1);
            const start = settings.indexOf("{showPinPrompt && (");
            const open = settings.indexOf("<KeyboardAvoidingView", start);
            const close = settings.indexOf("</KeyboardAvoidingView>", open);
            expect(open).toBeGreaterThan(start);
            expect(close).toBeGreaterThan(open);
            // The dialog and its gate button sit between the wrapper's tags.
            const inside = settings.slice(open, close);
            expect(inside).toContain("visible={showPinPrompt}");
            expect(inside).toContain("Enter PIN to Clear Data");
            expect(inside).toContain("onPress={handleClearData}");
            // No stray closing tag outside the conditional.
            const total = settings.split("</KeyboardAvoidingView>").length - 1;
            expect(total).toBe(1);
        });

        it("SPEC-57 scope: no other dialog gained a wrapper", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            // v0.1 wrapped the clear-data PIN dialog only; other PIN dialogs
            // (verify-sync, delete-account, change-passcode) are untouched.
            const dialogs = settings.match(/<Dialog visible=/g) ?? [];
            expect(dialogs.length).toBeGreaterThan(3);
            // One open tag + one close tag only (import + comment don't count).
            expect(settings.match(/<KeyboardAvoidingView/g)?.length).toBe(1);
            expect(settings.match(/<\/KeyboardAvoidingView>/g)?.length).toBe(1);
        });

        it("ACC-03: messageDialog paints last in the Portal", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const dialogs = [...settings.matchAll(/<Dialog visible=/g)].map((m) => m.index ?? 0);
            const messageIdx = settings.indexOf("visible={messageDialog.visible}");
            const portalEnd = settings.indexOf("</Portal>");
            // The shared success/error dialog must be the last Dialog child.
            expect(messageIdx).toBeGreaterThan(Math.max(...dialogs.filter((i) => i !== messageIdx)));
            expect(messageIdx).toBeLessThan(portalEnd);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");