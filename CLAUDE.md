# Working on ChessTrainer AI

Context for Claude Code, read automatically at the start of every session on any
machine. The project's instructions are shared with every other coding agent
and live in `AGENTS.md`, imported here whole:

@AGENTS.md

What follows is only what is specific to Claude Code.

## Where AGENTS.md names a procedure, run the command

| AGENTS.md says                                  | Run                                          |
| ----------------------------------------------- | -------------------------------------------- |
| Never call a PR ready from one green signal     | `/pr-ready`                                  |
| Review before pushing                           | `/code-review`                               |
| A security pass for auth, policies or secrets   | `/security-review`                           |
| A test that has never failed proves nothing     | `/verify-test`                               |
| Is `main` healthy before deploying or branching | `/main-green`                                |
| Merging the release PR is spending credits      | `/deploy-budget` first, for the real balance |

`/code-review` reads the branch's commits and the working tree in a subagent of
its own and costs nothing; it catches what it catches while the code is still
private.

## Configuration for this agent

`.claude/` is part of the repository and follows its rules: English, formatted,
reviewed. It holds four things.

`settings.json` registers one `PostToolUse` hook, `hooks/format-edited-file.sh`,
which runs Prettier over every file this agent edits and ESLint `--fix` over the
JavaScript and TypeScript among it. About 0.35s per edit, and it removes the
commonest way `npm run ci` fails on a change that is otherwise correct. It never
reaches the network — the binaries come from `node_modules` — and exits quietly
when it does not recognise what it was handed. Hooks declared in a project
settings file only run once the workspace is trusted, which Claude Code asks
about the first time it starts here.

`rules/*.md` are instructions scoped to file paths through their `paths`
frontmatter. They load when a matching file is opened rather than at startup,
so the engine calibration, the test procedure and the migration rules are
current where they matter without being carried through every unrelated
session. Other agents reach the same files through the table in `AGENTS.md`.

`skills/*` are the slash commands above. `/pr-ready` queries the four
conditions that block a merge and reports each with its evidence; `/main-green`
is its counterpart for after the merge — the CI run for main's current tip and
the scheduled workflows that go red on their own schedule. `/verify-test` runs
the "prove the test can fail" procedure — anchor, mutation, red run, restore —
and reports the quoted failure. `/deploy-budget` measures the Netlify credit
position rather than trusting the figures written down.

`settings.local.json`, if it exists, is personal and gitignored.
