// SPEC-32 ACC-01..03 — keyboard-visibility static scans (like themeColors.test.js).
const fs = require("fs");
const path = require("path");

// D-01 audit list: every screen holding a TextInput must render a keyboard
// avoidance wrapper (KeyboardAvoidingView directly, or the approved shared
// components/KeyboardAwareDialog for Dialog/Modal content).
const FILES_WITH_INPUTS = [
  "app/(tabs)/settings.tsx",
  "app/passcode-screen.tsx",
  "app/login.tsx",
  "app/register.tsx",
  "app/onboarding.tsx",
  "app/add-transaction.tsx",
  "app/edit-transaction.tsx",
  "app/add-due.tsx",
  "app/add-allocation.tsx",
  "app/dues.tsx",
  "app/savings.tsx",
  "app/category-settings.tsx",
  "app/payment-methods.tsx",
  "app/(tabs)/learning.tsx",
];

const AVOIDANCE_MARKERS = ["KeyboardAvoidingView", "KeyboardAwareDialog"];

function readFile(filePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", filePath), "utf-8");
}

describe("SPEC-32 keyboard visibility scans", () => {
  ["android", "ios", "web"].forEach((platform) => {
    describe(`Platform: ${platform}`, () => {
      it("ACC-01: every input screen renders a keyboard avoidance wrapper", () => {
        const missing = FILES_WITH_INPUTS.filter((filePath) => {
          const content = readFile(filePath);
          return !AVOIDANCE_MARKERS.some((m) => content.includes(m));
        });
        if (missing.length > 0) {
          throw new Error(
            `Missing keyboard avoidance wrapper (${platform}) in:\n  ${missing.join("\n  ")}`
          );
        }
      });

      it("ACC-02: every ScrollView tag keeps keyboardShouldPersistTaps", () => {
        const violations = [];
        FILES_WITH_INPUTS.forEach((filePath) => {
          const content = readFile(filePath);
          const tags = content.match(/<ScrollView[\s\S]*?>/g) || [];
          tags.forEach((tag) => {
            if (!tag.includes("keyboardShouldPersistTaps")) {
              violations.push(`${filePath}: ${tag.slice(0, 80)}...`);
            }
          });
        });
        if (violations.length > 0) {
          throw new Error(
            `ScrollView without keyboardShouldPersistTaps (${platform}):\n  ${violations.join("\n  ")}`
          );
        }
      });

      it("ACC-03: no new keyboard native dependency", () => {
        const pkg = JSON.parse(
          fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf-8")
        );
        const deps = Object.keys(pkg.dependencies || {}).concat(
          Object.keys(pkg.devDependencies || {})
        );
        const offenders = deps.filter((d) => /keyboard/i.test(d));
        expect(offenders).toEqual([]);

        // The approved shared wrapper (components/KeyboardAwareDialog) is a
        // local built-ins-only component, not a third-party package.
        const importerViolations = FILES_WITH_INPUTS.filter((filePath) => {
          const content = readFile(filePath);
          return (
            /from ["']react-native-keyboard/i.test(content) ||
            /require\(["']react-native-keyboard/i.test(content) ||
            /keyboard-aware-scroll-view/i.test(content)
          );
        });
        if (importerViolations.length > 0) {
          throw new Error(
            `Third-party keyboard import (${platform}) in:\n  ${importerViolations.join("\n  ")}`
          );
        }
      });
    });
  });
});
