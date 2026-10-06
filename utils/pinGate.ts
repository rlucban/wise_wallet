import * as Crypto from "expo-crypto";

// SPEC-51 D-51-04: converged local PIN compare for the Settings gates.
// Same SHA256 call as `addUser`/`updateUserPasscode` (`utils/db.ts`);
// accepts legacy plaintext rows (parity with Delete Account's
// `verifyAccountPin`). `digest` is injectable so jest can unit-test
// without the native crypto module.
export async function verifyLocalPin(
  pin: string,
  storedPasscode: unknown,
  digest: (p: string) => Promise<string> = (p) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, p)
): Promise<boolean> {
  const clean = pin.trim();
  if (!/^\d{4}$/.test(clean)) return false;
  if (typeof storedPasscode !== "string" || storedPasscode.length === 0) return false;
  if (storedPasscode === clean) return true; // legacy plaintext row
  return (await digest(clean)) === storedPasscode;
}
