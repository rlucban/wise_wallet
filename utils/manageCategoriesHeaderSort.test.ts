import * as fs from "fs";
import * as path from "path";
import { sortCategories } from "./categorySort";

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

const SCREEN = "app/category-settings.tsx";
const HELPER = "utils/categorySort.ts";
const HELPER_TEST = "utils/categorySort.test.ts";

const base = [
    { id: "1", name: "Zeta", type: "expense" as const, updatedAt: 1 },
    { id: "2", name: "Alpha", type: "income" as const, updatedAt: 3 },
    { id: "3", name: "Beta", type: "expense" as const, updatedAt: 2 },
];

function runSuite(os: "android" | "ios" | "web") {
    describe(`manage categories header sort on ${os}`, () => {
        beforeEach(() => {
            mockOS = os;
        });

        it("ACC-01: exactly one SegmentedButtons (filter); sort row gone", () => {
            const source = readRepo(SCREEN);
            const hits = source.match(/<SegmentedButtons/g) ?? [];
            expect(hits.length).toBe(1);
            expect(source).not.toContain("value={sortBy}");
            expect(source).toContain("value={type}");
        });

        it("ACC-07: backward compat — two-arg calls unchanged, type/recent ignore dir", () => {
            expect(sortCategories(base, "name").map((c) => c.name)).toEqual(["Alpha", "Beta", "Zeta"]);
            expect(sortCategories(base, "name", "asc").map((c) => c.name)).toEqual(["Alpha", "Beta", "Zeta"]);
            expect(sortCategories(base, "name", "desc").map((c) => c.name)).toEqual(["Zeta", "Beta", "Alpha"]);
            expect(sortCategories(base, "type", "desc").map((c) => c.name)).toEqual(["Beta", "Zeta", "Alpha"]);
            expect(sortCategories(base, "recent", "desc").map((c) => c.name)).toEqual(["Alpha", "Beta", "Zeta"]);
        });

        it("ACC-08 (v1.2): direction-only menu; no mode state; literal name call-site", () => {
            const source = readRepo(SCREEN);
            expect(source).toContain("<Appbar.Action");
            expect(source).toContain('icon="sort"');
            expect(source).toContain('accessibilityLabel="Sort by"');
            const items = source.match(/<Menu\.Item/g) ?? [];
            expect(items.length).toBe(2);
            expect(source).toContain('title="A-Z"');
            expect(source).toContain('title="Z-A"');
            expect(source).toContain('leadingIcon="arrow-down"');
            expect(source).toContain('leadingIcon="arrow-up"');
            expect(source).toContain('trailingIcon={sortDir === "asc" ? "check" : undefined}');
            expect(source).toContain('trailingIcon={sortDir === "desc" ? "check" : undefined}');
            expect(source).not.toContain('title="Type"');
            expect(source).not.toContain('title="Recent"');
            expect(source).not.toContain("Name A-Z");
            expect(source).not.toContain("Name Z-A");
            expect(source).not.toContain("sortBy");
            expect(source).not.toContain("setSortBy");
            expect(source).not.toContain("CategorySortMode");
            expect(source).toContain('useState<CategorySortDirection>("asc")');
            expect(source).toContain(
                'sortCategories(normalizedCategories.filter((c) => c.type === type), "name", sortDir)'
            );
        });

        it("ACC-09 (v1.2): direction mapping pairs close the menu; zero footprint", () => {
            const source = readRepo(SCREEN);
            expect(source).toMatch(/setSortDir\("asc"\);\s+setMenuVisible\(false\)/);
            expect(source).toMatch(/setSortDir\("desc"\);\s+setMenuVisible\(false\)/);
            expect(source).not.toContain("authFetch");
            expect(source).not.toContain("AsyncStorage");
            expect(source).not.toContain("router.push");
        });

        it("ACC-10 (v1.2): helper and its tests byte-identical to v1.1", () => {
            const helper = readRepo(HELPER);
            expect(helper).toContain('dir: CategorySortDirection = "asc"');
            expect(helper).toContain('return dir === "desc" ? ordered.reverse() : ordered;');
            const stripped = helper.replace(/CategorySortDirection/g, "");
            const dirRefs = stripped.match(/\bdir\b/g) ?? [];
            expect(dirRefs.length).toBe(2);
            const helperTest = readRepo(HELPER_TEST);
            expect(helperTest).toContain('sortCategories(base, "name")');
            expect(helperTest).toContain('sortCategories(base, "type")');
            expect(helperTest).toContain('sortCategories(base, "recent")');
        });
    });
}

runSuite("android");
runSuite("ios");
runSuite("web");
