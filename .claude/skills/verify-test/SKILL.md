---
name: verify-test
description: Prove a test can actually fail before trusting it — the anchor check, one mutation to the source, the red run read for a real summary, the restore, the quoted failure message. Use after writing or changing a test, or when asked whether a test really catches what it claims to, whether it has been shown to go red, or to mutation-check it.
argument-hint: '[test-file-path]'
arguments: target
allowed-tools: Bash(git status:*) Bash(git stash:*) Bash(git checkout:*) Bash(git diff:*) Bash(git log:*) Bash(cp:*) Bash(grep:*) Bash(npx vitest:*) Bash(npm test:*) Read Edit
---

# Prove this test can fail

`$target` is the test file to check. Without it, take the test file changed most
recently in the working tree (`git status`).

## Why this skill exists

Two production bugs here were found by the user, not by the suite. A test that
has never been seen to fail is not evidence: it might assert nothing, or its
last mutation check might have edited a string that matched nothing and gone
green for the wrong reason. This runs the procedure in `.claude/rules/testing.md`
the same way every time, so the result is a quoted failure message rather than a
claim.

## 1. Protect the fix first

The mutation below is reverted with `git checkout`, which also discards any
_uncommitted_ change to the same file — that has cost work three times.

- Source file committed and clean → `git checkout --` restores it. Fine.
- Source file has uncommitted changes, **or is new and not yet committed**
  (`git checkout` cannot bring back a file git has never seen — this was hit
  this session) → copy it aside first: `cp <source> /tmp/verify-test.bak`, and
  restore from that copy in step 5.

Say which case applies before touching anything.

## 2. Name the anchor

Pick the exact string in the **source** that the test's assertion stands on — a
condition, a guard, a returned literal. Confirm it is there:

```bash
grep -q '<anchor>' <source-file> || echo 'ANCHOR NOT FOUND — a mutation here would match nothing'
```

An edit that matches nothing produces a green run indistinguishable from a
passing check. If the anchor is not found, the mutation is wrong — rethink it.

## 3. Mutate the source, never the test

Make one change to the source so the behaviour the test names is wrong: invert
the condition, drop the guard, return a constant, delete the `+ 1`. Editing the
test to make it pass proves the opposite of what is wanted.

## 4. Run that file alone, no reporter flag

```bash
npx vitest run <target>
```

- No `--reporter=basic` — it is gone in Vitest 4, the run dies before any test
  executes, and that reads as every mutation caught.
- The run must print a `Tests …` summary line. **A run with no summary is a
  broken measurement, not a red one** — report that, do not count it as a pass
  or a failure.
- At least one test in `<target>` must fail. If they all still pass, the test
  does not cover the mutation — that is the finding, report it.

## 5. Restore and confirm green

`git checkout -- <source>`, or `cp /tmp/verify-test.bak <source>` for the
copy-aside case. Then `npx vitest run <target>` again — every test must pass.

## 6. Report

State, in order: which protect-the-fix case applied; the anchor; the mutation in
one line; the exact failure message the red run printed, quoted; and that the
restore came back green. If nothing turned red, say so plainly — the test needs
strengthening, and that is the answer.
