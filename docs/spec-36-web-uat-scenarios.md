# Web App Test Scenarios (User Acceptance)

Plain-language checks for the web changes. No tech skills needed — just the app,
a browser, and optionally a second device. Tick each Expected result as you go.

## Part A — Everyday use on web (online account)

- **WEB-01 Register fresh.** Open the web app → Register with a new email + 4-digit PIN → Expected: lands in the app, no mention of offline anywhere.
- **WEB-02 Add money in/out.** Add an income transaction and an expense → Expected: both appear in Recent Activity with correct balances.
- **WEB-03 Edit + delete.** Edit the expense amount, then delete it → Expected: list and balances update immediately each time.
- **WEB-04 Dues.** Add a scheduled due, mark it paid → Expected: due moves to Completed, matching transaction appears.
- **WEB-05 Allocations.** Add an allocation, add money to it → Expected: progress bar moves, totals match.
- **WEB-06 Categories.** Add a custom category, use it on a transaction → Expected: category available everywhere, transaction shows it.
- **WEB-07 Refresh keeps you in.** While logged in, refresh the browser tab → Expected: still logged in, same data, nothing lost.
- **WEB-08 Logout + back in.** Log out, log back in with same email + PIN → Expected: all data exactly as left.
- **WEB-09 Never offline-looking.** Through all of the above → Expected: no "offline" banner, no "no connection" strip, no Offline buttons anywhere.

## Part B — Old local-only account on web (one-time move)

- **WEB-10 Legacy login.** Log in on web with an old local-only account (username + PIN, no email) → Expected: a message explains local accounts are moving online, with a Continue button.
- **WEB-11 Make Online.** Tap Continue → Settings → Make Online, enter PIN, complete the move → Expected: success message, account now online.
- **WEB-12 Data survived.** After the move → Expected: every old transaction, due, allocation, and category is present with correct amounts.
- **WEB-13 No second move.** Log out and back in → Expected: straight into the app, no move prompt again.

## Part C — When things go wrong (web)

- **WEB-14 Server unreachable.** (Turn off internet or stop the test server) Try adding a transaction → Expected: a clear error message, nothing silently saved, nothing lost when retried later.
- **WEB-15 Wrong PIN at login.** Enter a wrong PIN → Expected: "Invalid email and PIN", stays on login, no crash.
- **WEB-16 Change passcode still works.** Settings → Change Passcode with correct current PIN → Expected: "Passcode Changed" confirmation.

## Part D — Phone apps unchanged (regression, Expo Go)

- **MOB-01 Offline banner still works.** On Android/iOS with internet off → Expected: the "You're offline" banner appears (it should — phones keep offline mode).
- **MOB-02 Local accounts still work.** Create/use an offline-only account on a phone → Expected: works exactly as before, data stays on device.
- **MOB-03 Auto-backup toggle still works.** On a phone cloud account, switch auto-backup off and on → Expected: "Sync off" card appears/disappears accordingly.
- **MOB-04 Same features, same data.** Repeat WEB-02..WEB-06 on a phone → Expected: identical behavior to web.

## Part E — Two devices, one truth

- **XDEV-01.** Add a transaction on web → open the phone app (same account) → Expected: transaction appears there too.
- **XDEV-02.** Edit it on the phone → refresh web → Expected: web shows the edited version.

## Sign-off

- Tester: ______  Date: ______
- Web browser used: ______
- Result: PASS / FAIL (fails → note scenario number + what happened): ______
