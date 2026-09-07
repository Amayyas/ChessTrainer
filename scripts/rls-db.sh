#!/usr/bin/env bash
# Brings up a Postgres with the schema the policy tests need, then applies the
# bootstrap and every migration in order — the same order a fresh Supabase
# project would see, which is the point: the tests must run against what a
# deployment actually gets, not a hand-written copy of it.
#
# Leaves the container running so `npm run test:watch`-style loops reuse it.
# `npm run ci` calls this then `npm run test:rls`; a stray container is
# harmless and the next run removes it.
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=scripts/pg-lib.sh
source scripts/pg-lib.sh

NAME=${RLS_DB_CONTAINER:-chesstrainer-rls}
PORT=${RLS_DB_PORT:-55432}

pg_up "$NAME" "$PORT"

echo "ready on postgres://postgres:test@localhost:$PORT/chesstrainer"
