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
  describe(`scheduled single-popup guards on ${os}`, () => {
    beforeEach(() => {
      mockOS = os;
    });

    it("P1: exactly one Transaction Recorded writer", () => {
      const src = readRepo("app/dues.tsx");
      expect(count(src, /title: "Transaction Recorded"/g)).toBe(1);
    });

    it("P2: busy lifecycle — state, guard, set, finally-reset", () => {
      const src = readRepo("app/dues.tsx");
      expect(src).toContain("const [payBusy, setPayBusy] = useState(false);");
      expect(src).toContain("if (payBusy) return;");
      expect(src).toContain("setPayBusy(true);");
      expect(src).toContain("} finally {");
      expect(src).toContain("setPayBusy(false);");
    });

    it("P3: both tap sites disabled while busy", () => {
      const src = readRepo("app/dues.tsx");
      expect(src).toContain("disabled={payBusy}");
      expect(src).toContain("disabled={!payTarget || payBusy}");
    });

    it("P4: Confirm closes the pay dialog before the write starts", () => {
      const src = readRepo("app/dues.tsx");
      const closeIdx = src.indexOf("setPayTarget(null);");
      const writeIdx = src.indexOf("recordTransaction(due, method);");
      expect(closeIdx).toBeGreaterThan(-1);
      expect(writeIdx).toBeGreaterThan(closeIdx);
    });

    it("P5: dues screen emits no toast itself (rival toast lives in the hook layer)", () => {
      expect(count(readRepo("app/dues.tsx"), /showToast/g)).toBe(0);
    });

    it("P6: notification reschedule stays silent — no Alert dialog on this screen", () => {
      const src = readRepo("app/dues.tsx");
      expect(src).toContain("scheduleDueNotifications(dues).catch");
      expect(count(src, /Alert\.alert/g)).toBe(0);
    });
  });
}

runSuite("android");
runSuite("ios");
runSuite("web");
