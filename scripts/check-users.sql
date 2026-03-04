-- ChemLab LK: List users
\echo '=== Teachers ==='
SELECT email, name FROM "Teacher";

\echo ''
\echo '=== Students ==='
SELECT "indexNumber", name FROM "Student";
