#!/usr/bin/env node
/* global console:readonly process:readonly fetch:readonly AbortSignal:readonly */
/**
 * SPEC-46 D-05 — user-run contract probe (Keep A).
 *
 * Proves wallet-api round-trips flat `categoryId` on transactions using the
 * exact payload shape the app sends (nested `category` KEPT, flat `categoryId`
 * ADDED — cf. app/(tabs)/settings.tsx:419 precedent):
 *
 *   POST marked probe → GET list → assert categoryId echoed → DELETE probe → confirm gone
 *
 * Zero dependencies (global fetch, node >= 18). Never imported by app code.
 * The token is accepted as an arg and NEVER printed or logged.
 *
 * Usage:
 *   node scripts/verify-category-roundtrip.mjs --token <JWT> --user-id <uid> [--api-url <url>] [--category-id <id>]
 *   --api-url falls back to $EXPO_PUBLIC_API_URL. Fails fast when required values are missing.
 *
 * Exit codes: 0 = PASS (round-trip proven, probe deleted),
 *             1 = FAIL (reason printed, cleanup attempted, leftover reported),
 *             2 = usage/config error (nothing was sent).
 */

const DEFAULT_CATEGORY_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16"; // seeded Salary (income), utils/db.ts:63
const MARKER_PREFIX = "[SPEC46-probe]";
const WRAP_KEYS = ["data", "results", "items", "transactions"];

function usageError(msg) {
  console.error(`ERROR: ${msg}`);
  console.error("");
  console.error("Usage: node scripts/verify-category-roundtrip.mjs --token <JWT> --user-id <uid> [--api-url <url>] [--category-id <id>]");
  process.exit(2);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--token") out.token = argv[++i];
    else if (a === "--user-id") out.userId = argv[++i];
    else if (a === "--api-url") out.apiUrl = argv[++i];
    else if (a === "--category-id") out.categoryId = argv[++i];
    else usageError(`unknown arg: ${a}`);
  }
  return out;
}

// Mirrors the server's one-level envelope nesting (cf. SPEC-40 unwrapEnvelope).
function unwrapList(json) {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    for (const k of WRAP_KEYS) {
      const v = json[k];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        for (const k2 of WRAP_KEYS) {
          if (Array.isArray(v[k2])) return v[k2];
        }
      }
    }
  }
  return null;
}

function pickId(json) {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    if (typeof json.id === "string" || typeof json.id === "number") return String(json.id);
    const d = json.data;
    if (d && typeof d === "object" && !Array.isArray(d) &&
        (typeof d.id === "string" || typeof d.id === "number")) return String(d.id);
  }
  return null;
}

async function api(base, token, path, { method = "GET", body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null; // non-JSON body — callers report status + preview
  }
  return { status: res.status, ok: res.status >= 200 && res.status < 300, json, preview: text.slice(0, 300) };
}

async function main() {
  if (typeof fetch !== "function") {
    console.error("ERROR: global fetch is missing — run with node >= 18.");
    process.exit(2);
  }
  const args = parseArgs(process.argv);
  const apiUrl = (args.apiUrl || process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!apiUrl) usageError("missing API URL (pass --api-url or set EXPO_PUBLIC_API_URL)");
  if (!args.token) usageError("missing --token");
  if (!args.userId) usageError("missing --user-id");
  const categoryId = args.categoryId || DEFAULT_CATEGORY_ID;
  const marker = `${MARKER_PREFIX} ${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  console.log(`probe: api=${apiUrl} user=${args.userId} categoryId=${categoryId}`);
  console.log(`probe: marker=${marker}`);

  let failed = false;
  let serverId = null;
  const fail = (msg) => {
    console.error(`FAIL: ${msg}`);
    failed = true;
  };

  try {
    // 1. POST the probe with the app-shaped payload (nested kept, flat added).
    const post = await api(apiUrl, args.token, "/transactions", {
      method: "POST",
      body: {
        amount: 1,
        type: "income",
        date: new Date().toISOString(),
        note: marker,
        paymentMethod: "cash",
        category: { id: categoryId, name: "SPEC46 probe", type: "income", updatedAt: 0 },
        categoryId,
        userId: args.userId,
      },
    });
    if (!post.ok) {
      fail(`POST /transactions → HTTP ${post.status} ${post.preview}`);
      return;
    }
    serverId = pickId(post.json);
    console.log(`probe: POST ok${serverId ? ` (server id ${serverId})` : " (no id in response — will locate by marker)"}`);

    // 2. GET the list and find the probe by its unique marker.
    const get = await api(apiUrl, args.token, `/transactions?userId=${encodeURIComponent(args.userId)}`);
    if (!get.ok) {
      fail(`GET /transactions → HTTP ${get.status} ${get.preview}`);
      return;
    }
    const rows = unwrapList(get.json);
    if (!rows) {
      fail(`GET body is not a list or known envelope: ${get.preview}`);
      return;
    }
    const found = rows.find((t) => t && t.note === marker);
    if (!found) {
      fail("probe row not found in GET list (server did not store the POST)");
      return;
    }
    if (!serverId && (typeof found.id === "string" || typeof found.id === "number")) {
      serverId = String(found.id);
    }
    console.log(`probe: found row id=${serverId || "(none)"} categoryId=${JSON.stringify(found.categoryId)} nested=${found.category ? "echoed" : "absent"}`);

    // 3. Assert the flat categoryId survived the round-trip.
    if (found.categoryId === undefined || found.categoryId === null ||
        String(found.categoryId) !== String(categoryId)) {
      fail(`categoryId mismatch: sent ${categoryId}, server returned ${JSON.stringify(found.categoryId)}`);
      return;
    }
    console.log("probe: categoryId round-tripped OK");
  } finally {
    // 4. Always clean up: DELETE by server id, then confirm it is gone.
    if (serverId) {
      try {
        const del = await api(apiUrl, args.token, `/transactions/${encodeURIComponent(serverId)}`, { method: "DELETE" });
        if (!del.ok) {
          fail(`DELETE /transactions/${serverId} → HTTP ${del.status} ${del.preview}`);
        } else {
          const reget = await api(apiUrl, args.token, `/transactions?userId=${encodeURIComponent(args.userId)}`);
          const rows = reget.ok ? unwrapList(reget.json) : null;
          if (!rows || rows.some((t) => t && (String(t.id) === String(serverId) || t.note === marker))) {
            fail("probe row leftover after DELETE (still present in GET list)");
          } else {
            console.log("probe: DELETE confirmed (row gone)");
          }
        }
      } catch (e) {
        fail(`cleanup threw: ${e && e.message ? e.message : String(e)}`);
      }
    } else if (!failed) {
      fail("no server id captured and marker lookup failed — cannot clean up; inspect manually");
    }
  }

  if (!failed) {
    console.log("PASS: categoryId round-tripped and probe row deleted.");
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`FAIL: unexpected error: ${e && e.message ? e.message : String(e)}`);
  process.exitCode = 1;
});
