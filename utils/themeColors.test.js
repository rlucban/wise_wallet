const fs = require("fs");
const path = require("path");

const FILES_TO_CHECK = [
  "app/add-allocation.tsx",
  "app/dues.tsx",
  "app/add-due.tsx",
  "app/savings.tsx",
  "app/category-settings.tsx",
  "app/(tabs)/learning.tsx",
  "app/(tabs)/learning-detail.tsx",
  "components/FinancialTip.tsx",
];

const HARDCODED_COLOR_PATTERNS = [
  /#[0-9a-fA-F]{3,8}/g,
  /\brgb\(/g,
  /\brgba\(/g,
  /\b(white|black|gray|grey|red|green|blue|yellow|orange|purple|pink|brown|cyan|magenta|lime|teal|indigo|violet)\b/gi,
];

const ALLOWED_EXCEPTIONS = [
  "theme.colors.",
  "theme.dark.",
  "theme.light.",
  "DefaultTheme",
  "DarkTheme",
  "transparent",
  "currentColor",
  "inherit",
  "Green", // in comment
  "shadowColor", // React Native shadow property
  "boxShadow", // CSS box-shadow property
];

function hasHardcodedColor(content, _filePath) {
  const violations = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    let hasException = false;
    for (const exc of ALLOWED_EXCEPTIONS) {
      if (line.includes(exc)) {
        hasException = true;
        break;
      }
    }

    if (hasException) return;

    for (const pattern of HARDCODED_COLOR_PATTERNS) {
      const matches = line.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (match === "transparent" || match === "inherit" || match === "currentColor") continue;
          violations.push({ line: index + 1, match });
        }
      }
    }
  });

  return violations;
}

describe("Theme color hardcoded value scan", () => {
  const platforms = ["android", "ios", "web"];

  platforms.forEach((platform) => {
    describe(`Platform: ${platform}`, () => {
      FILES_TO_CHECK.forEach((filePath) => {
        it(`should not contain hardcoded colors in ${filePath} on ${platform}`, () => {
          const fullPath = path.resolve(__dirname, "..", filePath);
          const content = fs.readFileSync(fullPath, "utf-8");
          const violations = hasHardcodedColor(content, filePath);

          if (violations.length > 0) {
            const details = violations
              .map((v) => `  Line ${v.line}: "${v.match}"`)
              .join("\n");
            throw new Error(
              `Found hardcoded color(s) in ${filePath} (${platform}):\n${details}`
            );
          }
        });
      });
    });
  });
});