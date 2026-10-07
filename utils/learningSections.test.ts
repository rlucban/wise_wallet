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

const GUIDE_IDS = ["app_overview", "how_to_log_dues", "managing_savings_goals"];
const LITERACY_IDS = [
    "budgeting_101",
    "understanding_debt",
    "saving_future",
    "understanding_interest_rates",
    "emergency_fund_essentials",
    "smart_expense_tracking",
];

function runSuite(os: "android" | "ios" | "web") {
    describe(`learning sections on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: 3 guide rows with App Guide topic; 6 literacy rows unchanged", () => {
            const source = readRepo("utils/learningData.ts");
            expect(source).toContain('"App Guide"');
            for (const id of GUIDE_IDS) {
                expect(source).toContain(`id: "${id}"`);
            }
            for (const id of LITERACY_IDS) {
                expect(source).toContain(`id: "${id}"`);
            }
            expect(source).toContain("budgeting_101");
        });

        it("ACC-02: WiseWallet App Guide header renders before Recommended Reading", () => {
            const source = readRepo("app/(tabs)/learning.tsx");
            const guideAt = source.indexOf("WiseWallet App Guide");
            const readingAt = source.indexOf("Recommended Reading");
            expect(guideAt).toBeGreaterThan(-1);
            expect(readingAt).toBeGreaterThan(guideAt);
        });

        it("ACC-03: guide list splits by topic; literacy filter logic intact", () => {
            const source = readRepo("app/(tabs)/learning.tsx");
            expect(source).toContain("filteredGuides");
            expect(source).toContain("filteredLiteracy");
            expect(source).toContain('if (item.topic !== "App Guide") return false;');
            expect(source).toContain('if (item.topic === "App Guide") return false;');
            expect(source).toContain('matchesFilter = item.topic === activeFilter;');
            expect(source).not.toContain("filteredResources");
        });

        it("ACC-04: detail bodies exist for all 3 guides; unknown-id path unchanged", () => {
            const source = readRepo("app/(tabs)/learning-detail.tsx");
            for (const id of GUIDE_IDS) {
                expect(source).toContain(`${id}: {`);
            }
            expect(source).toContain("Topic not found.");
        });

        it("SPEC-55 ACC-01: audience chip gated on topic in both card copies", () => {
            const source = readRepo("app/(tabs)/learning.tsx");
            expect(source).not.toContain("{item.audience && (");
            const hits = source.match(/item\.topic !== "App Guide" && item\.audience && \(/g) ?? [];
            expect(hits.length).toBe(2);
        });

        it("SPEC-55 ACC-02: literacy chip JSX intact behind the gate", () => {
            const source = readRepo("app/(tabs)/learning.tsx");
            expect(source).toContain("{item.audience}");
            expect(source).toContain("backgroundColor: theme.colors.surfaceVariant");
        });

        it("SPEC-55 ACC-03: filter predicates unchanged", () => {
            const source = readRepo("app/(tabs)/learning.tsx");
            expect(source).toContain("filteredGuides");
            expect(source).toContain("filteredLiteracy");
            expect(source).toContain('if (item.topic !== "App Guide") return false;');
            expect(source).toContain('if (item.topic === "App Guide") return false;');
            expect(source).toContain('matchesFilter = item.topic === activeFilter;');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
