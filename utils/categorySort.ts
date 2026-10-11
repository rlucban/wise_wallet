import type { Category } from "../types";

export type CategorySortMode = "name" | "type" | "recent";

export type CategorySortDirection = "asc" | "desc";

export function sortCategories(
  categories: Category[],
  sortBy: CategorySortMode,
  dir: CategorySortDirection = "asc"
): Category[] {
  const copy = [...categories];
  switch (sortBy) {
    case "type":
      return copy.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    case "recent":
      return copy.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
    case "name":
    default: {
      const ordered = copy.sort((a, b) => a.name.localeCompare(b.name));
      return dir === "desc" ? ordered.reverse() : ordered;
    }
  }
}
