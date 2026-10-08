---
name: implement-fix
description: >-
  Implements a fix from the plan-fix run file, one file or one layer at
  a time. Writes only after Apply this slice. Use when the user says
  implement-fix or /implement-fix, or agrees to the plan-fix handoff.
compatibility: opencode
---

# implement-fix

The plan file is the source of truth. Do not re-plan.

Read Progress and Pending first. A reply answers `pending`. Update that same file. Do not create a second one.

Read `../plan-fix/repository.md` before the first slice. If it is missing, say the repo has not been refined and continue with the plan file only.

| Line | Use |
|------|-----|
| Layering | One layer per turn, in that order. `unknown` means one file per turn. |
| Gold paths | Read the ones that cover this slice before showing the proposed code. `none found` means skip this. |
| Tests | After an applied slice, run that command when it is a single command from the contract. `unknown` means do not invent one. Say the result in the slice summary. |
| Invariants | Preserve every invariant Decisions marked `applies`. |

## Hard rule

- One selection per turn. Last option is `Other.. type your thoughts`.
- Follow the file's calibration, workflow, and decision.
- One file, or one layer, per turn.
- Show the slice. Write only after `Apply this slice`. Then stop.
- The next slice starts only when they ask to continue.
- Stay inside the in-scope paths.

## Learn note

When calibration 6 is A or C, add a short teach note above the proposed code: why this file behaves this way, then the change. When it is B, state what exists and what this slice changes. The note is not a second question.

## Load

Use the path they named, else the newest run whose status is `implementing` or `ready-for-implement-fix`.

No file → ask: continue `plan-fix`, or pass a path, then Other. Stop.

`in-progress` → follow `plan-fix` for `pending`. Do not implement.

If decision, in-scope paths, or calibration are missing, ask that one fact as a choice list. Stop.

Set `status: implementing` once they choose who implements.

## Who implements

Skip if Progress already has `who-implements`. Otherwise ask, set `pending` to `who-implements`, and wait. Do not propose code in this turn.

| | |
|---|---|
| A | I will implement it |
| B | Code it |
| Other.. type your thoughts | |

A means later slices are proposals only. B still needs `Apply this slice`. Record the answer. Do not change `decision` or calibration.

## Slice

1. Name the slice. Follow Layering when the contract names an order.
2. Read the matching gold paths.
3. Add the learn note.
4. Explain the change using calibration 2, 3, and 6.
5. Show the proposed code.
6. Stop on `pending: slice-<n>`.

| Who | Options |
|-----|---------|
| A, themselves | `I'll apply this`, then Other. Do not edit. |
| B, agent | `Apply this slice`, `Stop`, then Other. |

On apply, write that slice only. Preserve every invariant Decisions marked `applies`. Run the Tests command when the contract names one, and include the result in the summary.

Calibration 5 A: one line `Step n/N` and what changed. Calibration 5 B: `Implementing...`, then one visual summary. Stop.

## Do not

- Invent a new plan
- Invent a test command
- Edit `repository.md`
- Edit in the turn that proposes a slice
- Continue to the next file after one apply
- Commit or open a PR unless they ask
