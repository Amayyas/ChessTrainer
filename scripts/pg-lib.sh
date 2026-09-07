# Shared by rls-db.sh and gen-db-types.sh — source it, do not run it.
#
# `pg_up <container-name> <host-port>` removes any old container of that name,
# starts postgres:16-alpine, waits for the real server, and applies the
# bootstrap plus every migration in the order a fresh Supabase project would.
# The container is left running; the caller decides when to remove it.

pg_up() {
  local name="$1" port="$2"
  local root
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  docker rm -f "$name" >/dev/null 2>&1 || true
  docker run -d --name "$name" \
    -e POSTGRES_PASSWORD=test -e POSTGRES_DB=chesstrainer \
    -p "$port":5432 postgres:16-alpine >/dev/null

  # The default socket check passes against initdb's throwaway server moments
  # before it is torn down ("the database system is shutting down"). That server
  # has listen_addresses empty, so a TCP check (-h localhost) only ever reaches
  # the real one, and querying the target database confirms it was created.
  printf 'waiting for postgres'
  local ready= _
  for _ in $(seq 1 60); do
    if docker exec "$name" pg_isready -h localhost -U postgres -d chesstrainer -q; then
      ready=1
      break
    fi
    printf '.'
    sleep 1
  done
  echo
  [ -n "$ready" ] || {
    echo "postgres did not accept TCP connections within 60s" >&2
    return 1
  }

  local file
  docker cp "$root/supabase/tests/bootstrap.sql" "$name":/tmp/apply.sql >/dev/null
  docker exec -i "$name" psql -U postgres -d chesstrainer -v ON_ERROR_STOP=1 -q -f /tmp/apply.sql
  for file in "$root"/supabase/migrations/*.sql; do
    echo "applying $(basename "$file")"
    docker cp "$file" "$name":/tmp/apply.sql >/dev/null
    docker exec -i "$name" psql -U postgres -d chesstrainer -v ON_ERROR_STOP=1 -q -f /tmp/apply.sql
  done
}
