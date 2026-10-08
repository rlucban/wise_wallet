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
            const start = settings.indexOf("{showPinPrompt && (");
            const modalOpen = settings.indexOf("<NativeModal", start);
            const modalClose = settings.indexOf("</NativeModal>", modalOpen);
            expect(modalOpen).toBeGreaterThan(start);
            expect(modalClose).toBeGreaterThan(modalOpen);
            const modal = settings.slice(modalOpen, modalClose);
            expect(modal).toContain("visible={showPinPrompt}");
            expect(modal).toContain("transparent");
            expect(modal).toContain('animationType="fade"');
            expect(modal).toContain('presentationStyle="overFullScreen"');
            expect(modal).toContain("onRequestClose={() => setShowPinPrompt(false)}");
            expect(settings).toContain(
                'behavior={Platform.OS === "ios" ? "padding" : "height"}'
            );
            expect(modal).toContain('backgroundColor: "rgba(0, 0, 0, 0.32)"');
            expect(modal).toContain('justifyContent: "center"');
            expect(modal).toContain('alignItems: "center"');
            expect(modal).toContain("<KeyboardAvoidingView");
            expect(modal).toContain("<Pressable style={StyleSheet.absoluteFill}");
        });

        it("ACC-02: exactly one wrapper, and it closes the showPinPrompt dialog", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const wrappers = settings.match(/<KeyboardAvoidingView/g) ?? [];
            expect(wrappers.length).toBe(1);
            const start = settings.indexOf("{showPinPrompt && (");
            const modalOpen = settings.indexOf("<NativeModal", start);
            const modalClose = settings.indexOf("</NativeModal>", modalOpen);
            const open = settings.indexOf("<KeyboardAvoidingView", modalOpen);
            const close = settings.indexOf("</KeyboardAvoidingView>", open);
            expect(open).toBeGreaterThan(modalOpen);
            expect(close).toBeGreaterThan(open);
            expect(close).toBeLessThan(modalClose);
            // The centered Modal hosts the keyboard wrapper and PIN card.
            const inside = settings.slice(open, close);
            expect(inside).toContain("Enter PIN to Clear Data");
            expect(inside).toContain("onPress={handleClearData}");
            // No stray closing tag outside the conditional.
            const total = settings.split("</KeyboardAvoidingView>").length - 1;
            expect(total).toBe(1);
        });

        it("SPEC-57 scope: no other dialog gained a wrapper", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            // Only the Clear Data PIN card is wrapped by a KeyboardAvoidingView.
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