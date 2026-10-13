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

// Anchor on the caller, never on a bare `await` (SPEC-93 lesson: slice from the opener).
function paymentSourceMemoBlock(source: string): string {
    const anchor = source.indexOf("const paymentSourceOptions");
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf("const handleSave", anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

// The rendered Payment Source chip row.
function paymentSourceRowBlock(source: string): string {
    const anchor = source.indexOf(">Payment Source</Text>");
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf('label="Note (Optional)"', anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

function handleSaveBlock(source: string): string {
    const anchor = source.indexOf("const handleSave = async ()");
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf("const handleResultOk", anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`editTransactionRequiredFields on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: payment sources fetched from the API with the Add-Transaction posture", () => {
            const source = readRepo("app/edit-transaction.tsx");
            expect(source).toContain("const { ok, data } = await authFetch<PaymentMethodInfo[]>(`paymentMethods`);");
            expect(source).toContain("if (ok && data && Array.isArray(data)) {");
            expect(source).toContain("setAvailablePaymentMethods(data);");
            expect(source).toContain('console.error("Error fetching payment methods:", error);');
            // The fetch runs on mount beside the category fetch, not in a second effect.
            const effectIdx = source.indexOf("useEffect(() => {");
            const catsIdx = source.indexOf("fetchCategories();");
            const sourcesIdx = source.indexOf("fetchPaymentMethods();");
            expect(catsIdx).toBeGreaterThan(effectIdx);
            expect(sourcesIdx).toBeGreaterThan(catsIdx);
            expect(countOf(source, "useEffect(() => {")).toBe(2);
        });

        it("ACC-02: paymentMethod is nullable and seeded null-or-value", () => {
            const source = readRepo("app/edit-transaction.tsx");
            expect(source).toContain("useState<PaymentMethod | null>(null)");
            expect(source).toContain("setPaymentMethod(tx.paymentMethod || null);");
            expect(source).not.toContain('useState<PaymentMethod>("cash")');
            expect(source).not.toContain('tx.paymentMethod || "cash"');
        });

        it("ACC-03: case-insensitive matching, chips only set a value (no deselect path)", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const row = paymentSourceRowBlock(source);
            expect(row).toContain("{paymentSourceOptions.map((method) => {");
            expect(row).toContain(
                "const isSelected = paymentMethod !== null && paymentMethod.toLowerCase() === method.label.toLowerCase();"
            );
            expect(row).toContain("selected={isSelected}");
            expect(row).toContain("onPress={() => setPaymentMethod(method.label)}");
            expect(row).not.toContain("setPaymentMethod(null)");
            expect(row).not.toContain('setPaymentMethod("")');
            expect(source).not.toContain("setPaymentMethod(null)");
        });

        it("ACC-04: fetched list, hardcoded five kept as fallback, echo chip for unmatched value", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const block = paymentSourceMemoBlock(source);
            expect(block).toContain("useMemo<PaymentSourceOption[]>");
            expect(block).toContain("const base: PaymentSourceOption[] = availablePaymentMethods.length > 0");
            expect(block).toContain("? availablePaymentMethods.map((m) => ({ key: m.id, label: m.name, icon: m.icon || \"wallet\" }))");
            expect(block).toContain(": PAYMENT_METHODS.map((m) => ({ key: m.value, label: m.label, icon: m.icon }))");
            expect(block).toContain(
                "if (current && !base.some((m) => m.label.toLowerCase() === current.toLowerCase())) {"
            );
            expect(block).toContain("base.push({ key: `current-${current}`, label: current, icon: \"wallet\" });");
            expect(block).toContain("}, [availablePaymentMethods, paymentMethod]);");
            // The hardcoded five survive as the offline fallback.
            expect(source).toContain("const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [");
        });

        it("ACC-05: six ordered guards, none silent, no folded !id", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const block = handleSaveBlock(source);
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
            expect(source).not.toContain("if (!selectedCategory || !id) return;");
            // updateTransaction only runs after the last guard closes.
            const updateIdx = block.indexOf("await updateTransaction(id, {");
            expect(updateIdx).toBeGreaterThan(
                block.indexOf('Alert.alert("Invalid Payment Source"')
            );
            expect(updateIdx).toBeGreaterThan(block.indexOf('Alert.alert("Invalid Category", "Please specify a category.")'));
        });

        it("ACC-06: payload sends the narrowed paymentMethod with no fallback", () => {
            const source = readRepo("app/edit-transaction.tsx");
            const block = handleSaveBlock(source);
            const payloadStart = block.indexOf("await updateTransaction(id, {");
            expect(payloadStart).toBeGreaterThan(-1);
            const payload = block.slice(payloadStart, block.indexOf("});", payloadStart));
            const payloadLines = payload.split("\n").map((l) => l.trim());
            // Bare identifier on its own line — the narrowing proof.
            expect(payloadLines).toContain("paymentMethod,");
            expect(payload).not.toContain('|| "cash"');
            expect(payload).not.toContain("paymentMethod!");
            expect(payload).not.toContain("as PaymentMethod");
            expect(payload).toContain("category,");
            expect(payload).toContain("note,");
        });

        it("ACC-07: imports minimal; SPEC-85 ACC-05 and SPEC-80 ACC-01 pins hold", () => {
            const source = readRepo("app/edit-transaction.tsx");
            expect(source).toContain('import { TransactionType, PaymentMethod, PaymentMethodInfo, Category } from "../types";');
            expect(source).toContain('import { authFetch } from "../utils/apiClient";');
            // SPEC-106/107 amendment 2026-10-13: the `HelperText`-free pin was SPEC-105's
            // own (its feedback was Alert.alert only). SPEC-107 legitimately adds one
            // HelperText for the Category row, so the intent ("no helper row for any
            // other field") is pinned as exactly-one occurrence instead.
            // The SPEC-85 ACC-05 pins below are unchanged: they target the dialog
            // style + the Alert.alert strings, not HelperText.
            expect(countOf(source, "<HelperText")).toBe(1);
            expect(source).toContain('HelperText type="error" visible={!selectedCategory}');
            // SPEC-85 ACC-05 (utils/mutationFeedback.test.ts:37-48) re-asserted.
            // This screen renders `styles.dialog` one key per line, so the pins are per-line here.
            expect(source).toContain("maxWidth: 480,");
            expect(source).toContain('width: "90%",');
            expect(source).toContain('alignSelf: "center",');
            expect(source).toContain("marginHorizontal: 0,");
            expect(source).toContain('resultDialog.ok ? "check-circle-outline" :');
            expect(source).toContain('"Saved Successfully"');
            expect(source).toContain('"Save Failed"');
            expect(source).toContain("Your changes have been saved.");
            expect(source).toContain('Alert.alert("Invalid Amount"');
            expect(source).toContain('Alert.alert("Invalid Category"');
            expect(source).not.toContain("showToast");
            expect(source).not.toContain("ToastContext");
            // SPEC-80 ACC-01 (utils/paySourceRename.test.ts:24-53) re-asserted.
            expect(source).toContain(">Payment Source</Text>");
            expect(source).not.toContain(">Payment Method</Text>");
            expect(source).toContain("PaymentMethod");
        });

        it("ACC-08: new copies live in exactly two screens; scope files untouched", () => {
            // SPEC-106 (2026-10-13) ships the same copies on Add Transaction, so the
            // one-screen pin was widened to two screens and nowhere else. Intent unchanged.
            const source = readRepo("app/edit-transaction.tsx");
            const addTx = readRepo("app/add-transaction.tsx");
            const types = readRepo("types/index.ts");
            expect(countOf(source, "Please select a payment source.")).toBe(1);
            expect(countOf(source, "Invalid Payment Source")).toBe(1);
            expect(countOf(addTx, "Please select a payment source.")).toBe(1);
            expect(countOf(addTx, "Invalid Payment Source")).toBe(1);
            // Every other screen in app/ keeps them out.
            for (const file of [
                "app/add-due.tsx",
                "app/dues.tsx",
                "app/savings.tsx",
                "app/archived-allocations.tsx",
                "app/(tabs)/settings.tsx",
                "app/transaction-details.tsx",
                "app/payment-methods.tsx",
            ]) {
                const other = readRepo(file);
                expect(other).not.toContain("Invalid Payment Source");
                expect(other).not.toContain("Please select a payment source.");
            }
            // The shared type + paymentMethod field are unchanged.
            expect(types).toContain("export type PaymentMethod = string;");
            expect(types).toContain("paymentMethod?: PaymentMethod;");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
