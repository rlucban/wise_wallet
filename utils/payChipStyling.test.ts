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

const SCREEN = "app/dues.tsx";

function paySheetBlock(source: string): string {
    const start = source.indexOf("visible={!!payTarget}");
    expect(start).toBeGreaterThan(-1);
    const open = source.lastIndexOf("<Modal", start);
    expect(open).toBeGreaterThan(-1);
    const end = source.indexOf("</Modal>", start);
    expect(end).toBeGreaterThan(start);
    return source.slice(open, end);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`pay bottom sheet v1.2 on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-07: wrapper-anchored sheet, 24/0 radii, pb-32, no pay Dialog", () => {
            const source = readRepo(SCREEN);
            const sheet = paySheetBlock(source);
            expect(sheet).toContain("<Modal");
            expect(sheet).toContain('style={{ justifyContent: "flex-end", marginTop: 0, marginBottom: 0 }}');
            expect(sheet).not.toContain("contentContainerStyle");
            expect(sheet).toContain("borderTopLeftRadius: 24");
            expect(sheet).toContain("borderTopRightRadius: 24");
            expect(sheet).toContain("borderBottomLeftRadius: 0");
            expect(sheet).toContain("borderBottomRightRadius: 0");
            expect(sheet).toContain("paddingBottom: 32");
            expect(sheet).toContain("width: 48");
            expect(sheet).toContain("theme.colors.outlineVariant");
            expect(sheet).toContain('icon="close"');
            expect(sheet).toContain("setPayTarget(null)");
            expect(sheet).not.toContain("<Dialog visible={!!payTarget}");
            expect(sheet).not.toContain("flexBasis");
            expect(sheet).not.toContain("Payment Method</Text>");
        });

        it("ACC-08: full-width theme cards, stacked buttons, zero literals", () => {
            const sheet = paySheetBlock(readRepo(SCREEN));
            expect(sheet).toContain("gap: 8");
            expect(sheet).toContain("borderRadius: 16");
            expect(sheet).toContain("padding: 16");
            expect(sheet).toContain("borderWidth: selected ? 2 : 1");
            expect(sheet).toContain("theme.colors.primary");
            expect(sheet).not.toContain("#");
            expect(sheet).not.toContain("icon={payMethod");
            expect(sheet).toContain('icon="close"');
            expect(sheet).toContain('mode="contained"');
            expect(sheet).toContain('mode="contained-tonal"');
            expect(sheet).toContain("alignSelf: \"stretch\"");
            expect(sheet).toContain("recordTransaction(due, method)");
            expect(sheet).toContain("disabled={!payTarget || payBusy}");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
