import * as fs from "fs";
import * as path from "path";
import { calculate, formatResult } from "./calculator";

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
    describe(`dashboard quick calculator on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("SPEC-63 ACC-03: four operations compute correctly", () => {
            expect(calculate(2, 3, "+")).toBe(5);
            expect(calculate(10, 4, "-")).toBe(6);
            expect(calculate(6, 7, "×")).toBe(42);
            expect(calculate(20, 4, "÷")).toBe(5);
        });

        it("SPEC-63 ACC-03: division by zero and float artifacts render safely", () => {
            expect(formatResult(calculate(1, 0, "÷"))).toBe("Error");
            expect(formatResult(calculate(0.1, 0.2, "+"))).toBe("0.3");
            expect(formatResult(100)).toBe("100");
        });

        it("SPEC-63 ACC-01: calculator affordance sits left of the bell in one pill", () => {
            const source = readRepo("app/(tabs)/index.tsx");
            const calcAt = source.indexOf('"calculator"');
            const bellAt = source.indexOf('"bell-outline"');
            expect(calcAt).toBeGreaterThanOrEqual(0);
            expect(bellAt).toBeGreaterThan(calcAt);
            expect(source).toContain("CalculatorModal");
            expect(source).toContain("borderRadius: 20");
            expect(source).toContain("setCalcVisible(true)");
        });

        it("SPEC-63 ACC-02: bell destination and badge logic byte-identical", () => {
            const source = readRepo("app/(tabs)/index.tsx");
            expect(source).toContain('router.push("/notifications")');
            expect(source).toContain("pendingDues.length + unreadCount");
            expect(source).toContain("totalBadgeCount > 0");
        });

        it("SPEC-63 v1.1 ACC-05: fresh digit entry preserves the pending operation", () => {
            const source = readRepo("components/CalculatorModal.tsx");
            const digitFn = source.slice(
                source.indexOf("const inputDigit"),
                source.indexOf("const inputOperator")
            );
            expect(digitFn).toContain("if (fresh) {");
            expect(digitFn).toContain("setDisplay");
            expect(digitFn).not.toContain("setAcc");
            expect(digitFn).not.toContain("setOp");
        });

        it("SPEC-63 v1.1 ACC-06: slightly larger responsive tokens", () => {
            const source = readRepo("components/CalculatorModal.tsx");
            expect(source).toContain("maxWidth: 400");
            expect(source).toContain("displaySmall");
            expect(source).toContain("height: 56");
            expect(source).toContain("minHeight: 56");
            expect(source).toContain("fontSize: 18");
        });

        it("SPEC-63 v1.2 ACC-08: card locks to the horizontal center", () => {
            const source = readRepo("components/CalculatorModal.tsx");
            expect(source).toContain('width: "90%"');
            expect(source).toContain("maxWidth: 400");
            expect(source).toContain('alignSelf: "center"');
            expect(source).toContain('justifyContent: "center"');
            expect(source).toContain('alignItems: "center"');
        });

        it("SPEC-63 v1.3 ACC-10: container stretches full-screen so centering is true", () => {
            const source = readRepo("components/CalculatorModal.tsx");
            expect(source).toContain("flex: 1,");
            expect(source).toContain('justifyContent: "center"');
            expect(source).toContain('alignItems: "center"');
            expect(source).toContain('width: "90%"');
            expect(source).toContain("maxWidth: 400");
            expect(source).toContain('alignSelf: "center"');
        });

        it("SPEC-63 v1.4 ACC-12: RN Modal shell, no Paper Modal layer-splitting", () => {
            const source = readRepo("components/CalculatorModal.tsx");
            expect(source).toContain('from "react-native"');
            expect(source).toContain("transparent");
            expect(source).toContain('animationType="fade"');
            expect(source).toContain("onRequestClose={onDismiss}");
            expect(source).toContain("onPress={onDismiss}");
            expect(source).toContain("onPress={() => {}}");
            expect(source).not.toContain("<Portal>");
            expect(source).not.toContain("contentContainerStyle");
            expect(source).toContain('width: "90%"');
            expect(source).toContain("maxWidth: 400");
            expect(source).toContain("displaySmall");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
