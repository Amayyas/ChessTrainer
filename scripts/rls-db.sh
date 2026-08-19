#!/usr/bin/env bash
# Brings up a Postgres with the schema the policy tests need, then applies the
# bootstrap and every migration in order — the same order a fresh Supabase
# project would see, which is the point: the tests must run against what a
# deployment actually gets, not a hand-written copy of it.
set -euo pipefail

NAME=${RLS_DB_CONTAINER:-chesstrainer-rls}
PORT=${RLS_DB_PORT:-55432}

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=chesstrainer \
  -p "$PORT":5432 postgres:16-alpine >/dev/null

printf 'waiting for postgres'
for _ in $(seq 1 60); do
  if docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  printf '.'; sleep 1
done
echo

apply() {
  docker cp "$1" "$NAME":/tmp/apply.sql >/dev/null
  docker exec -i "$NAME" psql -U postgres -d chesstrainer -v ON_ERROR_STOP=1 -q -f /tmp/apply.sql
}

apply supabase/tests/bootstrap.sql
for file in supabase/migrations/*.sql; do
  echo "applying $(basename "$file")"
  apply "$file"
done

echo "ready on postgres://postgres:test@localhost:$PORT/chesstrainer"
