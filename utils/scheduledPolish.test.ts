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

function blockAround(source: string, anchor: string, radius = 600): string {
    const idx = source.indexOf(anchor);
    if (idx === -1) return "";
    return source.slice(Math.max(0, idx - radius), idx + anchor.length + radius);
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`scheduled M3 polish on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-68 ACC-01: filter SegmentedButtons rounded", () => {
            const source = readRepo("app/dues.tsx");
            const block = blockAround(source, "value={filter}", 350);
            expect(block).toContain("borderRadius: 16");
            expect(source).toContain("{ value: \"week\", label: \"This Week\" }");
            expect(source).toContain("{ value: \"month\", label: \"This Month\" }");
        });

        it("SPEC-68 ACC-02: total card sleek primary, no reddish block", () => {
            const source = readRepo("app/dues.tsx");
            const block = blockAround(source, "{filter === \"week\" ? \"Week\" : \"Month\"} Total", 350);
            expect(block).toContain("primaryContainer");
            expect(block).toContain("onPrimaryContainer");
            expect(block).toContain("borderRadius: 16");
            expect(block).toContain("padding: 16");
            expect(block).toContain("elevation: 1");
            expect(block).not.toContain("errorContainer");
        });

        it("SPEC-68 ACC-03: upcoming cards elevated, Pay outlined + rounded, icon buttons retained", () => {
            const source = readRepo("app/dues.tsx");
            expect(source).toContain("marginBottom: 12, borderRadius: 16, elevation: 1");
            const payBlock = blockAround(source, "openPayDialog(due)", 400);
            expect(payBlock).toContain("mode=\"outlined\"");
            expect(payBlock).toContain("borderRadius: 12");
            expect(payBlock).not.toContain("mode=\"contained\"");
            expect(source).toContain("pencil-outline");
            expect(source).toContain("icon=\"delete\"");
        });

        it("SPEC-68 ACC-04: pill badges with status colors retained", () => {
            const source = readRepo("app/dues.tsx");
            expect(source).toContain("OVERDUE");
            expect(source).toContain("RECEIVABLE");
            expect(source).toContain("AUTO-RENEW");
            expect(source).toContain("theme.colors.errorContainer");
            expect(source).toContain("theme.colors.primaryContainer");
            expect(source).toContain("theme.colors.surfaceVariant");
            const overdue = blockAround(source, "OVERDUE", 400);
            expect(overdue).toContain("borderRadius: 12");
            expect(overdue).toContain("paddingHorizontal: 8");
            expect(overdue).toContain("paddingVertical: 4");
            const auto = blockAround(source, "AUTO-RENEW", 400);
            expect(auto).toContain("borderRadius: 12");
        });

        it("SPEC-68 ACC-05: pay options check + rounded, dialog buttons retained", () => {
            const source = readRepo("app/dues.tsx");
            const payDialogStart = source.indexOf('<NativeModal visible={!!payTarget}');
            const payDialogEnd = source.indexOf("<NativeModal", payDialogStart + 1);
            const payDialog = source.slice(payDialogStart, payDialogEnd);
            expect(payDialog).toContain("accessibilityState={{ selected: isSelected }}");
            expect(payDialog).toContain('name="check-circle"');
            expect(payDialog).toContain("backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surface");
            expect(payDialog).toContain("borderColor: isSelected ? theme.colors.primary : theme.colors.outline");
            expect(blockAround(source, "paymentMethodOption: {", 180)).toContain("borderRadius: 12");
            expect(payDialog).toContain("fontSize: 20");
            expect(payDialog).toContain('fontWeight: "700"');
            expect(payDialog).toContain('textAlign: "center"');
            expect(payDialog).toContain('mode="text"');
            expect(payDialog).toContain('mode="contained"');
            expect(payDialog).toContain("disabled={!payTarget || payBusy}");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
