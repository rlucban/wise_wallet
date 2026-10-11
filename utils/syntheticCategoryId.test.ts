import * as fs from "fs";
import * as path from "path";
import { toApiCategoryId } from "./uuid";

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

jest.mock("react-native-get-random-values", () => ({}));

jest.mock("uuid", () => ({
    __esModule: true,
    v4: () => "test-uuid",
}));

function runSuite(os: "android" | "ios" | "web") {
    describe(`synthetic category id gate on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: uuids pass, everything else maps to null", () => {
            expect(toApiCategoryId("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19")).toBe("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19");
            expect(toApiCategoryId("B0EEBC99-9C0B-4EF8-BB6D-6BB9BD380B19")).toBe("B0EEBC99-9C0B-4EF8-BB6D-6BB9BD380B19");
            for (const bad of [null, undefined, "", "scheduled", "uncategorized", "Food", "8", "9", "12345", "not-a-uuid"]) {
                expect(toApiCategoryId(bad as string | null | undefined)).toBeNull();
            }
        });

        it("ACC-02: all three wire bodies route through the helper", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(src.match(/toApiCategoryId\(/g) ?? []).toHaveLength(4);
            expect(src).toContain("categoryId: toApiCategoryId(uploaded.category?.id)");
            expect(src).not.toContain("categoryId: uploaded.category?.id ?? null");
            expect(src).not.toContain("updateBody.categoryId = updates.category ? updates.category.id : null;");
        });

        it("ACC-03: same-layer import only; sanitize and display untouched", () => {
            const src = readRepo("context/TransactionsContext.tsx");
            expect(src).toContain('from "../utils/uuid"');
            expect(src).toContain("id: 'uncategorized', name: 'Others'");
            const dues = readRepo("app/dues.tsx");
            expect(dues).toContain('id: "scheduled", name: "Add Scheduled"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
