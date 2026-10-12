import * as fs from "fs";
import * as path from "path";
import { isGoalBelowInitial } from "./allocationGoal";

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
    describe(`editAllocationGoal on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: goal below balance is flagged; equal, above, and empty are not", () => {
            expect(isGoalBelowInitial("10", 80)).toBe(true);
            expect(isGoalBelowInitial("80", 80)).toBe(false);
            expect(isGoalBelowInitial("", 80)).toBe(false);
            expect(isGoalBelowInitial("100", 80)).toBe(false);
        });

        it("ACC-02: edit guard placement, copy, inline error, and disabled Save", () => {
            const source = readRepo("app/savings.tsx");
            const capIdx = source.indexOf("Goal amount must not exceed 10,000,000.");
            const lowIdx = source.indexOf('Alert.alert("Invalid Goal", "Goal amount is too low.")');
            const updateIdx = source.indexOf("await updateItem(selectedItemId, {");
            expect(capIdx).toBeGreaterThan(-1);
            // New guard runs after the cap guard and before the update call.
            expect(lowIdx).toBeGreaterThan(capIdx);
            expect(updateIdx).toBeGreaterThan(lowIdx);
            expect(source).toContain("isGoalBelowInitial(goalAmount, selectedBalance)");
            // Existing guards byte-identical.
            expect(source).toContain('Alert.alert("Invalid Goal", "Please enter a valid goal amount.")');
            // v1.1: live inline error + disabled Save (create-parity).
            // SPEC-99 widened the expression with || editSaving (same intent).
            expect(source).toContain("editGoalBelowBalance = isGoalBelowInitial(goalAmount, selectedItem?.balance ?? 0)");
            expect(source).toContain("{editGoalBelowBalance && (");
            expect(source).toContain("Goal amount is too low.");
            expect(source).toContain("theme.colors.error");
            expect(source).toContain("disabled={editGoalBelowBalance || editSaving}");
        });

        it("ACC-03: only import delta is the helper; no dep or platform branch", () => {
            const source = readRepo("app/savings.tsx");
            expect(source).toContain('import { isGoalBelowInitial } from "../utils/allocationGoal";');
            expect(source).not.toContain("Platform.OS");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
