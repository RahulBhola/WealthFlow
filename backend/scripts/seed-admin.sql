-- =========================================================================================
-- WealthFlow: Singleton Admin Seeding Script
-- INVARIANT: Exactly one Singleton Admin account exists in WealthFlow.
-- Self-service registration ONLY provisions 'User' accounts. Elevation via API returns 403.
-- This script must be executed manually by the database administrator in PostgreSQL.
-- =========================================================================================

-- Ensure the 'Admin' role exists in AspNetRoles
INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
VALUES ('22222222-2222-2222-2222-222222222222', 'Admin', 'ADMIN', gen_random_uuid()::text)
ON CONFLICT ("Id") DO NOTHING;

-- Ensure the 'User' role exists in AspNetRoles
INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
VALUES ('33333333-3333-3333-3333-333333333333', 'User', 'USER', gen_random_uuid()::text)
ON CONFLICT ("Id") DO NOTHING;

-- Seed the Singleton Admin User (Admin@123456)
-- Password hash generated using ASP.NET Core Identity PasswordHasher<ApplicationUser> (PBKDF2 with HMAC-SHA256, 100,000 iterations)
INSERT INTO "AspNetUsers" (
    "Id",
    "UserName",
    "NormalizedUserName",
    "Email",
    "NormalizedEmail",
    "EmailConfirmed",
    "PasswordHash",
    "SecurityStamp",
    "ConcurrencyStamp",
    "PhoneNumberConfirmed",
    "TwoFactorEnabled",
    "LockoutEnabled",
    "AccessFailedCount",
    "FirstName",
    "LastName",
    "Role",
    "CurrencyCode",
    "CreatedAtUtc"
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@wealthflow.local',
    'ADMIN@WEALTHFLOW.LOCAL',
    'admin@wealthflow.local',
    'ADMIN@WEALTHFLOW.LOCAL',
    TRUE,
    'AQAAAAIAAYagAAAAEG3g1V2h9f7v8k1lX...PLACEHOLDER...', -- Run ASP.NET Core PasswordHasher or generate via CLI
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    FALSE,
    FALSE,
    TRUE,
    0,
    'System',
    'Administrator',
    'Admin',
    'INR',
    NOW() AT TIME ZONE 'UTC'
)
ON CONFLICT ("Email") DO NOTHING;

-- Assign Admin Role to Singleton Admin
INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT DO NOTHING;

-- Verify Singleton Invariant
SELECT count(*) as "AdminCount" FROM "AspNetUsers" WHERE "Role" = 'Admin';
