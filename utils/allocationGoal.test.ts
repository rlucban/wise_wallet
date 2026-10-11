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
    describe(`allocationGoal on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: goal below initial is flagged; at-or-above and empty are not", () => {
            expect(isGoalBelowInitial("100", 500)).toBe(true);
            expect(isGoalBelowInitial("999", 500)).toBe(false);
            expect(isGoalBelowInitial("", 500)).toBe(false);
        });

        it("ACC-02: goal equal to initial is allowed (strict comparison)", () => {
            expect(isGoalBelowInitial("500", 500)).toBe(false);
        });

        it("ACC-05: empty or whitespace goal is never flagged", () => {
            expect(isGoalBelowInitial("", 500)).toBe(false);
            expect(isGoalBelowInitial("   ", 500)).toBe(false);
        });

        it("parses formatted input and treats unparseable as 0", () => {
            expect(isGoalBelowInitial("1,000", 500)).toBe(false);
            expect(isGoalBelowInitial(".", 500)).toBe(true);
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");

describe("SPEC-78 wiring guards", () => {
    it("ACC-03: goal-below-initial is folded into isGoalInvalid / isFormInvalid", () => {
        const source = readRepo("app/add-allocation.tsx");
        expect(source).toContain("isGoalBelowInitial(goalAmount, initialBalanceNum)");
        expect(source).toContain("goalBelowInitial");
        expect(source).toContain(
            "const isFormInvalid = !title.trim() || isInitialBalanceInvalid || isGoalInvalid;"
        );
    });

    it("ACC-04: red copy renders with the theme error color", () => {
        const source = readRepo("app/add-allocation.tsx");
        expect(source).toContain("Goal amount is too low.");
        expect(source).toContain("theme.colors.error");
    });
});
