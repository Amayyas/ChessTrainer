---
name: pr-ready
description: Establish whether a pull request is genuinely ready to merge by querying all four blocking conditions — checks, review, branch freshness, unresolved threads — instead of reading one signal and calling it done. Use when asked whether a PR is ready, mergeable, blocked, or still waiting on something.
argument-hint: '[pr-number]'
arguments: pr
allowed-tools: Bash(gh pr view:*) Bash(gh pr list:*) Bash(gh api:*) Bash(git log:*) Bash(git rev-parse:*)
---

# Is this PR ready?

## Currently open

!`gh pr list --state open --json number,title,headRefName,mergeStateStatus --jq '.[] | "#\(.number)  \(.mergeStateStatus)  \(.headRefName)  — \(.title)"' 2>&1 | head -20`

## The PR under review

`$pr` when that is filled in; otherwise the PR for the current branch, which
`gh pr view` resolves on its own.

## Why this skill exists

Calling a PR ready from a single green signal has been wrong here before. `main`
is protected on four independent conditions, and they do not all become true at
the same moment.

## 1. Read the four conditions

```bash
gh pr view <n> --json mergeable,mergeStateStatus,reviewDecision,headRefOid,updatedAt \
  --jq '{mergeable, mergeStateStatus, reviewDecision, headRefOid, updatedAt}'
```

`mergeStateStatus` is the one that names the blocker:

| Value      | What actually blocks                             |
| ---------- | ------------------------------------------------ |
| `CLEAN`    | nothing GitHub can see                           |
| `BEHIND`   | the branch is not current with `main`; update it |
| `BLOCKED`  | a required review or an unresolved thread        |
| `UNSTABLE` | a required check is failing or still running     |
| `DIRTY`    | merge conflicts                                  |

## 2. Read every check, not the summary

```bash
gh pr view <n> --json statusCheckRollup \
  --jq '.statusCheckRollup[] | "\(.conclusion // .state)\t\(.name // .context)"'
```

A `NEUTRAL` or `SKIPPED` entry is not a failure. A missing entry is not a pass:
a check that never started reads as absence, not as red.

## 3. Unresolved review threads

`gh pr view` does not carry them. Ask GraphQL:

```bash
gh api graphql -f owner=Amayyas -f repo=ChessTrainer -F number=<n> -f query='
query($owner:String!,$repo:String!,$number:Int!){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      reviewThreads(last:100){ nodes{ isResolved isOutdated path
        comments(first:1){ nodes{ author{login} body } } } }
      reviews(last:20){ nodes{ author{login} state submittedAt } }
    }
  }
}' --jq '{unresolved: [.data.repository.pullRequest.reviewThreads.nodes[]
    | select(.isResolved == false) | {path, who: .comments.nodes[0].author.login}],
  reviews: [.data.repository.pullRequest.reviews.nodes[]
    | {who: .author.login, state, submittedAt}]}'
```

Every thread must be resolved, including the ones GitHub marks outdated.

## 4. Is the review newer than the last push?

The automated reviewer is Qodo. It posts as an issue comment titled
`Code Review by Qodo`, and adds a review of its own when it has inline findings.
It runs **after** the checks go green, so a reading taken the moment checks pass
is premature.

```bash
gh pr view <n> --json comments \
  --jq '.comments[] | select(.author.login == "qodo-code-review")
        | {createdAt, head: (.body | .[0:80])}'
git log -1 --format='%H %cI %s' <headRefOid>
```

Compare the newest Qodo comment against the head commit's date. A review older
than the last push has not seen the current code.

**Qodo can be silent for a reason that is not "still working".** A comment
containing `qodo:billing-blocked` means reviews are paused — the trial ended on
1 September 2026 — and no review is coming. Say so and treat it as one missing
signal, not as a pass.

## 5. Confirm, then answer

Take a second reading a little later and only conclude if both agree. Report the
four conditions one by one with the evidence for each, then the verdict. Never
quote a commit hash you have not read back with `git log -1`; fabricated hashes
have reached PR comments here twice.
