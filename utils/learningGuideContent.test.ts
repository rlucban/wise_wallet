import * as fs from "fs";
import * as path from "path";

let mockOS: "android" | "ios" | "web" = "android";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

import { APP_GUIDE_CONTENT } from "./learningGuideContent";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

const REQUIRED_HEADINGS = [
    "Getting Started",
    "Using the Dashboard",
    "Adding and Editing Transactions",
    "Managing Categories and Payment Methods",
    "Tracking Scheduled Dues",
    "Building Allocations",
    "Reading Reports and Exporting",
    "Using the Calendar and Notifications",
    "Protecting Your Account",
    "Managing Settings and Data",
];

interface GuideBlock {
    heading: string;
    bodyLines: string[];
}

function parseBlocks(content: string): GuideBlock[] {
    return content
        .split(/\n\n+/)
        .filter((raw) => raw.trim().length > 0)
        .map((raw) => {
            const lines = raw.split("\n");
            return {
                heading: lines[0],
                bodyLines: lines.slice(1).filter((line) => line.trim().length > 0),
            };
        });
}

function runSuite(os: "android" | "ios" | "web"): void {
    describe(`SPEC-71 App Guide redo (${os})`, () => {
        const blocks = parseBlocks(APP_GUIDE_CONTENT);

        it("ACC-01: >= 11 blank-line blocks with the docked headings in exact order", () => {
            expect(blocks.length).toBeGreaterThanOrEqual(11);
            const headings = blocks.slice(0, 10).map((block) => block.heading.replace(/:$/, ""));
            expect(headings).toEqual(REQUIRED_HEADINGS);
            expect(blocks[10].heading).toBe("Pro Tips:");
        });

        it("ACC-02: body is >= 3000 chars and every section carries 2+ body lines", () => {
            expect(APP_GUIDE_CONTENT.length).toBeGreaterThanOrEqual(3000);
            for (const block of blocks.slice(0, 11)) {
                expect(block.bodyLines.length).toBeGreaterThanOrEqual(2);
            }
        });

        it("ACC-03: no TODO markers and no empty body blocks", () => {
            expect(APP_GUIDE_CONTENT).not.toContain("TODO(");
            for (const block of blocks) {
                expect(block.bodyLines.length).toBeGreaterThan(0);
            }
        });

        it("ACC-04: list surface unchanged - single App Guide resource, categories, and chip order", () => {
            const data = readRepo("utils/learningData.ts");
            expect(data).toContain('id: "wisewallet_app_guide"');
            expect(data).toContain('topic: "App Guide"');
            expect(data).toContain('title: "WiseWallet App Guide"');
            expect(data).toContain('"All", "Budgeting", "Savings", "Debt", "App Guide"');
            expect(data.indexOf('id: "wisewallet_app_guide"')).toBeGreaterThan(
                data.indexOf('id: "budgeting_101"')
            );

            const learning = readRepo("app/(tabs)/learning.tsx");
            expect(learning).toContain(
                '"All", "For Students", "For Workers", "Budgeting", "Savings", "Debt", "App Guide"'
            );
        });

        it("ACC-05: the detail screen reads the guide body from the single pure source", () => {
            const detail = readRepo("app/(tabs)/learning-detail.tsx");
            expect(detail).toContain(
                'import { APP_GUIDE_CONTENT } from "../../utils/learningGuideContent"'
            );
            expect(detail).toContain("content: APP_GUIDE_CONTENT");
        });

        it("SPEC-72 ACC-01/02: the App Guide has no audience tag; the other six keep theirs", () => {
            const data = readRepo("utils/learningData.ts");
            const guideBlock = data.slice(data.indexOf('id: "wisewallet_app_guide"'));
            expect(guideBlock).not.toContain("audience");
            expect(data).toContain("audience?: AudienceType");
            expect((data.match(/audience:/g) ?? []).length).toBe(6);
        });

        it("SPEC-72 ACC-03: learning.tsx audience filters and badge guard are unchanged", () => {
            const learning = readRepo("app/(tabs)/learning.tsx");
            expect(learning).toContain('item.audience === "Students"');
            expect(learning).toContain('item.audience === "Workers"');
            expect(learning).toContain("{item.audience && (");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");