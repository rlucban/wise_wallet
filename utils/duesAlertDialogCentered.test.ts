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

// SPEC-93 lesson (2026-10-11): anchor on the OPENER, never slice from `visible=`.
function alertDialogBlock(source: string): string {
    const anchor = source.lastIndexOf("<NativeModal", source.indexOf('visible={alertDialog.visible}'));
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf("</NativeModal>", anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`duesAlertDialogCentered on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: alert dialog is a NativeModal + scrim + Surface wrap (not a bare Paper Dialog)", () => {
            const source = readRepo("app/dues.tsx");
            const block = alertDialogBlock(source);
            expect(block).toContain("transparent");
            expect(block).toContain('animationType="fade"');
            expect(block).toContain('presentationStyle="overFullScreen"');
            expect(block).toContain("visible={alertDialog.visible}");
            expect(block).toContain("<View style={styles.scrim}>");
            expect(block).toContain("<Pressable style={StyleSheet.absoluteFill}");
            expect(block).toContain("<Surface elevation={3} style={styles.dialog}>");
            // Nesting order: NativeModal > scrim View > Pressable > Surface > Dialog.Icon.
            const pressableIdx = block.indexOf("<Pressable style={StyleSheet.absoluteFill}");
            const surfaceIdx = block.indexOf("<Surface elevation={3} style={styles.dialog}>");
            const iconIdx = block.indexOf("<Dialog.Icon");
            expect(pressableIdx).toBeGreaterThan(-1);
            expect(surfaceIdx).toBeGreaterThan(pressableIdx);
            expect(iconIdx).toBeGreaterThan(surfaceIdx);
            // No dead Portal wrapper around the alert dialog, no KAV, no ScrollView.
            expect(block).not.toContain("<Portal>");
            expect(block).not.toContain("<KeyboardAvoidingView");
            expect(block).not.toContain("<ScrollView");
        });

        it("ACC-02: dialog content byte-identical", () => {
            const source = readRepo("app/dues.tsx");
            const block = alertDialogBlock(source);
            expect(block).toContain(
                'icon={alertDialog.title === "Error" || alertDialog.title === "Insufficient Balance" ? "alert-circle-outline" : "check-circle-outline"}'
            );
            expect(block).toContain('<Dialog.Title style={{ textAlign: "center" }}>{alertDialog.title}</Dialog.Title>');
            expect(block).toContain('<Dialog.Content>');
            expect(block).toContain('style={{ textAlign: "center", lineHeight: 22 }}');
            expect(block).toContain("{alertDialog.message}");
            expect(block).toContain('<Dialog.Actions style={{ justifyContent: "center" }}>');
            expect(block).toContain('<Button mode="contained" onPress={() => setAlertDialog((prev) => ({ ...prev, visible: false }))}>');
            expect(block).toContain("OK");
        });

        it("ACC-03: all three dismiss paths call the same handler", () => {
            const source = readRepo("app/dues.tsx");
            const block = alertDialogBlock(source);
            const dismiss = "setAlertDialog((prev) => ({ ...prev, visible: false }))";
            expect(block).toContain(`onRequestClose={() => ${dismiss}}`);
            expect(block).toContain(`onPress={() => ${dismiss}} />`);
            expect(block).toContain(`onPress={() => ${dismiss}}>`);
        });

        it("ACC-04: imports widened minimally and styles pinned", () => {
            const source = readRepo("app/dues.tsx");
            expect(source).toContain(
                'import { View, Pressable, StyleSheet, Modal as NativeModal } from "react-native";'
            );
            expect(source).toContain(
                'import { Appbar, Text, Card, FAB, Portal, Modal, TextInput, Button, Checkbox, useTheme, Chip, IconButton, SegmentedButtons, Dialog, Surface } from "react-native-paper";'
            );
            expect(source).toContain("styles.scrim");
            expect(source).toContain("styles.dialog");
            expect(source).toContain('backgroundColor: "rgba(0, 0, 0, 0.32)"');
            expect(source).toContain("maxWidth: 480");
            expect(source).toContain('width: "90%"');
            expect(source).toContain("alignSelf: \"center\"");
            expect(source).toContain("marginHorizontal: 0");
            expect(source).toContain("borderRadius: 16");
            expect(source).toContain('overflow: "hidden"');
            // Portal still imported and still used by the pay dialog + date picker (4 openers remain; the dead one was removed with this block).
            expect(source).toContain("FAB, Portal, Modal");
            expect(countOf(source, "<Portal>")).toBe(4);
            // alertDialog consumers outside this block are untouched.
            expect(source).toContain('title: "Invalid Amount"');
            expect(source).toContain('title: "Invalid Category"');
            expect(source).toContain('title: "Transaction Recorded"');
        });

        it("ACC-05: only one NativeModal on the dues screen; out-of-scope Dialog sites untouched", () => {
            const dues = readRepo("app/dues.tsx");
            expect(countOf(dues, "<NativeModal")).toBe(1);
            expect(countOf(dues, "alertDialog.visible")).toBe(1);
            const addDue = readRepo("app/add-due.tsx");
            const addTx = readRepo("app/add-transaction.tsx");
            const settings = readRepo("app/(tabs)/settings.tsx");
            const register = readRepo("app/register.tsx");
            expect(addDue).toContain("<Dialog visible={alertDialog.visible}");
            expect(addTx).toContain("<Dialog visible={alertDialog.visible}");
            expect(settings).toContain("<Dialog visible={showBackupDialog}");
            expect(register).toContain("<Dialog visible={dialog.visible}");
            expect(countOf(addDue, "<NativeModal")).toBe(0);
            expect(countOf(addTx, "<NativeModal")).toBe(0);
            expect(countOf(register, "<NativeModal")).toBe(0);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
