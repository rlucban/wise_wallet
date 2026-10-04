import * as fs from "fs";
import * as path from "path";
import { buildOpeningBalancePayload } from "./onboardingPayload";

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
    describe(`onboardingPayload on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: nonzero balance yields paymentMethod cash", () => {
            const payload = buildOpeningBalancePayload(1000);
            expect(payload).not.toBeNull();
            expect(payload?.paymentMethod).toBe("cash");
            expect(payload?.title).toBe("Opening Balance");
            expect(payload?.type).toBe("income");
            expect(payload?.amount).toBe(1000);
        });

        it("ACC-02: zero balance yields null (no transaction)", () => {
            expect(buildOpeningBalancePayload(0)).toBeNull();
        });

        it("keeps the category shape the server accepts", () => {
            const payload = buildOpeningBalancePayload(250.5);
            expect(payload?.category).toMatchObject({
                id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19",
                name: "Others",
                type: "income",
            });
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");

describe("SPEC-37 wiring guards", () => {
    it("ACC-03: onboarding builds the payload via the builder", () => {
        const source = readRepo("app/onboarding.tsx");
        expect(source).toContain("buildOpeningBalancePayload");
    });

    it("ACC-04: onboarding catch sets a rendered error state", () => {
        const source = readRepo("app/onboarding.tsx");
        expect(source).toContain("setSetupError(");
        expect(source).toContain("{setupError ? (");
    });
});
