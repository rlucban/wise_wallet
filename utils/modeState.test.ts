import * as fs from "fs";
import * as path from "path";
import {
  resolveModeState,
  resolveDataPlane,
  resolveToggleRoute,
} from "./modeState";
let mockOS: "android" | "ios" | "web" = "android";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

const JWT = "eyJhbGciOiJIUzI1NiJ9.cloud-token";
const LOCAL_TOKEN = "local_token";
const OFFLINE_TOKEN = "offline_token";

describe.each(["android", "ios", "web"] as const)(
  "modeState SPEC-36 on %s",
  (platform) => {
    beforeEach(() => {
      mockOS = platform;
    });

    describe("ACC-01: JWT × name shapes → Cloud display + Cloud plane", () => {
      const names = [
        "user@example.com",
        "john_doe",
        "",
        undefined,
      ];

      for (const name of names) {
        test(`name=${JSON.stringify(name)} → isLocal=false, autoBackup from flag`, () => {
          const result = resolveModeState({
            token: JWT,
            profileName: name,
            profileAutoBackup: true,
          });
          expect(result.isLocal).toBe(false);
          expect(result.autoBackup).toBe(true);
        });
      }

      test("JWT + username + flag true → apiOnly plane", () => {
        const { isLocal, autoBackup } = resolveModeState({
          token: JWT,
          profileName: "john_doe",
          profileAutoBackup: true,
        });
        expect(resolveDataPlane(isLocal, autoBackup, platform)).toBe(true);
      });

      test("JWT + username + flag false → not apiOnly on mobile, apiOnly on web", () => {
        const { isLocal, autoBackup } = resolveModeState({
          token: JWT,
          profileName: "john_doe",
          profileAutoBackup: false,
        });
        const plane = resolveDataPlane(isLocal, autoBackup, platform);
        if (platform === "web") {
          expect(plane).toBe(true);
        } else {
          expect(plane).toBe(false);
        }
      });
    });

    describe("ACC-02: JWT + username + flag true → toggle-ON = pin-verify", () => {
      test("toggle ON routes to pin-verify, never reregister", () => {
        const { isLocal } = resolveModeState({
          token: JWT,
          profileName: "john_doe",
          profileAutoBackup: true,
        });
        expect(resolveToggleRoute(isLocal, true)).toBe("pin-verify");
        expect(resolveToggleRoute(isLocal, true)).not.toBe("reregister");
      });

      test("toggle OFF routes to disable", () => {
        const { isLocal } = resolveModeState({
          token: JWT,
          profileName: "john_doe",
          profileAutoBackup: true,
        });
        expect(resolveToggleRoute(isLocal, false)).toBe("disable");
      });
    });

    describe("ACC-03: no name-shape mode test in settings.tsx", () => {
      test("settings.tsx contains no isUsernameOnly/isEffectivelyLocal", () => {
        const src = fs.readFileSync(
          path.join(__dirname, "..", "app", "(tabs)", "settings.tsx"),
          "utf8"
        );
        expect(src).not.toContain("isUsernameOnly");
        expect(src).not.toContain("isEffectivelyLocal");
      });

      test("settings.tsx contains no email-regex feeding mode", () => {
        const src = fs.readFileSync(
          path.join(__dirname, "..", "app", "(tabs)", "settings.tsx"),
          "utf8"
        );
        const emailRegex = /isValidEmail|isEmailShaped/;
        expect(src).not.toMatch(emailRegex);
      });
    });

    describe("ACC-04: local token forces Local display + re-register route", () => {
      for (const token of [LOCAL_TOKEN, OFFLINE_TOKEN]) {
        test(`${token} + username → isLocal=true, toggle-ON = reregister`, () => {
          const { isLocal, autoBackup } = resolveModeState({
            token,
            profileName: "john_doe",
            profileAutoBackup: true,
          });
          expect(isLocal).toBe(true);
          expect(autoBackup).toBe(false);
          expect(resolveToggleRoute(isLocal, true)).toBe("reregister");
        });
      }
    });

    describe("ACC-05: autoBackup derivation ignores name shape", () => {
      test("Cloud + username + stored true → true", () => {
        const { autoBackup } = resolveModeState({
          token: JWT,
          profileName: "john_doe",
          profileAutoBackup: true,
        });
        expect(autoBackup).toBe(true);
      });

      test("Cloud + username + stored false → false", () => {
        const { autoBackup } = resolveModeState({
          token: JWT,
          profileName: "john_doe",
          profileAutoBackup: false,
        });
        expect(autoBackup).toBe(false);
      });

      test("Cloud + email + stored true → true (no regression)", () => {
        const { autoBackup } = resolveModeState({
          token: JWT,
          profileName: "user@example.com",
          profileAutoBackup: true,
        });
        expect(autoBackup).toBe(true);
      });

      test("Local + any name → false (token arm)", () => {
        const { autoBackup } = resolveModeState({
          token: LOCAL_TOKEN,
          profileName: "john_doe",
          profileAutoBackup: true,
        });
        expect(autoBackup).toBe(false);
      });

      test("Cloud + no flag stored → defaults true", () => {
        const { autoBackup } = resolveModeState({
          token: JWT,
          profileName: "john_doe",
          profileAutoBackup: undefined,
        });
        expect(autoBackup).toBe(true);
      });
    });
  }
);
