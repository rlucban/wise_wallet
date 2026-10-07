import type { Category } from "../types";

export type CategorySortMode = "name" | "type" | "recent";

export function sortCategories(categories: Category[], sortBy: CategorySortMode): Category[] {
  const copy = [...categories];
  switch (sortBy) {
    case "type":
      return copy.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    case "recent":
      return copy.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
    case "name":
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}
