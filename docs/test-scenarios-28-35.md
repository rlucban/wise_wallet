# Test Scenarios — SPEC-28 through SPEC-35

Manual + automated scenarios for the last eight specs. Jest ACCs are implemented
per spec — run `npm test` for those. SPEC-33 was superseded (absorbed by
SPEC-34); its scenario lives under SPEC-34.

---

## SPEC-28 — Account deletion, 401 handling, queue purge

Precondition: Cloud account with data + receipts; second device optional.

- **S28-1 Delete online (correct PIN):** Delete Account → PIN → checkbox →
  Delete → "Account Deleted", lands on `/login`, no "Session Ended" alert,
  no 401 noise in logs.
- **S28-2 Delete with dead token:** force-expire the session first (log in
  elsewhere), then delete → suppressed 401 → "Deleted From This Device
  Only…" + clean logout, no session alert.
- **S28-3 Deleted-email login:** after server delete, log in with same
  email+PIN → "Login Failed — invalid email or PIN", never a local session,
  never an offline upsell.
- **S28-4 Email 401 hard-fail:** wrong PIN on an email account → hard fail,
  no `local_token` fallback on any platform.
- **S28-5 Offline delete:** airplane mode → pre-confirm states cloud data
  survives → local-only wipe + honest copy.
- **S28-6 Purge audit:** after delete, next login shows no stale pending
  counts, no old "Last sync", no ghost name match, receipt photos gone —
  second account on the device untouched.
- Automation: `apiClient.test.ts`, `accountDelete.test.ts`,
  `syncProcessor.test.ts` additions.

## SPEC-29 — Durable outbox, idempotency, drain

Mostly engine-level; observable via status card + logs.

- **S29-1 Burst coalescing:** create then rapidly edit the same transaction
  twice → Sync card shows 1 pending (not 3); server ends with latest values,
  no duplicates.
- **S29-2 Update-then-delete:** edit then delete an item offline → single
  delete ships (never POST-then-DELETE); item stays gone after reconnect +
  refetch.
- **S29-3 Dead letters:** with API returning 404/400 for an entity → item
  counted "unsendable", queue keeps draining everything else, counts shown
  neutrally.
- **S29-4 Two users, one device:** interleaved offline writes as A then B →
  each user's items sync to their own log on reconnect, never crossed.
- Automation: `syncQueue.test.ts`, `syncProcessor.test.ts` (timing via fake
  timers).

## SPEC-30 — Local creation gate + re-registration

Precondition: fresh install + one Local account (username + PIN).

- **S30-1 Offline register:** airplane mode → open Register → suggestion
  modal appears once → [Continue Offline] preselects Offline → register
  works fully offline; reopen → [Use Online] → submit → Cloud Unreachable
  with working Offline path; no red-box.
- **S30-2 Online default:** online → Register defaults Online, no modal.
- **S30-3 Username fallback confirm:** Online mode + non-email name + cloud
  failure → explicit "Create Local-Only Account?" confirm stating NOT-sync
  (never silent); Cancel aborts cleanly.
- **S30-4 No login creation:** login with unknown user on any platform →
  plain failure + Register route; "Create Offline Account" appears nowhere.
- **S30-5 Re-register (Local, online):** toggle auto-backup ON (or Register
  Online Account button) → honesty dialog (NEW account + data-stays +
  export/import) → export step with working Skip → email+PIN register →
  fresh Cloud dashboard; log out → old username+PIN restores old Local data
  untouched.
- **S30-6 Offline toggle:** Local + airplane + toggle ON → "Connect first"
  notice, zero state change.
- Automation: `localGate.test.ts` ACC-01..05.

## SPEC-31 — Web never-local + logout hygiene + PIN unification

- **S31-1 Web unreachable login:** API blocked → Connect notice, stays
  signed out, zero local writes.
- **S31-2 Web unknown user:** plain Login Failed + Register route, no lookup.
- **S31-3 Native offline login:** known local/username account still works
  offline.
- **S31-4 Logout hygiene:** A → logout → B sees only B's data; Local logout
  → re-login intact.
- **S31-5 Correct PIN enables:** OFF→ON with correct PIN → sync enables, no
  false mismatch; Delete PIN arms with correct PIN.
- **S31-6 Wrong PIN still rejected; session conflict shows Session notice,
  never wrong-PIN copy.**
- Automation: `localGate.test.ts` ACC-01..04 + ACC-07..09.

## SPEC-32 — Keyboard visibility (Android + iOS Expo Go)

- **S32-1 PIN dialogs:** each Settings PIN dialog + passcode screen → field +
  error visible above keyboard; buttons reachable by scroll; dismiss
  restores layout; no red-box.
- **S32-2 Forms:** login/register/add/edit-transaction/add-due/
  add-allocation/learning/dues/savings/category/payment → focused field
  visible; tap-outside dismisses.
- **S32-3 Web export:** zero layout/behavior change.
- Automation: `keyboardVisibility.test.js` ACC-01..03.

## SPEC-33 — Superseded

Absorbed by SPEC-34 (normalizer retained for API reads). No runs — see S34-1.

## SPEC-34 — API-only online mode

- **S34-1 ₱15 repro:** register ₱15 on mobile web → incognito login (not
  register) → name + ₱15 present, survives reload.
- **S34-2 Cross-side create** both directions with refresh.
- **S34-3 Airplane gate:** banner + Turn OFF over gated content; reconnect
  lifts with fresh data.
- **S34-4 Offline Turn OFF:** usable empty/frozen log, zero fetch.
- **S34-5 ON→OFF seeds; OFF→ON migrates** (PIN → explanation →
  fetch→push→purge); Cancel changes nothing.
- **S34-6 Web export** valid JSON, no gaps/red-box.
- Automation: `apiOnly.test.ts` ACC-01..04/09/10.

## SPEC-35 — Login database reset (ships OFF)

- **S35-1 Flag off:** login pixel-identical, no button/gap (all builds).
- **S35-2 Flag on (temporary local flip ONLY, revert after):** button →
  warning (local-destroyed + cloud-untouched) → checkbox-gated Delete
  Everything → Cancel anywhere changes nothing → confirm wipes, clears
  inputs, success notice, stays on login → cloud re-login fresh; Local data
  gone by design.
- Automation: `deviceReset.test.ts` ACC-01..04.
