import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a standard UUID v4 string.
 * Used for creating unique IDs locally that are compatible with Postgres/Supabase UUID types.
 */
export const generateUUID = (): string => {
  return uuidv4();
};
