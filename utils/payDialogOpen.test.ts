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

function openPayBlock(source: string): string {
    const start = source.indexOf("const openPayDialog");
    if (start === -1) return "";
    const end = source.indexOf("const recordTransaction", start);
    return source.slice(start, end === -1 ? start + 2000 : end);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`pay dialog single open on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-69 ACC-01: fetch resolves before first setPayTarget", () => {
            const source = readRepo("app/dues.tsx");
            const block = openPayBlock(source);
            const fetchIdx = block.indexOf("authFetch");
            const openIdx = block.indexOf("setPayTarget(due)");
            expect(fetchIdx).toBeGreaterThan(-1);
            expect(openIdx).toBeGreaterThan(fetchIdx);
        });

        it("SPEC-69 ACC-02: dedicated payOpening guard on row Pay", () => {
            const source = readRepo("app/dues.tsx");
            expect(source).toContain("const [payOpening, setPayOpening] = useState(false)");
            const block = openPayBlock(source);
            expect(block).toContain("if (payOpening) return");
            expect(block).toContain("setPayOpening(true)");
            expect(block).toContain("setPayOpening(false)");
            expect(source).toContain("disabled={payBusy || payOpening}");
        });

        it("SPEC-69 ACC-03/10: one centered RN shell per Scheduled dialog", () => {
            const source = readRepo("app/dues.tsx");
            const payCount = (source.match(/visible=\{!!payTarget\}/g) || []).length;
            expect(payCount).toBe(1);
            expect(source).toContain("<NativeModal visible={!!payTarget}");
            expect(source).not.toContain("<Dialog visible={!!payTarget}");
            expect(source).toContain("alertDialog.visible");
            expect(source).toMatch(/<NativeModal\s+visible=\{alertDialog\.visible\}/);
            expect(source).toContain('justifyContent: "center", alignItems: "center", padding: 20');
            expect(source).toContain('maxWidth: 480');
            expect(source).toContain('width: "90%"');
        });

        it("SPEC-69 ACC-04: fallback + Pay outlined retained", () => {
            const source = readRepo("app/dues.tsx");
            const block = openPayBlock(source);
            expect(block).toContain("FALLBACK_PAY_METHODS");
            expect(block).toContain("setPayMethod(data[0].name)");
            const payBlock = source.slice(
                Math.max(0, source.indexOf("openPayDialog(due)") - 400),
                source.indexOf("openPayDialog(due)") + 300
            );
            expect(payBlock).toContain("mode=\"outlined\"");
            expect(payBlock).toContain("borderRadius: 12");
        });

        it("SPEC-69 ACC-06..08: Pay/Receive modal presentation is structured and accessible", () => {
            const source = readRepo("app/dues.tsx");
            const payStart = source.indexOf("<NativeModal visible={!!payTarget}");
            const payEnd = source.indexOf("</NativeModal>", payStart);
            const payModal = source.slice(payStart, payEnd);
            expect(source).toContain("fontSize: 20");
            expect(source).toContain("formatAmount(payTarget.amount)");
            expect(source).toContain("style={[styles.amountSummary, { backgroundColor: theme.colors.primary }]}");
            expect(source).toContain('color: theme.colors.onPrimary, fontWeight: "600"');
            expect(source).toContain('color: theme.colors.onPrimary, fontWeight: "700"');
            expect(payModal).toContain("styles.dialog");
            expect(payModal).toContain("styles.payDialog");
            expect(payModal).toContain("theme.colors.surface");
            expect(source).toContain("padding: 24");
            expect(source).toContain("borderRadius: 20");
            expect(source).toContain("elevation: 3");
            expect(source).toContain('flexDirection: "row"');
            expect(source).toContain('flexWrap: "wrap"');
            expect(source).toContain("gap: 10");
            expect(source).toContain('justifyContent: "space-between"');
            expect(source).toContain('flexBasis: "47%"');
            expect(source).toContain("height: 56");
            expect(source).toContain('name="check-circle"');
            expect(source).toContain("accessibilityState={{ selected: isSelected }}");
            expect(source).toContain('justifyContent: "flex-end", gap: 12');
            expect(source).toContain("maxWidth: 480");
            expect(source).toContain('width: "90%"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
