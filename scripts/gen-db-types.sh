#!/usr/bin/env bash
# Regenerates src/lib/database.types.ts from the migrations.
#
# The Supabase row types the client relies on were maintained by hand, so a
# renamed or dropped column would not fail `npm run typecheck` — it would fail
# in the browser, which is exactly the class of bug this project keeps being
# bitten by. This brings up a throwaway Postgres, applies the bootstrap and
# every migration in the order a fresh project would, and lets the Supabase CLI
# introspect the result. CI runs the same script and fails on any diff.
#
# Pinned CLI version: the generator's output changes between releases, so an
# unpinned run would rewrite the file on someone else's machine for no reason.
set -euo pipefail

CLI_VERSION="${SUPABASE_CLI_VERSION:-2.48.3}"
NAME="${DB_TYPES_CONTAINER:-chesstrainer-db-types}"
PORT="${DB_TYPES_PORT:-55433}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/src/lib/database.types.ts"
DB_URL="postgres://postgres:test@localhost:${PORT}/chesstrainer"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

cleanup
docker run -d --name "$NAME" \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=chesstrainer \
  -p "$PORT":5432 postgres:16-alpine >/dev/null

# The default socket check is not enough: on first boot the image runs initdb
# behind a temporary server that answers over the socket and is then shut down
# before the real one starts, so a check that passes there hits "the database
# system is shutting down" a second later. That temporary server has
# listen_addresses empty, so a TCP check (-h localhost) only ever reaches the
# real server.
printf 'waiting for postgres'
ready=
for _ in $(seq 1 60); do
  if docker exec "$NAME" pg_isready -h localhost -U postgres -d chesstrainer -q; then
    ready=1
    break
  fi
  printf '.'
  sleep 1
done
echo
[ -n "$ready" ] || {
  echo "postgres did not accept TCP connections within 60s" >&2
  exit 1
}

apply() {
  docker cp "$1" "$NAME":/tmp/apply.sql >/dev/null
  docker exec -i "$NAME" psql -U postgres -d chesstrainer -v ON_ERROR_STOP=1 -q -f /tmp/apply.sql
}

apply "${ROOT}/supabase/tests/bootstrap.sql"
for file in "${ROOT}"/supabase/migrations/*.sql; do
  echo "applying $(basename "$file")"
  apply "$file"
done

# Run from a scratch directory: the CLI parses supabase/config.toml even for a
# --db-url run, and this project's config uses keys newer than the pinned CLI.
# The generator needs none of it — the connection string carries everything.
WORKDIR="$(mktemp -d)"
trap 'cleanup; rm -rf "$WORKDIR"' EXIT

echo "generating src/lib/database.types.ts with supabase CLI ${CLI_VERSION}"
( cd "$WORKDIR" && npx -y "supabase@${CLI_VERSION}" gen types typescript \
  --db-url "$DB_URL" --schema public ) > "$OUT"

echo "done"
