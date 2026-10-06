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

function runSuite(os: "android" | "ios" | "web") {
    describe(`reports yearly icon on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: no calendar-year remains in reports", () => {
            const source = readRepo("app/(tabs)/reports.tsx");
            expect(source).not.toContain("calendar-year");
        });

        it("ACC-02: Yearly (annually) row carries calendar-outline", () => {
            const source = readRepo("app/(tabs)/reports.tsx");
            expect(source).toContain('title="Yearly" leadingIcon="calendar-outline"');
        });

        it("ACC-03: Weekly/Monthly rows unchanged", () => {
            const source = readRepo("app/(tabs)/reports.tsx");
            expect(source).toContain('title="Weekly" leadingIcon="calendar-week"');
            expect(source).toContain('title="Monthly" leadingIcon="calendar-month"');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
