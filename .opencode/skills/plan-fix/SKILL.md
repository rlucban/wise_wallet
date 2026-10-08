---
name: plan-fix
description: >-
  Interactive planning for a user story or bug. Asks consumption choices
  one at a time, keeps one run file, and does not implement. Use when the
  user says plan-fix or /plan-fix.
compatibility: opencode
---

# plan-fix

The story or bug is the requirement. Stay inside its acceptance criteria, repro, and stated scope. If it cannot be read, say so. Do not invent it from the code.

Do not implement. Implementation is `implement-fix`, and only after they say yes.

## Repository

Read `repository.md` in this directory before the first question. If it is missing, treat every line as `unknown` or `none found` and say the repo has not been refined.

Use the file this way:

| Line | Use |
|------|-----|
| Issue tracker | Story options come from it when a tool exists. `user text only` means ask from their words. |
| Invariants | The lens. Each line is `applies` plus a path, or `n/a` plus why. `none found` means match the patterns already in the touched path. |
| Layering | Option order and later slice order follow it. `unknown` means one file per turn and say so. |
| Gold paths | Name them in Decisions as read-first for the area they cover. `none found` means there is no named example. |
| Tests | The proof command recorded in Decisions. `unknown` means do not invent a command. |
| Sources | Re-read these files when an invariant is unclear. Do not add invariants that are not in `repository.md`. |

## Hard rule

- One selection per turn. Use the `question` tool when it exists. Wait. Never stack questions.
- The last option is always `Other.. type your thoughts`. Free text under that option counts.
- Letters in the request (`1C 2E 3C 4A 5B 6C`) answer those questions. Skip them.
- The only files this skill writes are under `.opencode/skills/plan-fix/runs/`.
- Create or resume the run file before asking. Record the open question before waiting. Record the answer before the next question.
- On a later turn, read the file first. A reply answers `pending`.
- `status` stays `in-progress` until they pick Done.

## Session file

`runs/<YYYYMMDD-HHMM>-<slug>.md` next to this skill. `<slug>` is the story id, or `session`. Do not overwrite a different run.

Resume: path they named, else the newest `in-progress` file whose story matches, else create one. A bare reply (`B`, `Done`, `Yes`) resumes the newest `in-progress` file.

```markdown
---
skill: plan-fix
story:
repo:
calibration: {1: "", 2: "", 3: "", 4: "", 5: "", 6: ""}
workflow:
decision:
status: in-progress
pending:
---

# Plan

## Progress

| id | question | answer |
|----|----------|--------|

## Pending

## Decisions

## Scan

## Plan
```

## 1. Story

No id and no problem → ask what to plan, with concrete options when the issue tracker is named and a tool exists, then `Other.. type your thoughts`. Stop.

## 2. Calibration

Order: 1, 2, 3, 4, 5, 6. One per turn.

If the newest run in this folder for the same repo has all six letters, ask once before 1, unless they already passed letters:

`Use the last calibration (<letters>)?`

| | |
|---|---|
| A | Use it |
| B | Re-ask from 1 |
| Other.. type your thoughts | |

### 1. Output shape

| | |
|---|---|
| A | Compact card: Story, Found, Flow, Concern, Unknown |
| B | Tree: Request, then the layers `repository.md` names |
| C | A first. B only when the tree adds something the card does not |
| Other.. type your thoughts | |

### 2. When you need to understand something

| | |
|---|---|
| A | Diagram |
| B | Short bullets |
| C | Code example |
| D | Diff |
| E | Combination, visual first |
| Other.. type your thoughts | |

### 3. Agent explanations

| | |
|---|---|
| A | 3–5 bullets maximum |
| B | Short explanation plus diagram |
| C | Only when ambiguous or risky |
| D | Explain everything, collapsed |
| Other.. type your thoughts | |

### 4. Workflow

| | |
|---|---|
| A | SCAN → VISUAL → APPROVE → BUILD |
| B | SCAN → VISUAL → QUESTION ME → PLAN → BUILD |
| C | SCAN → VISUAL → I THINK → AI CHALLENGES ME → BUILD |
| D | SCAN → PLAN → I REVIEW → BUILD |
| Other.. type your thoughts | |

### 5. During implementation

| | |
|---|---|
| A | `Step n/N` and what changed, then wait |
| B | `Implementing...`, then one visual summary. Stop. |
| Other.. type your thoughts | |

### 6. Teach or orient

| | |
|---|---|
| A | Teach: why this code behaves this way, then the change |
| B | Orient: what exists and what would change |
| C | Hybrid: teach only when the concept is load-bearing, new, or risky |
| Other.. type your thoughts | |

## 3. Scan

Read-only. Fetch the work item when `repository.md` names a tracker and a tool exists. Otherwise say the tracker is missing and use their text.

Trace entry → caller → the line that hits a dependency. Read tests that exercise that path. If none, write none. Do not decompile a dependency or fill the gap from the web.

When Layering is known, follow that order in the trace. When Gold paths exist for the area, read them before choosing an option.

Store this under Scan:

```text
Path: entry → caller → line
Proof: test name, or none. Command: <Tests line>
Teach: what / why / when / one alternative, or one orient line when 6 is B
Lens:
- <each invariant>: applies + path, or n/a + why
```

Present it with choices 1, 2, 3, and 6. Then:

| Workflow | Next |
|----------|------|
| A | Visual, then Approve / Change / Other |
| B | One unknown, as options from the scan, then Other. Continue until they say proceed. Then Discovery. Then which option. |
| C | What do you think?, options from the scan, then Other. After they answer, one challenge (what breaks if), options, then Other. |
| D | Discovery, then which option, then Other |

Option A is the recommendation, with why and cons. Option B is a real alternative. Option C only when a third approach is distinct.

Discovery headings, in order: Problem, Current behavior, Options, Blast radius, Proof, Out of scope.

## 4. Propose, then stop

Show the full plan in chat. Update Decisions and Scan. Decisions names how each `applies` invariant is preserved, the layering order, the gold paths to read, and the proof command. Leave Plan empty. `status` stays `in-progress`. Do not propose code. Set `pending` to `plan-done`.

`Is this plan done?`

| | |
|---|---|
| A | Done |
| B | STOP |
| Other.. type your thoughts | |

Done fills Plan from the approved proposal, sets `decision` and `status: ready-for-implement-fix`, then asks the handoff. STOP clears `pending` and leaves `in-progress`. Other revises the draft and asks `plan-done` again.

## 5. Handoff

`Plan file is ready at <absolute path>. Run implement-fix with it?`

| | |
|---|---|
| A | Yes |
| B | No |
| Other.. type your thoughts | |

Yes loads `implement-fix` on this same file and does not start a slice. No stops. The plan file is the deliverable. Other starts a slice only when the text is an explicit yes.

## Do not

- Add an invariant that is not in `repository.md`
- Edit `repository.md`
- Ask more than one question in a turn
- Implement, commit, or open a PR
- Set `ready-for-implement-fix` before Done
