---
name: main-green
description: Establish whether main is actually healthy right now — the CI run for its current tip, every job in it, and the scheduled workflows that can go red days after a merge. Use before deploying, before branching, or when asked whether main is green, whether the last merge broke anything, or whether it is safe to build from main.
allowed-tools: Bash(git fetch:*) Bash(git rev-parse:*) Bash(git log:*) Bash(gh run list:*) Bash(gh run view:*) Bash(gh api:*)
---

# Is main green?

## Why this skill exists

`main` is protected, so a pull request cannot merge red — but that is not the
same as main being green. The `push:` trigger runs jobs the `pull_request:` one
did not always exercise the same way, a merge of two independently-green
branches can still fail, a flaky job can go red on the retry, and the scheduled
workflows (CodeQL weekly, Keep-alive daily) report long after anyone merged.
`/pr-ready` answers "can this merge"; this answers "should I trust what is there
now" — to deploy from, to branch from, to stop watching.

## 1. What main is at

```bash
git fetch -q origin main
git log -1 --format='%H %s' origin/main
git log --oneline origin/main..HEAD   # local commits ahead of what is pushed, if any
```

Quote the hash only after `git log -1` has printed it back. If HEAD is ahead of
`origin/main`, be clear that "main" here means the pushed tip, not the local one.

## 2. The CI run for that exact commit

```bash
gh run list --branch main --workflow CI --limit 10 \
  --json databaseId,headSha,status,conclusion,createdAt \
  --jq '[.[] | select(.headSha == "<sha>")][0]'
```

- **No entry** — CI has not run for this commit. Either it is still queued, or
  the commit predates the workflow. Do not read the previous commit's run as
  this one's.
- **`status` is `in_progress` or `queued`** — not green yet. Say so, and take
  the second reading in step 5.
- **`conclusion` is `success`** — proceed to read the jobs anyway; a run is
  green as a whole while an `if: always()` reporting job masks a real failure
  underneath.

## 3. Every job, not the rollup

```bash
gh run view <databaseId> --json jobs \
  --jq '.jobs[] | "\(.conclusion // .status)\t\(.name)"'
```

Every job must be `success`. For any that is not:

```bash
gh run view <databaseId> --log-failed
```

Name the job, the step, and the first real error line — not "CI failed".

## 4. The scheduled workflows

These go red on their own schedule, nothing to do with the last merge, and a
red one is easy to miss because no PR surfaces it.

```bash
gh run list --branch main --workflow CodeQL --limit 1 \
  --json conclusion,status,createdAt --jq '.[0]'
gh run list --workflow Keep-alive --limit 1 \
  --json conclusion,status,createdAt --jq '.[0]'
```

A red **CodeQL** is a security finding on code already on main. A red
**Keep-alive** is the Supabase backend — paused, or a rotated key — not the
frontend; check the Supabase dashboard, and note it is a separate problem from
whether the code is sound.

## 5. Confirm, then answer

If anything was in flight, wait and read step 2 again; conclude only when two
readings agree. Report: the commit main is at; the CI run's verdict with the
per-job evidence; the state of CodeQL and Keep-alive; and whether anything has
been merged since the run that green covers. Then the one-line verdict — green
and safe to build from, red (which job), or still running.
