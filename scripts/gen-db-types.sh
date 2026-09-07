#!/usr/bin/env bash
# Regenerates src/lib/database.types.ts from the migrations.
#
# The Supabase row types the client relies on were maintained by hand, so a
# renamed or dropped column would not fail `npm run typecheck` — it would fail
# in the browser, which is exactly the class of bug this project keeps being
# bitten by. Run this after any migration that changes a column. It brings up a
# throwaway Postgres, applies the bootstrap and every migration in the order a
# fresh project would, and lets the Supabase CLI introspect the result.
#
# CI does not run this (it needs Docker and a CLI download); instead
# database.types.test.ts replays the migrations in plain Node and fails if the
# committed file's columns have drifted from them.
#
# Pinned CLI version: the generator's output changes between releases, so an
# unpinned run would rewrite the file on someone else's machine for no reason.
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=scripts/pg-lib.sh
source scripts/pg-lib.sh

CLI_VERSION="${SUPABASE_CLI_VERSION:-2.48.3}"
NAME="${DB_TYPES_CONTAINER:-chesstrainer-db-types}"
PORT="${DB_TYPES_PORT:-55433}"
OUT="$(pwd)/src/lib/database.types.ts"
DB_URL="postgres://postgres:test@localhost:${PORT}/chesstrainer"

WORKDIR=""
cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  [ -n "$WORKDIR" ] && rm -rf "$WORKDIR"
}
trap cleanup EXIT

pg_up "$NAME" "$PORT"

# Run from a scratch directory: the CLI parses supabase/config.toml even for a
# --db-url run, and this project's config uses keys newer than the pinned CLI.
# The generator needs none of it — the connection string carries everything.
WORKDIR="$(mktemp -d)"

echo "generating src/lib/database.types.ts with supabase CLI ${CLI_VERSION}"
(cd "$WORKDIR" && npx -y "supabase@${CLI_VERSION}" gen types typescript \
  --db-url "$DB_URL" --schema public) >"$OUT"

echo "done"
