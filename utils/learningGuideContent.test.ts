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
import {
    APP_GUIDE_GETTING_STARTED_CONTENT,
    APP_GUIDE_SCHEDULED_DUES_CONTENT,
    APP_GUIDE_ALLOCATIONS_CONTENT,
    APP_GUIDE_REPORTS_CONTENT,
} from "./learningGuideContent";

function readRepo(relativePath: string): string {
    return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

const TRIMMED_HEADINGS = [
    "Using the Dashboard",
    "Adding and Editing Transactions",
    "Managing Categories and Payment Methods",
    "Using the Calendar and Notifications",
    "Protecting Your Account",
    "Managing Settings and Data",
];

const REMOVED_HEADINGS = [
    "Getting Started",
    "Tracking Scheduled Dues",
    "Building Allocations",
    "Reading Reports and Exporting",
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

        it("ACC-01: exactly 7 blocks with the trimmed headings in exact order", () => {
            expect(blocks.length).toBe(7);
            const headings = blocks.slice(0, 6).map((block) => block.heading.replace(/:$/, ""));
            expect(headings).toEqual(TRIMMED_HEADINGS);
            expect(blocks[6].heading).toBe("Pro Tips:");
            for (const removed of REMOVED_HEADINGS) {
                expect(APP_GUIDE_CONTENT).not.toContain(`${removed}:`);
            }
        });

        it("ACC-02: body is >= 1500 chars and every section carries 2+ body lines", () => {
            expect(APP_GUIDE_CONTENT.length).toBeGreaterThanOrEqual(1500);
            for (const block of blocks) {
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

        describe(`SPEC-73 additional App Guide articles (${os})`, () => {
            const NEW_GUIDES: Array<[string, string, string]> = [
                ["app_guide_getting_started", "APP_GUIDE_GETTING_STARTED_CONTENT", APP_GUIDE_GETTING_STARTED_CONTENT],
                ["app_guide_scheduled_dues", "APP_GUIDE_SCHEDULED_DUES_CONTENT", APP_GUIDE_SCHEDULED_DUES_CONTENT],
                ["app_guide_allocations", "APP_GUIDE_ALLOCATIONS_CONTENT", APP_GUIDE_ALLOCATIONS_CONTENT],
                ["app_guide_reports", "APP_GUIDE_REPORTS_CONTENT", APP_GUIDE_REPORTS_CONTENT],
            ];

            it("ACC-01: the four new resources are App Guide, audienceless, and after the overview", () => {
                const data = readRepo("utils/learningData.ts");
                const guideAt = data.indexOf('id: "wisewallet_app_guide"');
                for (const [id] of NEW_GUIDES) {
                    const at = data.indexOf(`id: "${id}"`);
                    expect(at).toBeGreaterThan(guideAt);
                    const block = data.slice(at, data.indexOf("},", at));
                    expect(block).toContain('topic: "App Guide"');
                    expect(block).not.toContain("audience");
                }
            });

            it("ACC-02: the six audience articles, optional field, and categories are unchanged", () => {
                const data = readRepo("utils/learningData.ts");
                expect(data).toContain("audience?: AudienceType");
                expect((data.match(/audience:/g) ?? []).length).toBe(6);
                expect(data).toContain('["All", "Budgeting", "Savings", "Debt", "App Guide"]');
            });

            it("ACC-03: each new body is non-empty with 3+ unique headings and 2+ body lines", () => {
                for (const [, , content] of NEW_GUIDES) {
                    expect(content.length).toBeGreaterThan(0);
                    expect(content).not.toContain("TODO(");
                    const blocks = parseBlocks(content);
                    expect(blocks.length).toBeGreaterThanOrEqual(3);
                    const headings = blocks.map((block) => block.heading);
                    expect(new Set(headings).size).toBe(headings.length);
                    for (const block of blocks) {
                        expect(block.heading.endsWith(":")).toBe(true);
                        expect(block.bodyLines.length).toBeGreaterThanOrEqual(2);
                    }
                }
            });

            it("ACC-04: the detail screen imports and maps all four new guides", () => {
                const detail = readRepo("app/(tabs)/learning-detail.tsx");
                for (const [id, name] of NEW_GUIDES) {
                    expect(detail).toContain(`${id}: {`);
                    expect(detail).toContain(`content: ${name}`);
                }
            });

            it("ACC-05: SPEC-71 outline and SPEC-72 audience guards stay green", () => {
                expect(APP_GUIDE_CONTENT.length).toBeGreaterThanOrEqual(1500);
                expect(blocks.length).toBe(7);
                const guideBlock = readRepo("utils/learningData.ts").slice(
                    readRepo("utils/learningData.ts").indexOf('id: "wisewallet_app_guide"')
                );
                expect(guideBlock).not.toContain("audience");
            });
        });

        describe(`SPEC-74 trim + App Guide section + peach (${os})`, () => {
            it("ACC-03: learning.tsx splits Recommended Reading from the App Guide section", () => {
                const learning = readRepo("app/(tabs)/learning.tsx");
                expect(learning).toContain('item.topic !== "App Guide"');
                expect(learning).toContain('item.topic === "App Guide"');
                const recommendedTitle = learning.indexOf(">Recommended Reading</Text>");
                const appGuideTitle = learning.indexOf(">App Guide</Text>");
                expect(recommendedTitle).toBeGreaterThan(-1);
                expect(appGuideTitle).toBeGreaterThan(recommendedTitle);
            });

            it("ACC-04: the App Guide badge uses fixed peach colors", () => {
                const learning = readRepo("app/(tabs)/learning.tsx");
                expect(learning).toContain('case "App Guide":');
                expect(learning).toContain("#FFDAB9");
                expect(learning).toContain("#5D4037");
            });

            it("ACC-05: the four SPEC-73 articles and their detail mapping stay intact", () => {
                const detail = readRepo("app/(tabs)/learning-detail.tsx");
                const guides: Array<[string, string, string]> = [
                    ["app_guide_getting_started", "APP_GUIDE_GETTING_STARTED_CONTENT", APP_GUIDE_GETTING_STARTED_CONTENT],
                    ["app_guide_scheduled_dues", "APP_GUIDE_SCHEDULED_DUES_CONTENT", APP_GUIDE_SCHEDULED_DUES_CONTENT],
                    ["app_guide_allocations", "APP_GUIDE_ALLOCATIONS_CONTENT", APP_GUIDE_ALLOCATIONS_CONTENT],
                    ["app_guide_reports", "APP_GUIDE_REPORTS_CONTENT", APP_GUIDE_REPORTS_CONTENT],
                ];
                for (const [id, name, content] of guides) {
                    expect(content.length).toBeGreaterThan(0);
                    expect(detail).toContain(`${id}: {`);
                    expect(detail).toContain(`content: ${name}`);
                }
                expect((readRepo("utils/learningData.ts").match(/audience:/g) ?? []).length).toBe(6);
            });
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");