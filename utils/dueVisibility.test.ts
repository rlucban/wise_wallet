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

function count(src: string, re: RegExp): number {
    return (src.match(re) || []).length;
}

function runSuite(os: "android" | "ios" | "web") {
    describe(`paid due visibility on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01a: next occurrence anchors on max(today, scheduled)", () => {
            const src = readRepo("app/dues.tsx");
            expect(count(src, /const anchorMs = Math\.max\(Date\.now\(\), new Date\(item\.date\)\.getTime\(\)\);/g)).toBe(1);
        });

        it("ACC-01b: stale anchor (bare item.date) is gone", () => {
            const src = readRepo("app/dues.tsx");
            expect(count(src, /const nextDate = new Date\(item\.date\);/g)).toBe(0);
        });

        it("ACC-02a: busy lifecycle — state, guard, set, finally-reset", () => {
            const src = readRepo("app/dues.tsx");
            expect(src).toContain("const [payBusy, setPayBusy] = useState(false);");
            expect(src).toContain("if (payBusy) return;");
            expect(src).toContain("setPayBusy(true);");
            expect(src).toContain("} finally {");
            expect(src).toContain("setPayBusy(false);");
        });

        it("ACC-02b: both tap sites disabled while busy", () => {
            const src = readRepo("app/dues.tsx");
            expect(src).toContain("disabled={payBusy}");
            expect(src).toContain("disabled={!payTarget || payBusy}");
        });

        it("ACC-03a: Auto-renew labels present (switches, badge, help)", () => {
            expect(readRepo("app/add-due.tsx")).toContain("Auto-renew");
            expect(readRepo("app/dues.tsx")).toContain("AUTO-RENEW");
            expect(count(readRepo("app/help.tsx"), /Auto-renew/g)).toBe(2);
        });

        it("ACC-03b: no Auto-Process UI labels remain", () => {
            expect(readRepo("app/add-due.tsx")).not.toContain("Auto-Process");
            expect(readRepo("app/dues.tsx")).not.toContain("Auto-Process");
            expect(readRepo("app/help.tsx")).not.toContain("Auto-Process");
        });

        it("ACC-03c: autoProcess field and logic references intact", () => {
            expect(readRepo("types/index.ts")).toContain("autoProcess?: boolean;");
            expect(readRepo("app/help.tsx")).toContain("automatically created");
            expect(readRepo("app/dues.tsx")).toContain("item.autoProcess === true");
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
