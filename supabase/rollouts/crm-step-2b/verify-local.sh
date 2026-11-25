#!/usr/bin/env bash
set -euo pipefail
initdb -D /tmp/crm-db -A trust >/dev/null
pg_ctl -D /tmp/crm-db -o '-c listen_addresses= -k /tmp' -w start >/dev/null
psql -X -h /tmp -d postgres -f /crm-test/crm-step-2b/verify-local.sql
