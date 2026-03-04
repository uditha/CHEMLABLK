#!/bin/bash
# Check users in ChemLab LK database
# Run: ./scripts/check-users.sh
# Or: docker compose exec postgres psql -U chemlab_user -d chemlab_lk -f - < scripts/check-users.sql

echo "=== Teachers ==="
docker compose exec postgres psql -U chemlab_user -d chemlab_lk -t -c 'SELECT email || '\'' — '\'' || name FROM "Teacher";'

echo ""
echo "=== Students ==="
docker compose exec postgres psql -U chemlab_user -d chemlab_lk -t -c 'SELECT "indexNumber" || '\'' — '\'' || name FROM "Student";'
