let cachedUserId: string | null = null;
const settingsCache = new Map<string, string | null>();

export function getCachedUserId(): string | null {
  return cachedUserId;
}

export function setCachedUserId(id: string | null): void {
  cachedUserId = id;
}

export function getCachedSetting(key: string): string | null | undefined {
  return settingsCache.get(key);
}

export function setCachedSetting(key: string, value: string | null): void {
  if (value === null) {
    settingsCache.delete(key);
  } else {
    settingsCache.set(key, value);
  }
}

export function clearSettingsCache(): void {
  settingsCache.clear();
}
