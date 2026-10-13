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

// SPEC-93 lesson: anchor on the opener, never slice from a bare `visible=` / `await`.
function validateBlock(source: string): string {
    const anchor = source.indexOf("const validate = ()");
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf("const clearError", anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

function handleSubmitBlock(source: string): string {
    const anchor = source.indexOf("const handleSubmit = async ()");
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf("const theme = useTheme", anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

// The two-level Payment Source chip UI.
function paySourceChunk(source: string): string {
    const anchor = source.indexOf(">Payment Source</Text>");
    expect(anchor).toBeGreaterThan(-1);
    const end = source.indexOf('label="Note (Optional)"', anchor);
    expect(end).toBeGreaterThan(anchor);
    return source.slice(anchor, end);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`addTransactionRequiredSource on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: paymentMethod is nullable with a null seed", () => {
            const source = readRepo("app/add-transaction.tsx");
            expect(source).toContain("useState<PaymentMethod | null>(null)");
            expect(source).not.toContain('useState<PaymentMethod>("cash")');
        });

        it("ACC-02: the fetch no longer auto-selects a source", () => {
            const source = readRepo("app/add-transaction.tsx");
            const anchor = source.indexOf("const fetchPaymentMethods = async ()");
            expect(anchor).toBeGreaterThan(-1);
            const block = source.slice(anchor, source.indexOf("const pickImage", anchor));
            expect(block).toContain("await authFetch<PaymentMethodInfo[]>(`paymentMethods`);");
            expect(block).toContain("if (ok && data && Array.isArray(data)) {");
            expect(block).toContain("setAvailablePaymentMethods(data);");
            expect(block).not.toContain("setPaymentMethod(data[0].name)");
            expect(countOf(block, "setPaymentMethod")).toBe(0);
        });

        it("ACC-03: selectedMethodType nullable, both call sites null-safe", () => {
            const source = readRepo("app/add-transaction.tsx");
            expect(source).toContain('useState<string | null>(null)');
            expect(source).not.toContain('useState<string>("cash")');
            const chunk = paySourceChunk(source);
            expect(chunk).toContain(
                "const isSelected = selectedMethodType !== null && selectedMethodType.toLowerCase() === t.toLowerCase();"
            );
            expect(chunk).toContain(
                '{selectedMethodType !== null && selectedMethodType.toLowerCase() !== "cash" && ('
            );
            // The method-chip compare is null-safe too (TS18047 class, user-run 2026-10-13).
            expect(chunk).toContain(
                "const isMethodSelected = paymentMethod !== null && paymentMethod.toLowerCase() === method.name.toLowerCase();"
            );
            expect(chunk).toContain("onPress={() => setPaymentMethod(method.name)}");
        });

        it("ACC-04: every type tap yields a source, synthetic labels shared", () => {
            const source = readRepo("app/add-transaction.tsx");
            const chunk = paySourceChunk(source);
            expect(chunk).toContain('const firstOfType = availablePaymentMethods.find(m => m.type.toLowerCase() === t.toLowerCase());');
            expect(chunk).toContain(
                'setPaymentMethod(firstOfType ? firstOfType.name : (PAYMENT_TYPE_LABELS[t] ?? t));'
            );
            expect(chunk).not.toContain("const firstOfColor");
            expect(chunk).not.toContain('else if (t === "cash")');
            expect(source).toContain("const PAYMENT_TYPE_LABELS: Record<string, string> = {");
            for (const label of ["cash: \"Cash\"", "card: \"Card\"", "bank: \"Bank\"", "e_wallet: \"E-Wallet\"", "other: \"Other\""]) {
                expect(source).toContain(label);
            }
        });

        it("ACC-05: handler guard blocks a null source with its own dialog", () => {
            const source = readRepo("app/add-transaction.tsx");
            const block = handleSubmitBlock(source);
            expect(block).toContain('title: "Invalid Payment Source",');
            expect(block).toContain('message: "Please select a payment source.",');
            // The guard comes after the validation branch and before the balance check.
            const validationIdx = block.indexOf("const firstError = validate();");
            const guardOpen = block.indexOf("if (!paymentMethod) {");
            const balanceIdx = block.indexOf("// Balance validation for expense transactions");
            expect(validationIdx).toBeGreaterThan(-1);
            expect(guardOpen).toBeGreaterThan(validationIdx);
            expect(balanceIdx).toBeGreaterThan(guardOpen);
            // validate() owns only the three original fields.
            const v = validateBlock(source);
            expect(v).not.toContain("paymentSource");
            expect(v).not.toContain("next.paymentMethod");
        });

        it("ACC-06: payload carries the narrowed paymentMethod, never empty", () => {
            const source = readRepo("app/add-transaction.tsx");
            const block = handleSubmitBlock(source);
            const payloadStart = block.indexOf("await addTransaction({");
            expect(payloadStart).toBeGreaterThan(-1);
            const payload = block.slice(payloadStart, block.indexOf("});", payloadStart));
            const lines = payload.split("\n").map((l) => l.trim());
            expect(lines).toContain("paymentMethod,");
            // Scoped to the paymentMethod line: `category: category ?? undefined` and
            // `receiptUrl: receiptImage || undefined` are pre-existing and legitimate.
            expect(payload).not.toContain("paymentMethod ?? undefined");
            expect(payload).not.toContain('paymentMethod || "cash"');
            expect(payload).not.toContain("paymentMethod!");
            expect(payload).not.toContain("as PaymentMethod");
            expect(payload).toContain("category:");
            expect(payload).toContain("note:");
        });

        it("ACC-07: validate returns the message; no msgs map, no same-tick errors read", () => {
            const source = readRepo("app/add-transaction.tsx");
            const v = validateBlock(source);
            expect(v).toContain("setErrors(next);");
            expect(v).toContain("return Object.values(next)[0] || null;");
            expect(v).not.toContain("Object.keys(next)");
            // The per-case copies survive.
            expect(v).toContain('next.category = "Please select a category.";');
            expect(v).toContain('next.category = "Please specify a category.";');
            const block = handleSubmitBlock(source);
            expect(block).toContain("const firstError = validate();");
            expect(block).toContain("message: firstError,");
            expect(block).not.toContain("const msgs");
            expect(block).not.toContain("errors[firstErrorKey]");
            // clearError and the inline HelperText row are untouched.
            expect(source).toContain("const clearError = (field: string) => {");
            expect(source).toContain('<HelperText type="error" visible={!!errors.category}');
        });

        it("ACC-08: no new import or dep; SPEC-45 ACC-04 pins hold", () => {
            const source = readRepo("app/add-transaction.tsx");
            expect(source).toContain("OPENING_BALANCE_CATEGORY_ID");
            expect(source).not.toContain('t.title !== "Opening Balance"');
            // No new import line was added: the react-native-paper and authFetch imports already existed.
            expect(countOf(source, 'from "react-native-paper";')).toBe(1);
            expect(countOf(source, 'from "../utils/apiClient";')).toBe(1);
            expect(countOf(source, 'from "expo-image";')).toBe(1);
        });

        it("ACC-09: the shared copies live on exactly two screens", () => {
            const addTx = readRepo("app/add-transaction.tsx");
            const edit = readRepo("app/edit-transaction.tsx");
            expect(countOf(addTx, "Please select a payment source.")).toBe(1);
            expect(countOf(addTx, "Invalid Payment Source")).toBe(1);
            expect(countOf(edit, "Please select a payment source.")).toBe(1);
            expect(countOf(edit, "Invalid Payment Source")).toBe(1);
            for (const file of [
                "app/add-due.tsx",
                "app/dues.tsx",
                "app/savings.tsx",
                "app/archived-allocations.tsx",
                "app/(tabs)/settings.tsx",
                "app/transaction-details.tsx",
                "app/payment-methods.tsx",
                "app/calendar.tsx",
            ]) {
                const other = readRepo(file);
                expect(other).not.toContain("Invalid Payment Source");
                expect(other).not.toContain("Please select a payment source.");
            }
            // SPEC-105 ACC-08 re-pin actually shipped.
            const pin = readRepo("utils/editTransactionRequiredFields.test.ts");
            expect(pin).toContain("new copies live in exactly two screens");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
