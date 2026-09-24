import * as fs from "fs";
import * as path from "path";

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

import { fieldLabel, readOnlyInputProps } from "./formInput";

const SCREEN_FILES = [
  "app/add-transaction.tsx",
  "app/edit-transaction.tsx",
  "app/add-due.tsx",
  "app/dues.tsx",
  "app/add-allocation.tsx",
  "app/savings.tsx",
  "app/onboarding.tsx",
  "app/category-settings.tsx",
  "app/payment-methods.tsx",
  "app/(tabs)/settings.tsx",
];

function extractTextInputTags(src: string): string[] {
  const tags: string[] = [];
  const re = /<TextInput(?=[\s/>])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    let i = m.index + m[0].length;
    let depth = 0;
    let inStr: string | null = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (inStr !== null) {
        if (c === inStr && src[i - 1] !== "\\") inStr = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        inStr = c;
        continue;
      }
      if (c === "{") {
        depth++;
        continue;
      }
      if (c === "}") {
        depth--;
        continue;
      }
      if (depth === 0 && c === "/" && src[i + 1] === ">") {
        tags.push(src.slice(m.index, i + 2));
        re.lastIndex = i + 2;
        break;
      }
      if (depth === 0 && c === ">") {
        tags.push(src.slice(m.index, i + 1));
        re.lastIndex = i + 1;
        break;
      }
    }
  }
  return tags;
}

describe("readOnlyInputProps", () => {
  it.each(["android", "ios", "web"] as const)(
    "ACC-01: Platform.OS=%s returns non-focusable read-only props",
    (os) => {
      mockOS = os;
      const props = readOnlyInputProps();
      expect(props.editable).toBe(false);
      expect(props.caretHidden).toBe(true);
      if (os === "web") {
        expect(props.tabIndex).toBe(-1);
      } else {
        expect(props.tabIndex).toBeUndefined();
      }
    }
  );
});

describe("fieldLabel", () => {
  it("ACC-02: matches the normative shared label style", () => {
    expect(fieldLabel).toEqual({
      color: "#666",
      fontSize: 13,
      fontWeight: "600",
      marginTop: 4,
      marginBottom: 6,
    });
  });
});

describe("TextInput label source audit", () => {
  it("ACC-03: no TextInput on migration screens carries a label prop", () => {
    const violations: string[] = [];
    for (const rel of SCREEN_FILES) {
      const file = path.join(__dirname, "..", rel);
      const src = fs.readFileSync(file, "utf8");
      for (const tag of extractTextInputTags(src)) {
        if (/\blabel\s*=/.test(tag)) {
          const labelMatch = tag.match(/label\s*=\s*"([^"]*)"/);
          violations.push(
            `${rel}: <TextInput label="${labelMatch ? labelMatch[1] : "?"}">`
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
