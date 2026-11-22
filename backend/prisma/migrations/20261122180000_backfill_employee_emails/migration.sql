-- Backfill EmployeeEmail from Employee.email and additionalEmails
INSERT INTO "EmployeeEmail" ("id","employeeId","email","isPrimary","verifiedAt","source","createdAt","updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || e."id" || e."email"), e."id", lower(trim(e."email")), true, COALESCE(e."acceptedAt", e."createdAt", CURRENT_TIMESTAMP), 'migration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Employee" e
WHERE e."email" IS NOT NULL AND trim(e."email") <> ''
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "EmployeeEmail" ("id","employeeId","email","isPrimary","verifiedAt","source","createdAt","updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || e."id" || ae), e."id", lower(trim(ae)), false, COALESCE(e."acceptedAt", e."createdAt", CURRENT_TIMESTAMP), 'migration-additional', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Employee" e, unnest(COALESCE(e."additionalEmails", ARRAY[]::TEXT[])) AS ae
WHERE trim(ae) <> ''
ON CONFLICT ("email") DO NOTHING;
