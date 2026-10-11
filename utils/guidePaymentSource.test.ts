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

const GUIDE = "utils/learningGuideContent.ts";

const NEW_STRINGS = [
    "2. Select a category, payment source, and date; add an establishment and note for context.",
    "Managing Categories and Payment Sources:",
    "2. Payment Sources store the ways you pay, such as cash, cards, and e-wallets.",
    "3. Every transaction requires a category and a payment source, so keep both up to date.",
    "Setting Up Categories and Payment Sources:",
    "1. Cash is created as your first payment source; add cards and e-wallets in Settings.",
    "2. Choose a category, payment source, and date, then save to update your balance.",
    "1. Each due has a title, amount, category, payment source, and start date.",
    "1. Tap the + button and enter the amount, category, and payment source.",
    "2. Confirm the payment source when prompted; the transaction keeps the due's category.",
];

function runSuite(os: "android" | "ios" | "web") {
    describe(`guide payment source copy on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: new copy verbatim, old copy gone", () => {
            const guide = readRepo(GUIDE);
            for (const s of NEW_STRINGS) {
                expect(guide).toContain(s);
            }
            expect(guide).not.toContain("payment method");
            expect(guide).not.toContain("Payment Method");
        });

        it("ACC-02: guard pins repointed, rest intact", () => {
            const rename = readRepo("utils/paySourceRename.test.ts");
            expect(rename).toContain('readRepo("utils/learningGuideContent.ts")');
            expect(rename).not.toContain('readRepo("app/(tabs)/learning-detail.tsx")');
            expect(rename).toContain(">Payment Source</Text>");
            expect(rename).toContain("PAYMENT SOURCE / ACCOUNT");
            const headings = readRepo("utils/learningGuideContent.test.ts");
            expect(headings).toContain('"Managing Categories and Payment Sources",');
            expect(headings).not.toContain('"Managing Categories and Payment Methods",');
        });

        it("ACC-03: scope intact, identifiers untouched", () => {
            const guide = readRepo(GUIDE);
            expect(guide).toContain("export const APP_GUIDE_CONTENT");
            expect(guide).toContain("export const APP_GUIDE_GETTING_STARTED_CONTENT");
            expect(guide).toContain("export const APP_GUIDE_SCHEDULED_DUES_CONTENT");
            expect(guide).toContain("export const APP_GUIDE_ALLOCATIONS_CONTENT");
            expect(guide).toContain("export const APP_GUIDE_REPORTS_CONTENT");
            expect(guide).not.toContain("paymentMethod");
            expect(guide).not.toContain("PaymentMethod");
            const detail = readRepo("app/(tabs)/learning-detail.tsx");
            expect(detail).toContain("content: APP_GUIDE_CONTENT");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
