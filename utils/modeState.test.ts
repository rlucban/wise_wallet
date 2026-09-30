import * as fs from "fs";
import * as path from "path";
import {
  resolveModeState,
  resolveDataPlane,
  resolveToggleRoute,
  resolveAutoBackupControl,
  WEB_AUTOBACKUP_ALWAYS_ON,
  WEB_AUTOBACKUP_DEVICE_NOTE,
  SYNC_ROW_LABEL,
  SYNC_STATE_LIVE,
  SYNC_STATE_OFF,
} from "./modeState";
import type { AutoBackupControlInput } from "./modeState";

// ACC-05 pins the display resolver to the function the data layers actually use.
// apiOnly's only native-touching transitive deps are mocked, mirroring
// utils/apiOnly.test.ts.
jest.mock("./apiClient", () => ({ authFetch: jest.fn() }));
jest.mock("./syncProcessor", () => ({ processSyncQueue: jest.fn(async () => {}) }));
import { isAutoBackupOn } from "./apiOnly";
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

    // --- SPEC-39: platform-aware Auto-Backup control (CON-02/CON-06) ---
    // Unlike the platform-blind helpers above, this resolver is platform-aware
    // by design, so `web` is EXPECTED to diverge from android/ios for a Cloud
    // account and to be identical for a Local one.

    const cloud = (profileAutoBackup?: boolean, os: string = platform) =>
      resolveAutoBackupControl({
        token: JWT,
        profileName: "user@example.com",
        profileAutoBackup,
        platformOs: os,
      });

    describe("SPEC-39 ACC-01: web is locked ON for every profile value", () => {
      for (const value of [false, true, undefined] as const) {
        test(`flag=${String(value)} on ${platform} → on, read-only, copy present`, () => {
          const c = cloud(value);
          if (platform === "web") {
            expect(c.effective).toBe(true);
            expect(c.writable).toBe(false);
            expect(c.lockedCopy).not.toBeNull();
          } else {
            expect(c.effective).toBe(value ?? true);
            expect(c.writable).toBe(true);
            expect(c.lockedCopy).toBeNull();
          }
        });
      }
    });

    describe("SPEC-39 ACC-02: native mirrors the profile and stays writable", () => {
      for (const value of [false, true, undefined] as const) {
        test(`flag=${String(value)} on ${platform} mirrors the profile`, () => {
          const c = cloud(value);
          const expected = value ?? true;
          if (platform === "web") {
            expect(c.effective).toBe(true);
            expect(c.writable).toBe(false);
          } else {
            expect(c.effective).toBe(expected);
            expect(c.writable).toBe(true);
            expect(c.lockedCopy).toBeNull();
          }
        });
      }
    });

    describe("SPEC-39 ACC-03: Local unchanged on every platform (CON-06)", () => {
      for (const token of [LOCAL_TOKEN, OFFLINE_TOKEN]) {
        test(`${token} on ${platform} → off, writable, no copy, no divergence`, () => {
          const c = resolveAutoBackupControl({
            token,
            profileName: "john_doe",
            profileAutoBackup: true,
            platformOs: platform,
          });
          expect(c.effective).toBe(false);
          expect(c.writable).toBe(true);
          expect(c.deviceDiffers).toBe(false);
          expect(c.lockedCopy).toBeNull();
        });
      }
    });

    describe("SPEC-39 ACC-04: deviceDiffers is exact", () => {
      test(`only web + profile false diverges (platform=${platform})`, () => {
        for (const value of [false, true, undefined] as const) {
          expect(cloud(value).deviceDiffers).toBe(platform === "web" && value === false);
        }
        // a Local account never reports divergence, even with the flag false
        expect(
          resolveAutoBackupControl({
            token: LOCAL_TOKEN,
            profileName: "john_doe",
            profileAutoBackup: false,
            platformOs: platform,
          }).deviceDiffers
        ).toBe(false);
      });
    });

    describe("SPEC-39 ACC-05: copy states the hard rule and never lies", () => {
      test("locked copy says always-on and never mentions off", () => {
        expect(WEB_AUTOBACKUP_ALWAYS_ON).toContain("Always on");
        expect(WEB_AUTOBACKUP_ALWAYS_ON.toLowerCase()).not.toContain("off");
      });

      test("device note names the mobile device and denies any write", () => {
        expect(WEB_AUTOBACKUP_DEVICE_NOTE).toContain("mobile");
        expect(WEB_AUTOBACKUP_DEVICE_NOTE).toContain("did not change");
        // never attributes "off" to web
        expect(WEB_AUTOBACKUP_DEVICE_NOTE.toLowerCase()).not.toMatch(/web[^.]*off/);
      });
    });

    describe("SPEC-39 ACC-06: source scan (CON-01/CON-09/CON-10)", () => {
      const settingsSrc = () =>
        fs.readFileSync(
          path.join(__dirname, "..", "app", "(tabs)", "settings.tsx"),
          "utf8"
        );

      test("settings.tsx uses the platform-aware resolver, not resolveModeState", () => {
        expect(settingsSrc()).toContain("resolveAutoBackupControl");
        expect(settingsSrc()).not.toContain("resolveModeState");
      });

      test("the switch is disabled when not writable", () => {
        // Asserted as parts, not one pinned expression: SPEC-40 legitimately
        // added `|| !deviceAutoBackupLoaded`, and re-pinning the whole string
        // made this test fail on a correct change.
        const src = settingsSrc();
        expect(src).toContain("disabled={isSyncing || !autoBackupWritable");
        expect(src).toContain("!autoBackupWritable ||");
      });

      test("handleToggleAutoBackup is guarded on writability", () => {
        expect(settingsSrc()).toContain("if (!autoBackupWritable) return;");
      });

      test("no web branch writes autoBackup false", () => {
        const src = settingsSrc();
        // the web early-return must no longer be fused with a profile write
        expect(src).not.toMatch(/Platform\.OS === "web" \|\| !activeUserId/);
        expect(src).toContain('if (Platform.OS === "web") return;');
      });

      test("both manual Backup/Restore buttons also require !isApiOnlyPlane", () => {
        const gated =
          settingsSrc().match(/\(!autoBackup && !isLocal && !isApiOnlyPlane\)/g) ?? [];
        expect(gated).toHaveLength(2);
      });

      test("resolveModeState is unchanged (SPEC-36 preserved)", () => {
        const src = fs.readFileSync(path.join(__dirname, "..", "utils", "modeState.ts"), "utf8");
        expect(src).toContain(
          "export function resolveModeState(input: ModeStateInput): ModeState"
        );
        expect(src).toContain(
          "const autoBackup = isLocal ? false : input.profileAutoBackup ?? true;"
        );
      });
    });

    // --- SPEC-40: per-device authority + honest labels ---

    const control = (
      overrides: Partial<AutoBackupControlInput> = {}
    ): ReturnType<typeof resolveAutoBackupControl> =>
      resolveAutoBackupControl({
        token: JWT,
        profileName: "user@example.com",
        platformOs: platform,
        ...overrides,
      });

    const STORE_VALUES = [null, "true", "false"] as const;
    const PROFILE_VALUES = [undefined, true, false] as const;

    describe("SPEC-40 ACC-01: the per-device value wins over the profile", () => {
      for (const store of ["true", "false"] as const) {
        for (const profile of PROFILE_VALUES) {
          test(`store='${store}' profile=${String(profile)} on ${platform}`, () => {
            const c = control({ deviceSettingValue: store, profileAutoBackup: profile });
            if (platform === "web") {
              // web is locked live regardless (ACC-03 / CON-08)
              expect(c.effective).toBe(true);
            } else {
              expect(c.effective).toBe(store === "false" ? false : true);
              expect(c.writable).toBe(true);
            }
          });
        }
      }
    });

    describe("SPEC-40 ACC-02: the profile only seeds a device with no stored value", () => {
      for (const empty of [null, undefined] as const) {
        for (const profile of PROFILE_VALUES) {
          test(`store=${String(empty)} profile=${String(profile)} on ${platform}`, () => {
            const c = control({ deviceSettingValue: empty, profileAutoBackup: profile });
            if (platform === "web") {
              expect(c.effective).toBe(true);
            } else {
              expect(c.effective).toBe(profile ?? true);
            }
          });
        }
      }
    });

    describe("SPEC-40 ACC-03: web stays locked on (SPEC-39 preserved)", () => {
      test(`every combination is effective/on + read-only (${platform})`, () => {
        for (const store of STORE_VALUES) {
          for (const profile of PROFILE_VALUES) {
            const c = control({ deviceSettingValue: store, profileAutoBackup: profile });
            if (platform !== "web") {
              expect(c.lockedCopy).toBeNull();
              continue;
            }
            expect(c.effective).toBe(true);
            expect(c.writable).toBe(false);
            expect(c.lockedCopy).toBe(WEB_AUTOBACKUP_ALWAYS_ON);
            // the note describes the OTHER device, so it tests the profile only
            expect(c.deviceDiffers).toBe(profile === false);
          }
        }
      });
    });

    describe("SPEC-40 ACC-04: Local identical on every platform", () => {
      for (const token of [LOCAL_TOKEN, OFFLINE_TOKEN]) {
        test(`${token} on ${platform} → off, writable, no copy, no divergence`, () => {
          for (const store of STORE_VALUES) {
            for (const profile of PROFILE_VALUES) {
              const c = resolveAutoBackupControl({
                token,
                profileName: "john_doe",
                profileAutoBackup: profile,
                deviceSettingValue: store,
                platformOs: platform,
              });
              expect(c.effective).toBe(false);
              expect(c.writable).toBe(true);
              expect(c.deviceDiffers).toBe(false);
              expect(c.lockedCopy).toBeNull();
            }
          }
        });
      }
    });

    describe("SPEC-40 ACC-05: display precedence === behavioral precedence", () => {
      test(`resolver agrees with isAutoBackupOn everywhere it is writable (${platform})`, () => {
        for (const store of STORE_VALUES) {
          for (const profile of PROFILE_VALUES) {
            const c = control({ deviceSettingValue: store, profileAutoBackup: profile });
            const behavioral = isAutoBackupOn(store, profile);
            if (c.writable) {
              expect(c.effective).toBe(behavioral);
            } else {
              expect(c.effective).toBe(true);
            }
          }
        }
      });
    });

    describe("SPEC-40 ACC-06: copy is honest and no longer says backup", () => {
      test("the row is labelled Cloud sync, not Auto-Backup", () => {
        expect(SYNC_ROW_LABEL).toBe("Cloud sync");
        expect(SYNC_ROW_LABEL.toLowerCase()).not.toContain("backup");
      });

      test("the live line says data is saved as changes are made", () => {
        expect(SYNC_STATE_LIVE.toLowerCase()).toContain("saved");
        expect(SYNC_STATE_LIVE.toLowerCase()).toContain("as you make it");
        expect(SYNC_STATE_LIVE.toLowerCase()).not.toContain("backup");
      });

      test("the off line names the device copy and the paused sync", () => {
        expect(SYNC_STATE_OFF.toLowerCase()).toContain("this device");
        expect(SYNC_STATE_OFF.toLowerCase()).toContain("syncing is paused");
        expect(SYNC_STATE_OFF.toLowerCase()).not.toContain("backup");
      });

      test("the SPEC-39 web hard rule is retained", () => {
        expect(WEB_AUTOBACKUP_ALWAYS_ON).toContain("Always on");
      });
    });

    describe("SPEC-40 ACC-08: sync can be turned back ON (CON-04 regression)", () => {
      test(`store='true' + profile=false resolves ON (${platform})`, () => {
        // Behavioral side: the previous negative-override precedence returned
        // false here, which made the toggle permanently unable to turn sync
        // back on for any account that had ever turned it off.
        expect(isAutoBackupOn("true", false)).toBe(true);
        expect(isAutoBackupOn("true", undefined)).toBe(true);
        // Display side: native follows the store ('true'); web is locked on.
        expect(control({ deviceSettingValue: "true", profileAutoBackup: false }).effective).toBe(
          true
        );
      });

      test(`store='false' still beats a profile 'true' (${platform})`, () => {
        expect(isAutoBackupOn("false", true)).toBe(false);
        // native → local-persist; web stays locked live
        expect(control({ deviceSettingValue: "false", profileAutoBackup: true }).effective).toBe(
          platform === "web"
        );
      });
    });

    describe("SPEC-40 ACC-07: source scan (CON-01/CON-06/CON-07/CON-11)", () => {
      const settingsSrc = () =>
        fs.readFileSync(
          path.join(__dirname, "..", "app", "(tabs)", "settings.tsx"),
          "utf8"
        );
      const apiOnlySrc = () =>
        fs.readFileSync(path.join(__dirname, "..", "utils", "apiOnly.ts"), "utf8");

      test("settings.tsx never writes the shared autoBackup profile flag", () => {
        const src = settingsSrc();
        expect(src).not.toMatch(/updateProfile\(\{\s*autoBackup/);
        expect(src).not.toContain("await updateProfile({ autoBackup: value })");
      });

      test("the switch row cannot render for a Local account", () => {
        expect(settingsSrc()).toMatch(
          /\{!isLocal && \(\s*<>\s*<View style=\{\{ flexDirection: "row", justifyContent: "space-between"/
        );
      });

      test("the Local promotion button is the sole entry point and still works", () => {
        const src = settingsSrc();
        expect(src).toContain("Register Online Account");
        expect(src).toMatch(/onPress=\{\(\) => startReregisterFlow\(\)\}/);
      });

      test("no user-visible 'auto-backup' string remains", () => {
        // separator REQUIRED, or the camelCase identifier `autoBackup`
        // (~20 legitimate references) would match
        expect(settingsSrc()).not.toMatch(/auto[- ]backup/i);
      });

      test("SPEC-39 guards all survive", () => {
        const src = settingsSrc();
        expect(src).toContain("if (!autoBackupWritable) return;");
        expect(src).toContain('if (Platform.OS === "web") return;');
        expect(
          src.match(/\(!autoBackup && !isLocal && !isApiOnlyPlane\)/g) ?? []
        ).toHaveLength(2);
      });

      test("the display reads the per-device store via getSetting", () => {
        const src = settingsSrc();
        // getSetting is the canonical reader (cache → AsyncStorage, and it
        // hydrates the cache). getCachedSetting alone is cold on every start.
        expect(src).toContain("deviceSettingValue: deviceAutoBackup");
        expect(src).toContain("await getSetting('autoBackup')");
        // the switch stays disabled until that value resolves, so no frame can
        // ever show the profile seed as if it were the device's own value
        expect(src).toContain(
          "disabled={isSyncing || !autoBackupWritable || !deviceAutoBackupLoaded}"
        );
        // and the read is re-run when the active user changes
        expect(src).toMatch(/\}, \[activeUserId\]\);/);
      });

      test("the data-plane functions are byte-identical (CON-04)", () => {
        const src = apiOnlySrc();
        expect(src).toContain("export function resolveDataPlane(args: {");
        expect(src).toContain("export async function resolveActivePlane(args: {");
        // the ONE sanctioned change: a present store value wins outright
        expect(src).toContain('if (storeValue === "true") return true;');
        expect(src).toContain('if (storeValue === "false") return false;');
        expect(src).toContain("if (typeof profileValue === \"boolean\") return profileValue;");
      });
    });
  }
);
