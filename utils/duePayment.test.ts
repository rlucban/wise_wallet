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

function count(src: string, re: RegExp): number {
    return (src.match(re) || []).length;
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`due payment method on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01a: recordTransaction passes the chosen method into addTransaction", () => {
            const src = readRepo("app/dues.tsx");
            expect(count(src, /paymentMethod: method,/g)).toBe(1);
        });

        it("ACC-01b: dialog Confirm calls recordTransaction with the due and method", () => {
            const src = readRepo("app/dues.tsx");
            expect(count(src, /recordTransaction\(due, method\)/g)).toBe(1);
        });

        it("ACC-01c: Pay button opens the picker (old direct call gone)", () => {
            const src = readRepo("app/dues.tsx");
            expect(src).toContain("onPress={() => openPayDialog(due)}");
            expect(src).not.toContain("onPress={() => recordTransaction(due)}");
        });

        it("ACC-02a: hardcoded fallback carries Cash and the Unknown sentinel", () => {
            const src = readRepo("app/dues.tsx");
            expect(src).toContain('name: "Cash"');
            expect(src).toContain('name: "Unknown"');
        });

        it("ACC-02b: API list preferred when reachable, fallback on empty/failure", () => {
            const src = readRepo("app/dues.tsx");
            expect(src).toContain('authFetch<PaymentMethodInfo[]>("paymentMethods")');
            expect(count(src, /setPayMethods\(FALLBACK_PAY_METHODS\)/g)).toBe(2);
        });

        it("ACC-03a: add throws prefer the server message on HTTP failures (web + native)", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(count(src, /status !== 0 && error \? error : "Failed to save transaction\. Please check your connection\."/g)).toBe(2);
        });

        it("ACC-03b: update throws prefer the server message on HTTP failures (web + native)", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(count(src, /status !== 0 && error \? error : "Failed to save changes\. Please check your connection\."/g)).toBe(2);
        });

        it("ACC-04: dues dialog renders the surfaced message when present", () => {
            const src = readRepo("app/dues.tsx");
            expect(src).toContain("message: error instanceof Error && error.message ? error.message : \"Failed to record transaction.\"");
        });

        it("ACC-05: no paymentMethod field added to Due type/storage", () => {
            const typesSrc = readRepo("types/index.ts");
            const dueStart = typesSrc.indexOf("export interface Due ");
            expect(dueStart).toBeGreaterThan(-1);
            const nextIface = typesSrc.indexOf("export interface", dueStart + 1);
            const dueBlock = typesSrc.slice(dueStart, nextIface === -1 ? undefined : nextIface);
            expect(dueBlock).not.toContain("paymentMethod");
        });

        it("REG-01: add POST bodies still spread the full transaction (SPEC-46 intact)", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(count(src, /\{ \.\.\.uploaded, categoryId:/g)).toBe(2);
            expect(count(src, /userId: activeUserId/g)).toBe(4);
        });

        it("REG-02: recordTransaction keeps balance guard, completion, and success dialog", () => {
            const src = readRepo("app/dues.tsx");
            expect(src).toContain("Insufficient Balance");
            expect(src).toContain("await updateDue(item.id, { completed: true });");
            expect(src).toContain("Transaction Recorded");
        });

        it("REG-03: fail-closed order kept (complete only after successful write)", () => {
            const src = readRepo("app/dues.tsx");
            const writeAt = src.indexOf("await addTransaction({");
            const completeAt = src.indexOf("await updateDue(item.id, { completed: true });");
            expect(writeAt).toBeGreaterThan(-1);
            expect(completeAt).toBeGreaterThan(writeAt);
        });

        it("REG-04: autoProcess next-occurrence scheduling intact", () => {
            const src = readRepo("app/dues.tsx");
            expect(src).toContain('item.frequency !== "once"');
            expect(src).toContain("categoryId: item.categoryId,");
        });

        it("REG-05: online repull behavior intact (fetch/add/update/delete refresh)", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(count(src, /await refreshFromApi\(\);/g)).toBe(4);
        });

        it("REG-06: dues add/edit flows untouched", () => {
            const src = readRepo("app/dues.tsx");
            expect(src).toContain("await updateDue(editingDue.id, payload);");
            expect(src).toContain("Failed to save scheduled item.");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
