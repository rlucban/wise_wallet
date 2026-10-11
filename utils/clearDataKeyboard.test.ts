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

        it("ACC-02: exactly the five known wrappers, and one closes the showPinPrompt dialog", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const wrappers = settings.match(/<KeyboardAvoidingView/g) ?? [];
            // Five known wrappers, all the same mirror pattern: Clear-Data PIN
            // (SPEC-57) + change dialog (SPEC-89 v1.2) + verify (SPEC-93) +
            // new-account (SPEC-94) + conflict (SPEC-95).
            expect(wrappers.length).toBe(5);
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
            expect(total).toBe(5);
            // SPEC-89 v1.2: the second wrapper lives in the change dialog only.
            const chStart = settings.indexOf("visible={showChangePasscodeDialog && (!isPasscodeEnabled || pinStep === 2)}");
            const chClose = settings.indexOf("</NativeModal>", chStart);
            const chBlock = settings.slice(chStart, chClose);
            expect(chBlock).toContain("<KeyboardAvoidingView");
            expect(chBlock).toContain("</KeyboardAvoidingView>");
            expect(chBlock).toContain("<Surface");
            // SPEC-93/94/95: the third/fourth/fifth wrappers live in the
            // verify, new-account, and conflict dialogs only.
            for (const anchor of ["visible={showPinVerificationDialog}", "visible={showNewAccountDialog}", "visible={showConflictDialog}"]) {
                const bStart = settings.indexOf(anchor);
                const bClose = settings.indexOf("</NativeModal>", bStart);
                const block = settings.slice(bStart, bClose);
                expect(block).toContain("<KeyboardAvoidingView");
                expect(block).toContain("</KeyboardAvoidingView>");
                expect(block).toContain("<Surface");
            }
        });

        it("SPEC-57 scope: no other dialog gained a wrapper", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            // Five dialogs are wrapped (Clear Data PIN + change + verify +
            // new-account + conflict); the only bare Paper dialogs left are
            // the backup prompt and the shared message dialog.
            const dialogs = settings.match(/<Dialog visible=/g) ?? [];
            expect(dialogs.length).toBe(2);
            expect(settings).toContain("<Dialog visible={showBackupDialog}");
            expect(settings).toContain("<Dialog visible={messageDialog.visible}");
            // Five open tags + five close tags only (import + comment don't count).
            expect(settings.match(/<KeyboardAvoidingView/g)?.length).toBe(5);
            expect(settings.match(/<\/KeyboardAvoidingView>/g)?.length).toBe(5);
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