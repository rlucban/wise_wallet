import * as fs from "fs";
import * as path from "path";
import { Platform } from "react-native";

type PlatformOS = "android" | "ios" | "web";

const PLATFORMS: PlatformOS[] = ["android", "ios", "web"];

let mockOS: PlatformOS = "ios";

jest.mock("react-native", () => ({
    Platform: {
        get OS() {
            return mockOS;
        },
    },
}));

const CALENDAR_SHEET_PATH = path.resolve(__dirname, "..", "components", "CalendarDaySheet.tsx");
const DASHBOARD_PATH = path.resolve(__dirname, "..", "app", "(tabs)", "index.tsx");

const calendarSheetSource = fs.readFileSync(CALENDAR_SHEET_PATH, "utf8");
const dashboardSource = fs.readFileSync(DASHBOARD_PATH, "utf8");

const BOTTOM_SHEET_OVERLAY = 'justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)"';
const SHEET_HEIGHT_92 = 'height: "92%"';
const DRAG_HANDLE = "width: 40, height: 4";

describe.each(PLATFORMS)("SPEC-62 simplified calendar modal guards on %s", (platform) => {
    beforeEach(() => {
        mockOS = platform;
    });

    it("runs against the mocked platform", () => {
        expect(Platform.OS).toBe(platform);
    });

    it("ACC-02: no per-day transaction list remains in CalendarDaySheet", () => {
        expect(calendarSheetSource).not.toContain("List.Item");
        expect(calendarSheetSource).not.toContain("dayTransactions.map");
        expect(calendarSheetSource).not.toContain("Divider");
        expect(calendarSheetSource).not.toContain("No transactions on this day");
    });

    it("ACC-03: content order is calendar grid, then income/expense summary, then financial tip", () => {
        const gridIndex = calendarSheetSource.indexOf("<Calendar");
        const summaryIndex = calendarSheetSource.indexOf("Income:");
        const tipIndex = calendarSheetSource.indexOf("<FinancialTip");
        expect(gridIndex).toBeGreaterThanOrEqual(0);
        expect(summaryIndex).toBeGreaterThan(gridIndex);
        expect(tipIndex).toBeGreaterThan(summaryIndex);
    });

    it("ACC-05: sheet uses viewport-bounded maxHeight (via useWindowDimensions)", () => {
        expect(calendarSheetSource).toContain("useWindowDimensions");
        expect(calendarSheetSource).toContain("windowHeight * 0.8");
    });

    it("ACC-01: the Home modal uses CenteredDialogModal", () => {
        expect(dashboardSource).toContain("CenteredDialogModal");
        expect(dashboardSource).toContain("calendarSheetVisible");
    });

    it("ACC-01: the bottom-sheet overlay is gone from the Home screen", () => {
        expect(dashboardSource).not.toContain(BOTTOM_SHEET_OVERLAY);
        expect(dashboardSource).not.toContain(SHEET_HEIGHT_92);
        expect(dashboardSource).not.toContain("borderTopLeftRadius");
    });

    it("ACC-06: the centered modal keeps a close action and drops the drag handle", () => {
        expect(dashboardSource).toContain('icon="close"');
        expect(dashboardSource).not.toContain(DRAG_HANDLE);
    });

    it("ACC-07: CalendarDaySheet uses viewport-bounded maxHeight (via useWindowDimensions)", () => {
        expect(calendarSheetSource).toContain("useWindowDimensions");
        expect(calendarSheetSource).toContain("windowHeight * 0.8");
    });
});