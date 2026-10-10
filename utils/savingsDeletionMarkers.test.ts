import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDeletedIds,
  markDeleted,
  clearDeleted,
  getSeenRemoteIds,
  setSeenRemoteIds,
} from "./savingsDeletionMarkers";

const platforms = ["android", "ios", "web"] as const;

describe.each(platforms)("savingsDeletionMarkers (Platform.OS=%s)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("ACC-01: tombstones persist under user_<id>_savings_tombstones", async () => {
    await markDeleted("u1", "s1", 123);
    const raw = await AsyncStorage.getItem("user_u1_savings_tombstones");
    expect(JSON.parse(raw || "{}")).toEqual({ s1: 123 });
    expect(await getDeletedIds("u1")).toEqual({ s1: 123 });
  });

  it("ACC-01: default marker timestamp is a number", async () => {
    await markDeleted("u1", "s2");
    const map = await getDeletedIds("u1");
    expect(typeof map["s2"]).toBe("number");
  });

  it("ACC-01: clearDeleted removes only the named ids", async () => {
    await markDeleted("u1", "a", 1);
    await markDeleted("u1", "b", 2);
    await clearDeleted("u1", ["a"]);
    expect(await getDeletedIds("u1")).toEqual({ b: 2 });
  });

  it("ACC-01: clearDeleted with no ids is a no-op", async () => {
    await markDeleted("u1", "a", 1);
    await clearDeleted("u1", []);
    expect(await getDeletedIds("u1")).toEqual({ a: 1 });
  });

  it("ACC-01: seen-remote snapshot round-trips under user_<id>_savings_seen_remote_ids", async () => {
    await setSeenRemoteIds("u1", ["x", "y"]);
    expect(await getSeenRemoteIds("u1")).toEqual(["x", "y"]);
    const raw = await AsyncStorage.getItem("user_u1_savings_seen_remote_ids");
    expect(JSON.parse(raw || "[]")).toEqual(["x", "y"]);
  });

  it("ACC-01: markers are isolated per user", async () => {
    await markDeleted("u1", "a", 1);
    await setSeenRemoteIds("u1", ["a"]);
    expect(await getDeletedIds("u2")).toEqual({});
    expect(await getSeenRemoteIds("u2")).toEqual([]);
  });

  it("ACC-01: empty ids are ignored", async () => {
    await markDeleted("", "a", 1);
    await markDeleted("u1", "", 1);
    expect(await getDeletedIds("u1")).toEqual({});
  });
});
