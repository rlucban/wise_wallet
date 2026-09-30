// SPEC-35 D-02 — unauthenticated full device reset (login screen only).
// Local-only: never calls the API. Preserves localDeviceId,
// system_reset_epoch (hardResetLocalData), and user export files.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { hardResetLocalData, getUsers } from "./db";
import { removeSecureItem } from "./secureStorage";
import { clearSessionCaches } from "./cache";
import { collectReceiptFiles } from "./accountDelete";
import { getItem } from "./storage";

export interface DeviceResetResult {
  deletedFiles: number;
}

export async function resetDeviceData(): Promise<DeviceResetResult> {
  // Collect receipt refs across ALL device users BEFORE the wipe (keys are
  // gone afterwards and names are unknown up front).
  const files = new Set<string>();
  try {
    const users = await getUsers();
    const docDir = FileSystem.documentDirectory ?? null;
    for (const u of users) {
      const id = String((u as Record<string, unknown>)["id"] ?? "");
      if (!id) continue;
      const txs = await getItem<Array<Record<string, unknown>>>(
        `user_${id}_transactions`,
        []
      );
      for (const f of collectReceiptFiles(
        txs.map((t) => ({
          id: String(t["id"] ?? ""),
          receiptUrl:
            typeof t["receiptUrl"] === "string"
              ? (t["receiptUrl"] as string)
              : undefined,
        })),
        docDir
      )) {
        files.add(f);
      }
    }
  } catch (e) {
    console.error("Reset receipt collection failed:", e);
  }

  // hardResetLocalData spares only system_reset_epoch — snapshot and
  // restore the device identity (CON-02 preserve list).
  let preservedDeviceId: string | null = null;
  try {
    preservedDeviceId = await AsyncStorage.getItem("localDeviceId");
  } catch {
    preservedDeviceId = null;
  }

  await hardResetLocalData();
  await removeSecureItem("authToken");
  clearSessionCaches();

  if (preservedDeviceId) {
    try {
      await AsyncStorage.setItem("localDeviceId", preservedDeviceId);
    } catch (e) {
      console.error("Reset device-id restore failed:", e);
    }
  }

  let deletedFiles = 0;
  for (const f of files) {
    try {
      await FileSystem.deleteAsync(f, { idempotent: true });
      deletedFiles++;
    } catch {
      // best-effort per file; one missing file never aborts the reset
    }
  }
  return { deletedFiles };
}
