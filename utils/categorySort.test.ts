import { sortCategories } from "./categorySort";

const base = [
  { id: "1", name: "Zeta", type: "expense" as const, updatedAt: 1 },
  { id: "2", name: "Alpha", type: "income" as const, updatedAt: 3 },
  { id: "3", name: "Beta", type: "expense" as const, updatedAt: 2 },
];

describe("sortCategories", () => {
  it("sorts by name", () => {
    expect(sortCategories(base, "name").map((c) => c.name)).toEqual(["Alpha", "Beta", "Zeta"]);
  });

  it("sorts by type then name", () => {
    expect(sortCategories(base, "type").map((c) => c.name)).toEqual(["Beta", "Zeta", "Alpha"]);
  });

  it("sorts by recent updatedAt", () => {
    expect(sortCategories(base, "recent").map((c) => c.name)).toEqual(["Alpha", "Beta", "Zeta"]);
  });
});
