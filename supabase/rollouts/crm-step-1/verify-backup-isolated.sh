#!/usr/bin/env bash
set -euo pipefail
cd /backup
tr -d '\r' < SHA256SUMS.txt | sha256sum -c
pg_restore --list database.dump >/tmp/archive-list
pg_restore --file=/dev/null database.dump
echo 'Archive scan: OK'

initdb -D /tmp/restore-db -U restore_verifier -A trust >/tmp/init.log 2>&1
pg_ctl -D /tmp/restore-db -o "-c listen_addresses= -k /tmp" -w start >/tmp/start.log 2>&1
export PGHOST=/tmp PGUSER=restore_verifier PGDATABASE=postgres
# Preserve membership options, using the isolated server's bootstrap grantor.
sed '/^GRANT /s/ GRANTED BY supabase_admin;$/;/' roles-no-passwords.sql >/tmp/roles-restore.sql
if ! psql -X -v ON_ERROR_STOP=1 -f /tmp/roles-restore.sql >/tmp/roles.log 2>&1; then
  echo 'Role restore failed'
  grep -Eo 'roles-restore.sql:[0-9]+: ERROR:[^[:cntrl:]]*' /tmp/roles.log | cut -d: -f1-2 || true
  grep -Eo 'permission denied[^[:cntrl:]]*|reserved role[^[:cntrl:]]*' /tmp/roles.log | head -3 || true
  grep -Eo 'role "[a-zA-Z0-9_]+" (already exists|does not exist)|permission denied|syntax error' /tmp/roles.log | sort -u || true
  exit 1
fi
if ! pg_restore --exit-on-error --single-transaction --dbname=postgres database.dump >/tmp/restore.log 2>&1; then
  echo 'Archive restore failed'
  grep -Eo '(role|schema|extension|relation|function) "[a-zA-Z0-9_.]+" (already exists|does not exist|is not available)|permission denied|syntax error' /tmp/restore.log | sort -u || true
  exit 1
fi
psql -X -Atq -v ON_ERROR_STOP=1 -f /verification/verify-backup-catalog.sql
pg_ctl -D /tmp/restore-db -m fast -w stop >/dev/null
