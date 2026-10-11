import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a standard UUID v4 string.
 * Used for creating unique IDs locally that are compatible with Postgres/Supabase UUID types.
 */
export const generateUUID = (): string => {
  return uuidv4();
};

/**
 * SPEC-82 wire rule: the server stores category ids in a Postgres UUID
 * column, so only UUID-shaped ids may be posted. Anything else (nil,
 * blank, client sentinels like "scheduled"/"uncategorized", titles,
 * numeric fallbacks) maps to null, which the server accepts.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const toApiCategoryId = (id: string | null | undefined): string | null => {
  if (typeof id !== "string" || id.length === 0) return null;
  return UUID_PATTERN.test(id) ? id : null;
};
