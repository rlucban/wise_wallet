import * as SecureStore from "expo-secure-store";
import { setSecureItem, getSecureItem, removeSecureItem } from "./secureStorage";

// SPEC-58 D-58-02: `expo-secure-store`'s web build is literally
// `export default {}` — no isAvailableAsync, no setItemAsync. Mock every method
// to throw, so any SecureStore touch fails loudly and the test proves web
// routes through AsyncStorage only. The mock is inlined in the factory because
// jest hoists jest.mock above const declarations — referencing an outer const
// would hit the temporal dead zone.
jest.mock("expo-secure-store", () => ({
  isAvailableAsync: jest.fn(async () => { throw new Error("SecureStore unavailable"); }),
  setItemAsync: jest.fn(async () => { throw new Error("SecureStore unavailable"); }),
  getItemAsync: jest.fn(async () => { throw new Error("SecureStore unavailable"); }),
  deleteItemAsync: jest.fn(async () => { throw new Error("SecureStore unavailable"); }),
}));

let mockOS: "android" | "ios" | "web" = "web";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

const KEY = "user_test-passcode";
const HASH = "a".repeat(64);

function runSuite(os: "android" | "ios" | "web"): void {
  describe(`SPEC-58 secureStorage on ${os}`, () => {
    beforeEach(() => {
      mockOS = os;
      jest.clearAllMocks();
    });

    it("round-trips the lock hash", async () => {
      await setSecureItem(KEY, HASH);
      await expect(getSecureItem(KEY)).resolves.toBe(HASH);
    });

    it("removes the lock hash", async () => {
      await setSecureItem(KEY, HASH);
      await removeSecureItem(KEY);
      await expect(getSecureItem(KEY)).resolves.toBeNull();
    });

    if (os === "web") {
      it("never touches SecureStore on web", async () => {
        await setSecureItem(KEY, HASH);
        await getSecureItem(KEY);
        await removeSecureItem(KEY);
        expect(SecureStore.isAvailableAsync).not.toHaveBeenCalled();
        expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
        expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
        expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
      });
    }
  });
}

runSuite("android");
runSuite("ios");
runSuite("web");
