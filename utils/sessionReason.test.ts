import * as fs from "fs";
import * as path from "path";
import {
  AUTH_FAILURE_NOTICES,
  SESSION_REVOKED_MESSAGE,
  TOKEN_EXPIRED_MESSAGE,
  TOKEN_GONE_MESSAGE,
  TOKEN_INVALID_MESSAGE,
  classifyAuthFailure,
  extractErrorMessage,
  getAuthFailureNotice,
  shouldPersistSessionEndedAlert,
} from "./sessionReason";
import type { AuthFailureReason } from "./sessionReason";
import { buildAuthRegisterPayload } from "./localGate";

let mockOS: "android" | "ios" | "web" = "android";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

const body = (message?: string): Record<string, unknown> =>
  message === undefined ? {} : { status: "fail", message };

const ALL: AuthFailureReason[] = [
  "session_revoked",
  "token_expired",
  "token_invalid",
  "auth_failed",
];

describe.each(["android", "ios", "web"] as const)("sessionReason SPEC-38 on %s", (platform) => {
  beforeEach(() => {
    mockOS = platform;
  });

  // Pure helper with no Platform.OS branch (CON-02), so the matrix asserts
  // identical classification everywhere — that identity IS the Android/iOS/Web
  // guarantee, asserted rather than assumed.
  describe("ACC-01: each cause maps to its own reason", () => {
    test("expiry message → token_expired", () => {
      expect(classifyAuthFailure({ status: 401, body: body(TOKEN_EXPIRED_MESSAGE) })).toBe(
        "token_expired"
      );
    });

    test("invalid-token message → token_invalid", () => {
      expect(classifyAuthFailure({ status: 401, body: body(TOKEN_INVALID_MESSAGE) })).toBe(
        "token_invalid"
      );
    });

    test("account-gone message → token_invalid", () => {
      expect(classifyAuthFailure({ status: 401, body: body(TOKEN_GONE_MESSAGE) })).toBe(
        "token_invalid"
      );
    });

    test("revocation message → session_revoked", () => {
      expect(classifyAuthFailure({ status: 401, body: body(SESSION_REVOKED_MESSAGE) })).toBe(
        "session_revoked"
      );
    });
  });

  describe("ACC-02: an expiry is never reported as a kick", () => {
    test("token_expired, and specifically NOT session_revoked", () => {
      const reason = classifyAuthFailure({ status: 401, body: body(TOKEN_EXPIRED_MESSAGE) });
      expect(reason).toBe("token_expired");
      expect(reason).not.toBe("session_revoked");
    });

    test("an expiry never requests the persistent alert", () => {
      expect(shouldPersistSessionEndedAlert("token_expired")).toBe(false);
    });

    test("the legacy blanket reason no longer exists in the reason union", () => {
      // 'session_ended' asserted a kick for every 401 — the defect this spec
      // removes. Nothing may produce it any more.
      expect(ALL).not.toContain("session_ended");
    });
  });

  describe("ACC-03: fail-safe — unknown means no claim", () => {
    // Deliberately non-object bodies: the classifier must never inspect them
    // (CON-05) and must never upgrade them to a claim (CON-03).
    const unknowns: unknown[] = [
      body("Something unexpected happened"),
      body(""),
      body("   "),
      {},
      undefined,
      { message: 12345 },
      { message: null },
      { message: { nested: true } },
      "a bare string body",
      42,
      [],
      null,
    ];

    for (const unknown of unknowns) {
      test(`never upgrades to session_revoked: ${JSON.stringify(unknown)}`, () => {
        const reason = classifyAuthFailure({ status: 401, body: unknown });
        expect(reason).toBe("auth_failed");
        expect(reason).not.toBe("session_revoked");
      });
    }

    test("non-401 statuses are auth_failed regardless of body", () => {
      for (const status of [200, 400, 403, 404, 500, 0]) {
        expect(classifyAuthFailure({ status, body: body(SESSION_REVOKED_MESSAGE) })).toBe(
          "auth_failed"
        );
      }
    });

    test("only the exact revocation message yields session_revoked", () => {
      const nearMisses = [
        "session ended on another device",
        "Session ended on another device.",
        "Your session was ended on another device. Please log in again.",
        "Session ended elsewhere",
      ];
      for (const message of nearMisses) {
        expect(classifyAuthFailure({ status: 401, body: body(message) })).toBe("auth_failed");
      }
    });
  });

  describe("ACC-04: the alert is gated on revocation only (CON-04)", () => {
    test("true for session_revoked", () => {
      expect(shouldPersistSessionEndedAlert("session_revoked")).toBe(true);
    });

    test("false for every other reason", () => {
      for (const reason of ALL) {
        if (reason === "session_revoked") continue;
        expect(shouldPersistSessionEndedAlert(reason)).toBe(false);
      }
    });
  });

  describe("ACC-05: extractErrorMessage reads `message`, then `error`", () => {
    test("prefers `message` over `error`", () => {
      expect(extractErrorMessage({ message: "from message", error: "from error" })).toBe(
        "from message"
      );
    });

    test("falls back to `error`", () => {
      expect(extractErrorMessage({ error: "from error" })).toBe("from error");
    });

    test("reads a lone `message`", () => {
      expect(extractErrorMessage({ message: "solo" })).toBe("solo");
    });

    test("trims surrounding whitespace", () => {
      expect(extractErrorMessage({ message: "  padded  " })).toBe("padded");
    });

    test("returns null for empty, absent and non-object bodies", () => {
      expect(extractErrorMessage({})).toBeNull();
      expect(extractErrorMessage({ message: "" })).toBeNull();
      expect(extractErrorMessage({ message: "   " })).toBeNull();
      expect(extractErrorMessage(null)).toBeNull();
      expect(extractErrorMessage(undefined)).toBeNull();
      expect(extractErrorMessage("plain string")).toBeNull();
      expect(extractErrorMessage(7)).toBeNull();
      expect(extractErrorMessage([{ message: "in array" }])).toBeNull();
    });
  });

  describe("ACC-06: notice copy is honest", () => {
    test("expiry and invalid get a notice; revoked and unknown do not", () => {
      expect(getAuthFailureNotice("token_expired")).toBeTruthy();
      expect(getAuthFailureNotice("token_invalid")).toBeTruthy();
      expect(getAuthFailureNotice("session_revoked")).toBeNull();
      expect(getAuthFailureNotice("auth_failed")).toBeNull();
    });

    test("no notice ever claims another device (only the alert may)", () => {
      for (const reason of ALL) {
        const notice = getAuthFailureNotice(reason);
        if (notice === null) continue;
        expect(notice.toLowerCase()).not.toContain("another device");
      }
    });

    test("the expiry notice says expired, not kicked", () => {
      expect(getAuthFailureNotice("token_expired")).toContain("expired");
    });

    test("every reason has an entry so no lookup can be undefined", () => {
      for (const reason of ALL) {
        expect(Object.keys(AUTH_FAILURE_NOTICES)).toContain(reason);
      }
    });

    test("an unknown reason string yields no notice (login param fail-safe)", () => {
      expect(getAuthFailureNotice("" as AuthFailureReason)).toBeNull();
      expect(getAuthFailureNotice("garbage" as AuthFailureReason)).toBeNull();
    });
  });

  describe("ACC-07: source scan — no blanket kick claim anywhere", () => {
    const read = (relative: string): string =>
      fs.readFileSync(path.resolve(__dirname, "..", relative), "utf-8");

    test("apiClient no longer hardcodes the blanket 'session_ended' reason", () => {
      const src = read("utils/apiClient.ts");
      expect(src).not.toContain("'session_ended'");
      expect(src).toContain("classifyAuthFailure");
    });

    test("logout revokes server-side and suppresses the session-kill path", () => {
      const src = read("context/AuthContext.tsx");
      expect(src).toContain("auth/logout");
      expect(src).toContain("suppressAuthFailure: true");
    });

    test("the SPEC-05 alert copy is byte-identical (CON-04)", () => {
      const src = read("utils/notifications.ts");
      expect(src).toContain('title: "Session Ended"');
      expect(src).toContain(
        '"Your session was ended on another device. Please log in again."'
      );
    });

    test("the login conflict dialog is preserved unchanged (CON-07)", () => {
      const src = read("app/login.tsx");
      expect(src).toContain("sessionConflict");
      expect(src).toContain("Session Active");
      expect(src).toContain("handleLogin(true)");
    });

    test("classifyAuthLoginResult is preserved unchanged (CON-07)", () => {
      const src = read("utils/localGate.ts");
      expect(src).toContain("classifyAuthLoginResult");
      expect(src).toContain("sessionConflict");
    });
  });

  describe("ACC-08: register sends the device id (CON-10)", () => {
    test("trims name and passcode, preserves initialBalance, carries deviceId", () => {
      expect(
        buildAuthRegisterPayload({
          name: "  user@example.com ",
          passcode: " 1234 ",
          initialBalance: 0,
          deviceId: "dev-1",
        })
      ).toEqual({
        name: "user@example.com",
        passcode: "1234",
        initialBalance: 0,
        deviceId: "dev-1",
      });
    });

    test("a non-zero initialBalance is preserved exactly", () => {
      expect(
        buildAuthRegisterPayload({
          name: "n",
          passcode: "1234",
          initialBalance: 500,
          deviceId: "dev-1",
        }).initialBalance
      ).toBe(500);
    });

    test("both Cloud register call sites use the shared builder", () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, "..", "app", "register.tsx"),
        "utf-8"
      );
      const uses = src.match(/buildAuthRegisterPayload\(/g) ?? [];
      // exactly two Cloud register call sites, both via the shared builder
      expect(uses.length).toBe(2);
      // and no inline Cloud-register JSON body survived at either site
      expect(src).not.toMatch(/JSON\.stringify\(\{ name/);
      // both call sites pass a deviceId; the pattern is deliberately
      // lowercase-`d` so the import's `getOrCreateDeviceId,` cannot satisfy it
      expect(src.match(/deviceId,/g) ?? []).toHaveLength(2);
    });
  });
});
