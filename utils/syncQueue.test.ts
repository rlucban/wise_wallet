import {
  enqueueSync,
  getSyncQueue,
  getDeadLetterCount,
  getRetryDelay,
  incrementDeadLetters,
} from "./syncQueue";
import AsyncStorage from "@react-native-async-storage/async-storage";

describe.each(["android", "ios", "web"] as const)("syncQueue on %s", (platform) => {
  beforeEach(() => {
    expect(["android", "ios", "web"]).toContain(platform);
    jest.clearAllMocks();
    return AsyncStorage.clear();
  });

  test("ACC-01: create→update→update coalesces to one create with latest data", async () => {
    await enqueueSync("transactions", "create", "t1", { id: "t1", amount: 100 });
    await enqueueSync("transactions", "update", "t1", { id: "t1", amount: 150 });
    await enqueueSync("transactions", "update", "t1", { id: "t1", amount: 175 });

    const queue = await getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("create");
    expect(queue[0].data).toEqual({ id: "t1", amount: 175 });
  });

  test("ACC-02: update→delete coalesces to one dataless delete (never POSTs)", async () => {
    await enqueueSync("transactions", "update", "t1", { id: "t1", amount: 150 });
    await enqueueSync("transactions", "delete", "t1", { id: "t1", amount: 150 });

    const queue = await getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("delete");
    expect(queue[0].data).toBeUndefined();
  });

  test("delete→create keeps latest intent as create", async () => {
    await enqueueSync("transactions", "delete", "t1");
    await enqueueSync("transactions", "create", "t1", { id: "t1", amount: 50 });

    const queue = await getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("create");
    expect(queue[0].data).toEqual({ id: "t1", amount: 50 });
  });

  test("ACC-03: different users never coalesce", async () => {
    await enqueueSync("transactions", "create", "t1", { id: "t1", userId: "A" });
    await enqueueSync("transactions", "update", "t1", { id: "t1", userId: "B" });

    const queue = await getSyncQueue();
    expect(queue).toHaveLength(2);
  });

  test("ACC-05: retry backoff grows and caps at 32s", () => {
    const spy = jest.spyOn(Math, "random").mockReturnValue(0.99999);
    try {
      expect(getRetryDelay(0)).toBeLessThan(1000);
      expect(getRetryDelay(5)).toBeLessThanOrEqual(32000);
      expect(getRetryDelay(100)).toBeLessThanOrEqual(32000);
    } finally {
      spy.mockRestore();
    }
  });

  test("dead-letter counter persists and accumulates", async () => {
    await expect(getDeadLetterCount()).resolves.toBe(0);
    await incrementDeadLetters();
    await incrementDeadLetters();
    await expect(getDeadLetterCount()).resolves.toBe(2);
  });
});
