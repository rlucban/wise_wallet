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

const SCREEN = "app/transaction-details.tsx";

function headerBlockOf(source: string): string {
    const anchor = source.indexOf("<Appbar.Header");
    if (anchor < 0) throw new Error("details header missing");
    return source.slice(anchor, source.indexOf("</Appbar.Header>", anchor));
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`transaction details header size on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: plain-string title, no custom title element", () => {
            const block = headerBlockOf(readRepo(SCREEN));
            expect(block).toContain('<Appbar.Content title="Transaction Details"');
            expect(block).not.toContain("numberOfLines={1}");
            expect(block).not.toContain('fontWeight: "700", color: theme.colors.onSurface');
        });

        it("ACC-02: header chrome and body intact, no size literal", () => {
            const source = readRepo(SCREEN);
            const block = headerBlockOf(source);
            expect(block).toContain("Appbar.BackAction");
            expect(block).toContain("safeGoBack(router)");
            expect(block).toContain("edit-transaction?id=");
            expect(block).toContain("setDeleteDialogVisible(true)");
            expect(block).toContain("justifyContent: \"space-between\"");
            // No size literal in the header (the stylesheet keeps its own
            // pre-existing fontSize values — out of scope, untouched).
            expect(block).not.toContain("fontSize");
            expect(source).toContain("variant=\"displayLarge\"");
            expect(source).toContain("Transaction not found");
        });

        it("ACC-03: scope confined", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain('import { Appbar, Text, Card, Dialog, Button, useTheme } from "react-native-paper";');
            expect(source).toContain('<Appbar.Content title="Transaction Details"');
            const peers = readRepo("app/dues.tsx");
            expect(peers).toContain('<Appbar.Content title="Scheduled"');
            const history = readRepo("app/transactions.tsx");
            expect(history).toContain('<Appbar.Content title="Transaction History"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
