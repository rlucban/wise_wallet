import * as fs from "fs";
import * as path from "path";

function readRepo(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

let mockOS: "android" | "ios" | "web" = "ios";

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockOS;
    },
  },
}));

function count(src: string, re: RegExp): number {
  return (src.match(re) || []).length;
}

function runSuite(os: "android" | "ios" | "web") {
  describe(`allocation archive guards on ${os}`, () => {
    beforeEach(() => {
      mockOS = os;
    });

    it("G1: archive action persists via updateItem with isArchived:true", () => {
      const src = readRepo("app/savings.tsx");
      expect(count(src, /await updateItem\(id, \{ isArchived: true \}\);/g)).toBe(1);
      expect(src).toContain('setFeedback({ title: "Success", message: "Allocation archived", severity: "success" })');
    });

    it("G2: restore action persists via updateItem with isArchived:false", () => {
      const src = readRepo("app/archived-allocations.tsx");
      expect(count(src, /await updateItem\(id, \{ isArchived: false \}\);/g)).toBe(1);
    });

    it("G3: active vs archived lists partition on isArchived", () => {
      expect(readRepo("app/savings.tsx")).toContain("items.filter((item) => !item.isArchived)");
      expect(readRepo("app/archived-allocations.tsx")).toContain("items.filter((item) => !!item.isArchived)");
    });

    it("G4: updateItem merges optimistically on both web and native paths", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(
        count(src, /setItems\(\(prev\) => prev\.map\(\(g\) => \(g\.id === id \? \{ \.\.\.g, \.\.\.updates \} : g\)\)\);/g)
      ).toBe(2);
    });

    it("G5 (SPEC-73 CON-06): updateItem rethrows after logging — failures surface, no false success toast", () => {
      const src = readRepo("hooks/useSavings.ts");
      const updateBlock = src.slice(src.indexOf("const updateItem"));
      expect(updateBlock).toMatch(
        /catch \(error\) \{\s*console\.error\("Error updating savings item:", error\);\s*throw error;\s*\}/
      );
    });

    it("G6 (SPEC-73 CON-04 / SPEC-77 CON-07): updateItem syncs a full record and advances updatedAt", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(src).not.toContain("body: JSON.stringify({ ...updates, userId: activeUserId })");
      expect(src).not.toContain("const syncData = { ...updates, userId: activeUserId };");
      expect(src).not.toContain("updatedAt: current?.updatedAt || nowTimestamp()");
      expect(src).not.toContain("updatedAt: existing?.updatedAt || nowTimestamp()");
      expect(count(src, /const stamp = nowTimestamp\(\);/g)).toBe(1);
      expect(count(src, /updatedAt: stamp/g)).toBe(2);
    });

    it("G7 (SPEC-73 CON-06): syncProcessor surfaces savingsItems 400/404 instead of silent dequeue", () => {
      const src = readRepo("utils/syncProcessor.ts");
      expect(count(src, /item\.entity === 'savingsItems'/g)).toBe(2);
      expect(
        count(src, /return \{ success: false, error: apiResult\.error \|\| `HTTP \$\{apiResult\.status\}` \};/g)
      ).toBeGreaterThanOrEqual(2);
      expect(count(src, /return \{ success: true \};/g)).toBeGreaterThanOrEqual(2); // other entities keep dequeue-on-400/404
    });

    it("G8 (SPEC-73 CON-05): native LWW merge preserves local isArchived / target_amount the remote omits", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(count(src, /remoteItem\.isArchived === undefined/g)).toBe(1);
      expect(count(src, /remoteItem\.target_amount === undefined/g)).toBe(1);
    });

    it("G9 (SPEC-73 CON-05): web refetch applies the field-union guard — no verbatim state replace", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(src).not.toContain("setItems(remoteData);");
      expect(count(src, /remote\.isArchived === undefined \? local\.isArchived/g)).toBe(1);
      expect(count(src, /remote\.target_amount === undefined \? local\.target_amount/g)).toBe(1);
      expect(src).toContain("setItems(guarded);");
    });

    it("G10 (SPEC-74 CON-01): add/update/delete write through itemsRef + _savingsCache", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(count(src, /_savingsCache = \{ userId: activeUserId, items: itemsRef\.current \};/g)).toBe(6);
      expect(count(src, /itemsRef\.current = \[\.\.\.itemsRef\.current, newItem\];/g)).toBe(2);
      expect(count(src, /itemsRef\.current = itemsRef\.current\.map/g)).toBe(2);
      expect(count(src, /itemsRef\.current = itemsRef\.current\.filter/g)).toBe(2);
    });

    it("G11 (SPEC-75 ACC-01/ACC-02): module notifier re-seeds mounted instances from the shared cache", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(count(src, /notifySavingsCacheChanged\(\);/g)).toBe(6);
      expect(count(src, /const _savingsCacheListeners = new Set<\(\) => void>\(\);/g)).toBe(1);
      expect(count(src, /_savingsCacheListeners\.forEach\(\(l\) => l\(\)\);/g)).toBe(1);
      expect(count(src, /_savingsCacheListeners\.add\(listener\);/g)).toBe(1);
      expect(count(src, /_savingsCacheListeners\.delete\(listener\);/g)).toBe(1);
      expect(src).toMatch(
        /if \(_savingsCache\?\.userId === activeUserId\) \{\s*itemsRef\.current = _savingsCache\.items;\s*setItems\(_savingsCache\.items\);\s*\}/
      );
    });

    it("G12 (SPEC-76 ACC-01): deleteItem rethrows after logging — failures surface, no false success", () => {
      const src = readRepo("hooks/useSavings.ts");
      const deleteBlock = src.slice(src.indexOf("const deleteItem"));
      expect(deleteBlock).toMatch(
        /catch \(error\) \{\s*console\.error\("Error deleting savings item:", error\);\s*throw error;\s*\}/
      );
    });

    it("G13 (SPEC-76 ACC-02/ACC-03): Savings screen reports delete + archive via feedback dialog (no Snackbar)", () => {
      const src = readRepo("app/savings.tsx");
      const confirmBlock = src.slice(src.indexOf("const confirmDelete"), src.indexOf("const handleArchiveItem"));
      expect(confirmBlock).not.toContain("setToastMessage");
      expect(confirmBlock).toContain('setFeedback({ title: "Success", message: "Allocation deleted", severity: "success" })');
      expect(confirmBlock).toContain('setFeedback({ title: "Error", message: "Failed to delete allocation. Please try again.", severity: "error" })');
      const archiveStart = src.indexOf("const handleArchiveItem");
      const archiveBlock = src.slice(archiveStart, src.indexOf("return (", archiveStart));
      expect(archiveBlock).not.toContain("setToastMessage");
      expect(archiveBlock).toContain('setFeedback({ title: "Success", message: "Allocation archived", severity: "success" })');
      expect(archiveBlock).toContain('setFeedback({ title: "Error", message: "Failed to archive allocation.", severity: "error" })');
    });

    it("G14 (SPEC-76 ACC-04/ACC-05): Archived screen reports delete + restore via feedback dialog; Snackbar removed", () => {
      const src = readRepo("app/archived-allocations.tsx");
      expect(src).not.toContain("Archived allocation deleted permanently");
      expect(src).not.toContain("<Snackbar");
      expect(src).not.toContain("setToastMessage");
      const restoreBlock = src.slice(src.indexOf("const handleRestoreItem"), src.indexOf("const handleDelete"));
      expect(restoreBlock).toContain('setFeedback({ title: "Success", message: "Allocation restored", severity: "success" })');
      expect(restoreBlock).toContain('setFeedback({ title: "Error", message: "Failed to restore allocation.", severity: "error" })');
      const deleteStart = src.indexOf("const confirmDelete");
      const deleteBlock = src.slice(deleteStart, src.indexOf("return (", deleteStart));
      expect(deleteBlock).toContain('setFeedback({ title: "Success", message: "Allocation deleted", severity: "success" })');
      expect(deleteBlock).toContain('setFeedback({ title: "Error", message: "Failed to delete allocation. Please try again.", severity: "error" })');
    });

    it("G15 (SPEC-76 ACC-06): no blocking Alert.alert failure calls for delete/archive/restore", () => {
      const re = /Alert\.alert\(\s*"Error",\s*"Failed to (delete|archive|restore) allocation/;
      expect(readRepo("app/savings.tsx")).not.toMatch(re);
      expect(readRepo("app/archived-allocations.tsx")).not.toMatch(re);
    });

    it("G16 (SPEC-76 ACC-07/ACC-08): ConfirmDialog gains additive hideCancel/confirmColor; feedback dialogs wired", () => {
      const dialog = readRepo("components/ConfirmDialog.tsx");
      expect(dialog).toMatch(/hideCancel = false/);
      expect(dialog).toMatch(/confirmColor \?\? theme\.colors\.error/);
      expect(dialog).toContain("!hideCancel &&");
      expect(dialog).toContain("marginHorizontal: 0");
      expect(dialog).toContain("maxWidth: 480");
      expect(dialog).toContain('width: "90%"');
      expect(dialog).toContain('alignSelf: "center"');
      for (const file of ["app/savings.tsx", "app/archived-allocations.tsx"]) {
        const src = readRepo(file);
        expect(src).toContain('confirmLabel="OK"');
        expect(src).toContain("hideCancel");
        expect(src).toContain('severity === "error" ? "alert-circle-outline" : "check-circle-outline"');
      }
    });

    it("G17 (SPEC-77 ACC-02): native deleteItem records a tombstone, guarded on activeUserId", () => {
      const src = readRepo("hooks/useSavings.ts");
      const deleteBlock = src.slice(src.indexOf("const deleteItem"));
      expect(deleteBlock).toContain("if (!isLocal && activeUserId) {");
      expect(deleteBlock).toContain("await markDeleted(activeUserId, id);");
    });

    it("G18 (SPEC-77 ACC-03): remotely deleted local item is pruned, not re-created", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(src).toContain("const seenRemoteIds = new Set(await getSeenRemoteIds(activeUserId));");
      expect(src).toMatch(
        /if \(seenRemoteIds\.has\(localItem\.id\)\) \{\s*await repos\.savingsItems\.deleteById\(localItem\.id\);\s*continue;\s*\}/
      );
    });

    it("G19 (SPEC-77 ACC-04): tombstoned remote rows are skipped and a delete is (re-)enqueued", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(src).toContain("const deleted = await getDeletedIds(activeUserId);");
      expect(src).toMatch(
        /if \(deleted\[remoteItem\.id\] !== undefined\) \{\s*tombstonedRemoteIds\.push\(remoteItem\.id\);\s*continue;\s*\}/
      );
      expect(src).toContain("await enqueueAndTrigger('savingsItems', 'delete', tombstonedId);");
    });

    it("G20 (SPEC-77 ACC-05): a never-synced local item keeps the legacy create path", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(src).toMatch(
        /if \(!remoteTitleMap\.has\(localItem\.title\.toLowerCase\(\)\)\) \{\s*mergedMap\.set\(localItem\.id, localItem\);\s*await enqueueAndTrigger\('savingsItems', 'create', localItem\.id, localItem as unknown as Record<string, unknown>\);\s*\}/
      );
    });

    it("G21 (SPEC-77 ACC-06): seen-remote snapshot refreshed and confirmed tombstones cleared", () => {
      const src = readRepo("hooks/useSavings.ts");
      expect(src).toContain("await setSeenRemoteIds(activeUserId, remoteData.map(g => g.id));");
      expect(src).toContain("await clearDeleted(activeUserId, Object.keys(deleted).filter((id) => !remoteIdSet.has(id)));");
    });

    it("G22 (SPEC-77 ACC-08): markers util depends only on ./storage (no new dependency)", () => {
      const src = readRepo("utils/savingsDeletionMarkers.ts");
      const imports = (src.match(/^import .*$/gm) || []).join("\n");
      expect(imports).toContain('from "./storage"');
      expect(imports).not.toMatch(/expo-|react-native|@react|uuid/);
    });
  });
}

runSuite("android");
runSuite("ios");
runSuite("web");
