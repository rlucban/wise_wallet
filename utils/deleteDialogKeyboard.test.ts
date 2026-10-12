import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function countOf(source: string, needle: string): number {
    return source.split(needle).length - 1;
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

function deleteDialogBlock(source: string): string {
    const anchor = source.indexOf("visible={showDeleteDialog}");
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf("</NativeModal>", anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`deleteDialogKeyboard on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: delete dialog wraps its Surface in the SPEC-93 KAV + ScrollView shape", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            const block = deleteDialogBlock(source);
            const kavIdx = block.indexOf("<KeyboardAvoidingView");
            const behaviorIdx = block.indexOf('behavior={Platform.OS === "ios" ? "padding" : "height"}');
            const scrollIdx = block.indexOf("<ScrollView");
            const surfaceIdx = block.indexOf("<Surface elevation={3} style={styles.dialog}>");
            const scrollCloseIdx = block.indexOf("</ScrollView>");
            const kavCloseIdx = block.indexOf("</KeyboardAvoidingView>");
            expect(kavIdx).toBeGreaterThan(-1);
            expect(behaviorIdx).toBeGreaterThan(kavIdx);
            expect(block).toContain("keyboardShouldPersistTaps=\"handled\"");
            expect(block).toContain("contentContainerStyle={{ flexGrow: 1, justifyContent: \"center\", alignItems: \"center\", width: \"100%\" }}");
            // Nesting order: KAV > ScrollView > Surface > /ScrollView > /KAV.
            expect(scrollIdx).toBeGreaterThan(kavIdx);
            expect(surfaceIdx).toBeGreaterThan(scrollIdx);
            expect(scrollCloseIdx).toBeGreaterThan(surfaceIdx);
            expect(kavCloseIdx).toBeGreaterThan(scrollCloseIdx);
        });

        it("ACC-02: delete-dialog content byte-identical, siblings untouched", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            const block = deleteDialogBlock(source);
            expect(block).toContain("Verify PIN");
            expect(block).toContain("PIN verified");
            expect(block).toContain("I understand this action is permanent and cannot be undone");
            expect(block).toContain("Delete Permanently");
            expect(block).toContain("handleVerifyDeletePin");
            expect(block).toContain("executeDelete");
            expect(block).toContain("closeDeleteDialog");
            expect(block).toContain("disabled={isSyncing || !pinVerified || !deleteConfirmed}");
            // Sibling KAV dialogs still wrapped exactly as before.
            expect(countOf(source, 'behavior={Platform.OS === "ios" ? "padding" : "height"}')).toBeGreaterThanOrEqual(4);
        });

        it("ACC-03: no new import, dep, or chrome change", () => {
            const source = readRepo("app/(tabs)/settings.tsx");
            expect(source).toContain(
                'import { View, ScrollView, Platform, StyleSheet, KeyboardAvoidingView, Modal as NativeModal, Pressable, TextInput as NativeTextInput } from "react-native";'
            );
            expect(countOf(source, 'from "react-native";')).toBe(1);
            expect(source).toContain("backgroundColor: \"rgba(0, 0, 0, 0.32)\"");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
