import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "completedArticles";

export async function getCompletedArticles(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function setArticleCompleted(id: string, completed: boolean): Promise<void> {
  const list = await getCompletedArticles();
  const next = completed
    ? Array.from(new Set([...list, id]))
    : list.filter((x) => x !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
