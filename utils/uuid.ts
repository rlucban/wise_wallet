import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a standard UUID v4 string.
 * Used for creating unique IDs locally that are compatible with Postgres/Supabase UUID types.
 */
export const generateUUID = (): string => {
  return uuidv4();
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * True when `id` is UUID-shaped. Server transaction routes cast the id to
 * UUID (SPEC-45 v1.1: `invalid input syntax for type uuid: "9"`), so legacy
 * non-UUID ids can never be PUT/DELETEd — callers MUST quarantine, not call.
 * Pure: no react-native imports.
 */
export const isUUID = (id: unknown): boolean =>
  typeof id === "string" && UUID_RE.test(id);

/**
 * Explainer shown for quarantined legacy rows (SPEC-45 v1.1 OD-45B a).
 * Co-located with the verdict so copy cannot drift between callers.
 */
export const LEGACY_NON_UUID_MESSAGE =
  "This entry can't be edited or deleted from the app — it needs a backend repair. Your data is safe.";
