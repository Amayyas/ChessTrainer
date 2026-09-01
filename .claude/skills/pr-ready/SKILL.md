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

## 3. Review threads, in full

`gh pr view` does not carry them. Ask GraphQL, and read every comment in every
thread rather than the first of each: a thread's answer usually sits below its
opening remark, and a resolved thread still records what was decided.

```bash
gh api graphql -f owner=Amayyas -f repo=ChessTrainer -F number=<n> -f query='
query($owner:String!,$repo:String!,$number:Int!){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      reviewThreads(last:100){ nodes{ id isResolved isOutdated path
        comments(first:50){ nodes{ databaseId author{login} createdAt body } } } }
    }
  }
}' --jq '[.data.repository.pullRequest.reviewThreads.nodes[]
  | {path, resolved: .isResolved, outdated: .isOutdated, id,
     messages: [.comments.nodes[] | {who: .author.login, at: .createdAt, id: .databaseId}]}]'
```

Every thread must be resolved before the merge, including the ones GitHub marks
outdated. The `id` of a thread and the `databaseId` of a comment are what you
need to reply and resolve, so keep them.

## 4. Has anything reviewed _this_ commit?

The reviewer has changed once already, so do not look for one name — and do not
settle for a timestamp either. GitHub records the exact commit each review read;
comparing that against the head is the direct question, where comparing dates is
an inference that a rebase or a late push can invalidate.

```bash
gh api graphql -f owner=Amayyas -f repo=ChessTrainer -F number=<n> -f query='
query($owner:String!,$repo:String!,$number:Int!){
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      headRefOid
      reviews(last:20){ nodes{ author{login} state submittedAt commit{oid} } }
      comments(last:50){ nodes{ author{login} createdAt } }
    }
  }
}' --jq '.data.repository.pullRequest as $pr | {head: $pr.headRefOid,
  reviews: [$pr.reviews.nodes[] | {who: .author.login, state, at: .submittedAt,
            commit: .commit.oid, current: (.commit.oid == $pr.headRefOid)}],
  comments: [$pr.comments.nodes[] | {who: .author.login, at: .createdAt}]}'
```

A review with `current: false` read an earlier commit. The comment list is there
to catch a reviewer that only comments, and to show when nothing ran at all.

CodeRabbit opens no review by itself on this repository, so read the status it
posts instead — it is green whether or not anybody looked at the code:

```bash
gh api repos/Amayyas/ChessTrainer/commits/<headRefOid>/status \
  --jq '.statuses[] | select(.context == "CodeRabbit") | {state, description}'
```

`Review skipped: manual review required for this OSS repository` means this
commit has not been reviewed. Comment `@coderabbitai review` on the pull
request, wait for the review to land, and read it before answering.

**Silence is not a pass.** The previous reviewer spent its last pull requests
answering with a billing notice instead of a review, which reads as "no
findings" to anyone skimming the page. If nothing ran, say that nothing ran, and
count it as a missing signal rather than a clean bill.

## 5. Confirm, then answer

Take a second reading a little later and only conclude if both agree. Report the
four conditions one by one with the evidence for each, then the verdict. Never
quote a commit hash you have not read back with `git log -1`; fabricated hashes
have reached PR comments here twice.
