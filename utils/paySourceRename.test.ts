import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

function runSuite(os: "android" | "ios" | "web") {
    describe(`payment source options v1.1 on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: new copy at all 7 sites, old UI literals gone", () => {
            const edit = readRepo("app/edit-transaction.tsx");
            expect(edit).toContain(">Payment Source</Text>");
            expect(edit).not.toContain(">Payment Method</Text>");

            const methods = readRepo("app/payment-methods.tsx");
            expect(methods).toContain('title="Payment Sources"');
            expect(methods).toContain(">Add Payment Source</Text>");
            expect(methods).toContain('delete the payment source "');
            expect(methods).not.toContain("Payment Methods");
            expect(methods).not.toContain("Add Payment Method");
            expect(methods).not.toContain("payment method");

            const details = readRepo("app/transaction-details.tsx");
            expect(details).toContain("PAYMENT SOURCE / ACCOUNT");
            expect(details).not.toContain("PAYMENT METHOD");

            const guide = readRepo("app/(tabs)/learning-detail.tsx");
            expect(guide).toContain("payment source.");
            expect(guide).not.toContain("payment method");

            const chart = readRepo("components/PaymentMethodChart.tsx");
            expect(chart).toContain(">Payment Sources</Text>");
            expect(chart).not.toContain("Payment Methods");
        });

        it("ACC-01: identifiers, API, routes, and filenames untouched", () => {
            const edit = readRepo("app/edit-transaction.tsx");
            expect(edit).toContain("PaymentMethod");
            const dues = readRepo("app/dues.tsx");
            expect(dues).toContain("paymentMethod: method");
            expect(dues).not.toContain('"paymentMethods"');
            expect(dues).not.toContain("PaymentMethodInfo");
            readRepo("app/payment-methods.tsx");
            readRepo("components/PaymentMethodChart.tsx");
        });

        it("ACC-04: static five-option set rendered by the sheet", () => {
            const dues = readRepo("app/dues.tsx");
            expect(dues).toContain("PAY_SOURCE_OPTIONS");
            for (const label of ['name: "Cash"', 'name: "Card"', 'name: "Bank"', 'name: "E-Wallet"', 'name: "Other"']) {
                expect(dues).toContain(label);
            }
            expect(dues).toContain("PAY_SOURCE_OPTIONS.map((m) => {");
            expect(dues).toContain('useState("Cash")');
        });

        it("ACC-05: fetch, fallback, and orphans gone; opener synchronous", () => {
            const dues = readRepo("app/dues.tsx");
            expect(dues).toContain("openPayDialog = useCallback((due: Due)");
            expect(dues).toContain("setPayTarget(due);");
            expect(dues).not.toContain("authFetch");
            expect(dues).not.toContain("FALLBACK_PAY_METHODS");
            expect(dues).not.toContain("payMethods");
            expect(dues).not.toContain('"../utils/apiClient"');
        });

        it("ACC-06 (v1.2): sheet subtitle shows Amount copy, old echo gone", () => {
            const dues = readRepo("app/dues.tsx");
            expect(dues).toContain("`Amount: ${formatAmount(payTarget.amount)}`");
            expect(dues).not.toContain("(${formatAmount(payTarget.amount)})");
            expect(dues).toContain('Pay "${payTarget?.title}"?');
        });

        it("ACC-03: pay flow and behavior lines intact", () => {
            const dues = readRepo("app/dues.tsx");
            expect(dues).toContain("recordTransaction(due, method)");
            expect(dues).toContain("disabled={!payTarget || payBusy}");
            expect(dues).toContain("openPayDialog = useCallback");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
