import * as fs from "fs";
import * as path from "path";
import { formatMethodLabel } from "./formatMethod";

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
    describe(`transaction details polish on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-64 ACC-01: content column capped and centered, appbar untouched", () => {
            const source = readRepo("app/transaction-details.tsx");
            expect(source).toContain("maxWidth: 600");
            expect(source).toContain("alignSelf: \"center\"");
            expect(source).toContain("width: \"100%\"");
            expect(source).toContain("Appbar.Header");
            expect(source).toContain("Transaction Details");
        });

        it("SPEC-64 ACC-02: hero elevation + larger icon, mapping and colors retained", () => {
            const source = readRepo("app/transaction-details.tsx");
            expect(source).toContain("elevation: 2");
            expect(source).toContain("size={40}");
            expect(source).toContain("width: 80");
            expect(source).toContain("renderCategoryIcon");
            expect(source).toContain("#16A34A");
            expect(source).toContain("#DC2626");
            expect(source).toContain("padding: 24");
        });

        it("SPEC-64 ACC-03: tidy rows, last row divider-free", () => {
            const source = readRepo("app/transaction-details.tsx");
            expect(source).toContain("textAlign: \"right\"");
            expect(source).toContain("flexShrink: 1");
            expect(source).toContain("lastDetailRow");
            expect(source).toContain("borderBottomWidth: 0");
        });

        it("SPEC-64 ACC-04: method values title-formatted with Cash fallback", () => {
            expect(formatMethodLabel("bank_transfer")).toBe("Bank Transfer");
            expect(formatMethodLabel("cash")).toBe("Cash");
            expect(formatMethodLabel("  ")).toBe("");
            expect(formatMethodLabel("e_wallet")).toBe("E Wallet");
            const source = readRepo("app/transaction-details.tsx");
            expect(source).toContain("formatMethodLabel(transaction.paymentMethod)");
            expect(source).toContain(": \"Cash\"");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
