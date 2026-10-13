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

// SPEC-93 lesson: anchor on the opener, never slice from a bare `visible=`.
function prefillEffectBlock(source: string): string {
    const anchor = source.indexOf('setSelectedCategory(tx.category || null)');
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf("const pickImage", anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

function categorySectionBlock(source: string): string {
    const anchor = source.indexOf(">Category</Text>");
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf('label="Establishment / Location"', anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`editTransactionCategoryFeedback on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: unknown-id Others clears the selection instead of keeping an invisible category", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const block = prefillEffectBlock(source);
            expect(block).toContain("const isKnown = availableCategories.some((c) => c.id === tx.category?.id);");
            expect(block).toContain('if (!isKnown && tx.category.name === "Others") {');
            const clearBranch = block.slice(
                block.indexOf('if (!isKnown && tx.category.name === "Others") {'),
                block.indexOf('} else if (!isKnown) {')
            );
            expect(clearBranch).toContain("setSelectedCategory(null);");
            expect(clearBranch).toContain('setCustomCategory("");');
            // The dead escape hatch is gone.
            expect(block).not.toContain('tx.category.name !== "Others"');
        });

        it("ACC-02: the data-preserving path for a real custom name still runs", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const block = prefillEffectBlock(source);
            expect(block).toContain("} else if (!isKnown) {");
            const keepBranch = block.slice(
                block.indexOf("} else if (!isKnown) {"),
                block.indexOf("} else {", block.indexOf("} else if (!isKnown) {"))
            );
            expect(keepBranch).toContain("const others = ensureOthersOption(availableCategories, tx.type).find((c) => c.name === \"Others\") || null;");
            expect(keepBranch).toContain("setSelectedCategory(others);");
            expect(keepBranch).toContain("setCustomCategory(tx.category.name);");
            // The untouched outer guards survive.
            expect(block).toContain("setSelectedCategory(tx.category || null);");
            expect(block).toContain("} else {");
            expect(block).toContain('setCustomCategory("");');
        });

        it("ACC-03: persistent error HelperText derived only from the selection", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const chunk = categorySectionBlock(source);
            expect(chunk).toContain('<HelperText type="error" visible={!selectedCategory} style={{ marginBottom: 16 }}>');
            expect(chunk).toContain("Please select a category.");
            // Not gated on a save-attempt flag or an errors map.
            expect(chunk).not.toContain("saveAttempted");
            expect(chunk).not.toContain("errors[");
            expect(chunk).not.toContain("categoryError");
        });

        it("ACC-04: helper sits inside the Category section and never blocks the Specify gate", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const chunk = categorySectionBlock(source);
            const chipsIdx = chunk.indexOf('flexDirection: "row", flexWrap: "wrap"');
            const helperIdx = chunk.indexOf("HelperText");
            const specifyIdx = chunk.indexOf('label="Specify Category"');
            expect(chipsIdx).toBeGreaterThan(-1);
            expect(helperIdx).toBeGreaterThan(chipsIdx);
            // The helper row precedes the Specify Category input when it is rendered.
            expect(specifyIdx).toBeGreaterThan(helperIdx);
            // The Specify Category gate is untouched.
            expect(chunk).toContain("{isOthersCategory(selectedCategory) && (");
            expect(countOf(chunk, 'label="Specify Category"')).toBe(1);
        });

        it("ACC-05: one HelperText import token, no other import change", () => {
            const source = readRepo("app/edit-transaction.tsx");
            expect(source).toContain(
                'import { Appbar, TextInput, Button, SegmentedButtons, Text, Chip, IconButton, useTheme, Card, Portal, Modal, Dialog, Surface, HelperText } from "react-native-paper";'
            );
            expect(countOf(source, 'from "react-native-paper";')).toBe(1);
            expect(countOf(source, 'from "react-native";')).toBe(1);
            expect(source).toContain('import { authFetch } from "../utils/apiClient";');
        });

        it("ACC-06: SPEC-105 handleSave guards are byte-identical", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const anchor = source.indexOf("const handleSave = async ()");
            expect(anchor).toBeGreaterThan(-1);
            const block = source.slice(anchor, source.indexOf("const handleResultOk", anchor));
            const guards = [
                'Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.")',
                'Alert.alert("Invalid Amount", "Amount must not exceed 10,000,000.")',
                'Alert.alert("Transaction Not Found", "This transaction no longer exists.")',
                'Alert.alert("Invalid Category", "Please select a category.")',
                'Alert.alert("Invalid Payment Source", "Please select a payment source.")',
                'Alert.alert("Invalid Category", "Please specify a category.")',
            ];
            let cursor = -1;
            for (const guard of guards) {
                const idx = block.indexOf(guard);
                expect(idx).toBeGreaterThan(-1);
                expect(idx).toBeGreaterThan(cursor);
                cursor = idx;
            }
            expect(block).toContain("await updateTransaction(id, {");
            expect(block).not.toContain("if (!selectedCategory || !id) return;");
        });

        it("ACC-07: the category copy appears exactly twice — inline hint + guard", () => {
            const source = readRepo("app/edit-transaction.tsx");
            expect(countOf(source, "Please select a category.")).toBe(2);
        });

        it("ACC-08: SPEC-105 ACC-07 re-pin actually shipped, SPEC-85/80 pins intact", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const pin = readRepo("utils/editTransactionRequiredFields.test.ts");
            expect(countOf(source, "<HelperText")).toBe(1);
            expect(pin).toContain('expect(countOf(source, "<HelperText")).toBe(1);');
            expect(pin).not.toContain('expect(source).not.toContain("HelperText");');
            // SPEC-85 ACC-05 pins untouched — now per-line, since the centering work moved
            // `styles.dialog` out of the inline form SPEC-85 originally pinned.
            const feedback = readRepo("utils/mutationFeedback.test.ts");
            expect(feedback).toContain('expect(source).toContain("maxWidth: 480,");');
            expect(feedback).toContain('Alert.alert("Invalid Category"');
            // SPEC-80 ACC-01 copy pins untouched.
            const rename = readRepo("utils/paySourceRename.test.ts");
            expect(rename).toContain(">Payment Source</Text>");
            expect(source).toContain(">Payment Source</Text>");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
