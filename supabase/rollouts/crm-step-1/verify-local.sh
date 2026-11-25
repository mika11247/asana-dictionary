#!/usr/bin/env bash
set -euo pipefail

# The disposable container has no published ports or external network.
initdb -D /tmp/crm-db -A trust >/dev/null
pg_ctl -D /tmp/crm-db -o '-k /tmp' -w start >/dev/null
psql -h /tmp -d postgres -f /crm-test/verify-local.sql
