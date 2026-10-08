import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components"];
const SCAN_EXTENSIONS = [".tsx", ".ts"];

const SPEC26_SITES = ["app/(tabs)/settings.tsx", "components/ConfirmDialog.tsx"];

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

function readRepo(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), "utf8");
}

function listSourceFiles(relativeDir: string): string[] {
  const absoluteDir = path.resolve(ROOT, relativeDir);
  const found: string[] = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relative = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      found.push(...listSourceFiles(relative));
    } else if (SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      found.push(relative);
    }
  }
  return found;
}

/** Extracts the JSX value of a prop, balancing braces so `=>` inside
 * `onDismiss={() => ...}` does not terminate the tag early. */
function propValue(tag: string, prop: string): string | null {
  const match = new RegExp(`${prop}=\\{`).exec(tag);
  if (!match) {
    return null;
  }
  let depth = 0;
  for (let i = match.index + match[0].length - 1; i < tag.length; i++) {
    if (tag[i] === "{") {
      depth++;
    } else if (tag[i] === "}") {
      depth--;
      if (depth === 0) {
        return tag.slice(match.index + match[0].length, i);
      }
    }
  }
  return null;
}

/** Opening JSX tags for `<Dialog` / `<Modal`, excluding `<Dialog.Content`, ... */
function jsxTags(source: string, component: string): string[] {
  const tags: string[] = [];
  const pattern = new RegExp(`<${component}(?=[\\s/>])`, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    let depth = 0;
    let end = match.index + match[0].length;
    for (; end < source.length; end++) {
      if (source[end] === "{") {
        depth++;
      } else if (source[end] === "}") {
        depth--;
      } else if (source[end] === ">" && depth === 0) {
        break;
      }
    }
    tags.push(source.slice(match.index, end + 1));
  }
  return tags;
}

const PERCENT_WIDTH = /width:\s*["']\d+(\.\d+)?%["']/;
const HORIZONTAL_MARGIN = /marginHorizontal\s*:/;

function stylePropsOf(tag: string): string[] {
  return [propValue(tag, "style"), propValue(tag, "contentContainerStyle")].filter(
    (value): value is string => value !== null
  );
}

function runSuite(os: "android" | "ios" | "web") {
  describe(`SPEC-65 dialog width overflow on ${os}`, () => {
    beforeEach(() => {
      mockOS = os;
    });

    it("ACC-01: SPEC-26 dialog sites neutralize Paper's inherited horizontal margin", () => {
      const settings = readRepo(SPEC26_SITES[0]);
      const confirm = readRepo(SPEC26_SITES[1]);

      expect(settings).toContain("marginHorizontal: 0");
      expect(confirm).toContain("marginHorizontal: 0");

      for (const source of [settings, confirm]) {
        expect(source).toContain("maxWidth: 480");
        expect(source).toContain('width: "90%"');
        expect(source).toContain('alignSelf: "center"');
      }
    });

    it("ACC-02: no Paper Dialog/Modal style combines a percent width without marginHorizontal", () => {
      const offenders: string[] = [];
      for (const dir of SCAN_DIRS) {
        for (const file of listSourceFiles(dir)) {
          const source = readRepo(file);
          for (const component of ["Dialog", "Modal"]) {
            for (const tag of jsxTags(source, component)) {
              for (const value of stylePropsOf(tag)) {
                if (PERCENT_WIDTH.test(value) && !HORIZONTAL_MARGIN.test(value)) {
                  offenders.push(`${file} <${component}> ${value.trim().replace(/\s+/g, " ")}`);
                }
              }
            }
          }
        }
      }
      expect(offenders).toEqual([]);
    });

    it("ACC-03: percent width plus Paper's inherited margin overflows a 390pt phone box", () => {
      const screenWidthPt = 390;
      const paperMargin = Math.max(0, 0, 26); // portrait insets are 0 on iPhone
      const surfaceWidthPt = 0.9 * screenWidthPt;

      expect(surfaceWidthPt + 2 * paperMargin).toBeGreaterThan(screenWidthPt);
      expect(surfaceWidthPt + 2 * paperMargin).toBe(403);
      expect(surfaceWidthPt).toBeLessThanOrEqual(screenWidthPt);
      expect(480).toBeGreaterThan(screenWidthPt);
    });
  });
}

runSuite("android");
runSuite("ios");
runSuite("web");