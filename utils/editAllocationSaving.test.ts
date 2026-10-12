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

function countOf(source: string, needle: string): number {
    return source.split(needle).length - 1;
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`editAllocationSaving on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: flight flag lifecycle (declare, early-return, set-true, finally-reset, reopen-reset)", () => {
            const source = readRepo("app/savings.tsx");
            expect(source).toContain("const [editSaving, setEditSaving] = useState(false);");
            const idCheckIdx = source.indexOf("if (!selectedItemId) return;");
            const earlyReturnIdx = source.indexOf("if (editSaving) return;");
            expect(idCheckIdx).toBeGreaterThan(-1);
            expect(earlyReturnIdx).toBeGreaterThan(idCheckIdx);
            // set-true runs after the SPEC-98 guard and before the update call.
            const lowIdx = source.indexOf('Alert.alert("Invalid Goal", "Goal amount is too low.")');
            const setTrueIdx = source.indexOf("setEditSaving(true);");
            const updateIdx = source.indexOf("await updateItem(selectedItemId, {");
            expect(lowIdx).toBeGreaterThan(-1);
            expect(setTrueIdx).toBeGreaterThan(lowIdx);
            expect(updateIdx).toBeGreaterThan(setTrueIdx);
            // finally-reset sits after the catch of the same handler.
            const catchIdx = source.indexOf("} catch (e) {");
            const finallyIdx = source.indexOf("} finally {");
            expect(catchIdx).toBeGreaterThan(updateIdx);
            expect(finallyIdx).toBeGreaterThan(catchIdx);
            expect(countOf(source, "setEditSaving(true);")).toBe(1);
            // Two resets: the finally block + the openEditModal reopen guard.
            expect(countOf(source, "setEditSaving(false);")).toBe(2);
            const openIdx = source.indexOf("const openEditModal");
            const openCloseIdx = source.indexOf("setEditModalVisible(true);");
            expect(openIdx).toBeGreaterThan(-1);
            expect(openCloseIdx).toBeGreaterThan(openIdx);
            expect(source.slice(openIdx, openCloseIdx)).toContain("setEditSaving(false);");
        });

        it("ACC-02: button wiring + untouched validation/success/failure lines", () => {
            const source = readRepo("app/savings.tsx");
            expect(source).toContain("loading={editSaving}");
            expect(source).toContain("disabled={editGoalBelowBalance || editSaving}");
            // Validation guards, copies, and settle paths byte-identical.
            expect(source).toContain('Alert.alert("Invalid Goal", "Please enter a valid goal amount.")');
            expect(source).toContain("Goal amount must not exceed 10,000,000.");
            expect(source).toContain('Alert.alert("Invalid Goal", "Goal amount is too low.")');
            expect(source).toContain("setEditModalVisible(false);");
            expect(source).toContain("Failed to update allocation. Please try again.");
        });

        it("ACC-03: no new import, dep, platform branch, or hook change", () => {
            const source = readRepo("app/savings.tsx");
            expect(source).not.toContain("Platform.OS");
            expect(source).toContain('import { useSavings } from "../hooks/useSavings";');
            expect(countOf(source, 'from "../utils/allocationGoal"')).toBe(1);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
