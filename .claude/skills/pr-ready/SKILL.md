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

## 4. Has anything actually reviewed the current code?

The reviewer has changed once already, so do not look for one name. List every
comment and review with its author and timestamp, then compare with the head
commit:

```bash
gh pr view <n> --json comments,reviews \
  --jq '[(.comments[] | {kind: "comment", who: .author.login, at: .createdAt}),
         (.reviews[]  | {kind: "review",  who: .author.login, at: .submittedAt})]
        | sort_by(.at)'
git log -1 --format='%H %cI %s' <headRefOid>
```

CodeRabbit reviews pull requests against `main`, posting a walkthrough comment
and a review of its own. Anything older than the last push has not seen the
current code.

**Silence is not a pass.** The previous reviewer spent its last pull requests
answering with a billing notice instead of a review, which reads as "no
findings" to anyone skimming the page. If nothing ran, say that nothing ran, and
count it as a missing signal rather than a clean bill.

## 5. Confirm, then answer

Take a second reading a little later and only conclude if both agree. Report the
four conditions one by one with the evidence for each, then the verdict. Never
quote a commit hash you have not read back with `git log -1`; fabricated hashes
have reached PR comments here twice.
