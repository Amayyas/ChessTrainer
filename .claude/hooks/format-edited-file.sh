#!/usr/bin/env bash
#
# PostToolUse hook: format and lint a file the moment Claude Code edits it.
#
# `npm run ci` opens with `format:check`, so an unformatted file fails the whole
# run for a reason that has nothing to do with the change. Running Prettier per
# edit removes that failure class, and ESLint reports whatever is left while the
# edit is still fresh rather than at push time.
#
# This never blocks and never installs anything. An unreadable payload, a file
# outside the repository, a missing node_modules: each exits 0 in silence.

set -uo pipefail

payload=$(cat)

# The documentation reaches for jq here. Node does the same job, and this
# repository already requires Node while nothing guarantees jq on a fresh
# machine.
file=$(printf '%s' "$payload" | node -e '
  let raw = ""
  process.stdin.on("data", (chunk) => (raw += chunk))
  process.stdin.on("end", () => {
    try {
      const edited = JSON.parse(raw)?.tool_input?.file_path
      if (typeof edited === "string") process.stdout.write(edited)
    } catch {
      // Not a payload we understand. Print nothing; the hook then exits.
    }
  })
' 2>/dev/null)

[ -n "$file" ] || exit 0

root=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || true)}
[ -n "$root" ] || exit 0

case $file in
  /*) ;;
  *) file=$root/$file ;;
esac

# Ours to format only if it sits inside the repository and still exists.
case $file in
  "$root"/*) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

# The local binaries, never npx: a hook must not reach the network.
prettier=$root/node_modules/.bin/prettier
eslint=$root/node_modules/.bin/eslint

if [ -x "$prettier" ]; then
  "$prettier" --write --ignore-unknown --log-level warn "$file" >/dev/null 2>&1
fi

case $file in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs) ;;
  *) exit 0 ;;
esac
[ -x "$eslint" ] || exit 0

if ! report=$("$eslint" --fix "$file" 2>&1); then
  # Exit 2 on PostToolUse cannot undo the edit; it shows stderr to Claude, which
  # is the point: fix it now rather than discovering it in CI.
  {
    echo "ESLint still reports problems in $file after --fix:"
    echo "$report"
  } >&2
  exit 2
fi
