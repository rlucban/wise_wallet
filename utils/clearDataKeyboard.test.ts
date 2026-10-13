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

        it("ACC-02: exactly the six known wrappers, and one closes the showPinPrompt dialog", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const wrappers = settings.match(/<KeyboardAvoidingView/g) ?? [];
            // Six known wrappers, all the same mirror pattern: Clear-Data PIN
            // (SPEC-57) + change dialog (SPEC-89 v1.2) + verify (SPEC-93) +
            // new-account (SPEC-94) + conflict (SPEC-95) + delete-account (SPEC-102).
            expect(wrappers.length).toBe(6);
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
            expect(total).toBe(6);
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
            // SPEC-102: the sixth wrapper lives in the delete-account dialog only.
            {
                const dStart = settings.indexOf("visible={showDeleteDialog}");
                const dClose = settings.indexOf("</NativeModal>", dStart);
                const dBlock = settings.slice(dStart, dClose);
                expect(dBlock).toContain("<KeyboardAvoidingView");
                expect(dBlock).toContain("</KeyboardAvoidingView>");
                expect(dBlock).toContain("<Surface");
                expect(dBlock).toContain("Delete Permanently");
            }
        });

        it("SPEC-57 scope: no other dialog gained a wrapper", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            // Six dialogs are wrapped (Clear Data PIN + change + verify +
            // new-account + conflict + delete-account); messageDialog uses NativeModal
            // for Android vertical centering; the only bare Paper dialog left is showBackupDialog.
            const dialogs = settings.match(/<Dialog visible=/g) ?? [];
            expect(dialogs.length).toBe(1);
            expect(settings).toContain("<Dialog visible={showBackupDialog}");
            expect(settings).toContain("visible={messageDialog.visible}");
            // Six open tags + six close tags only (import + comment don't count).
            expect(settings.match(/<KeyboardAvoidingView/g)?.length).toBe(6);
            expect(settings.match(/<\/KeyboardAvoidingView>/g)?.length).toBe(6);
        });

        it("ACC-03: messageDialog paints last in the Portal", () => {
            const settings = readRepo("app/(tabs)/settings.tsx");
            const messageIdx = settings.indexOf("visible={messageDialog.visible}");
            const portalEnd = settings.indexOf("</Portal>");
            // The shared success/error dialog must be inside Portal before its closing tag.
            expect(messageIdx).toBeGreaterThan(0);
            expect(messageIdx).toBeLessThan(portalEnd);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");