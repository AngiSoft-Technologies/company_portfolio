-- Multi-factor authentication: TOTP already existed; this adds pluggable
-- email/SMS/WhatsApp OTP, passkeys/WebAuthn, and "remember this device".
-- Additive-only and defensive because the live Neon schema has drifted from
-- older db pushes; `migrate dev` resets are not an option in production.

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "mfaRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "remember" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "MfaMethod" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "destination" TEXT,
    "credentialId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "MfaMethod_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MfaMethod_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MfaMethod_employeeId_type_idx" ON "MfaMethod"("employeeId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "MfaMethod_credentialId_key" ON "MfaMethod"("credentialId");

CREATE TABLE IF NOT EXISTS "MfaChallenge" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "destination" TEXT,
    "codeHash" TEXT,
    "challenge" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MfaChallenge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MfaChallenge_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MfaChallenge_employeeId_method_idx" ON "MfaChallenge"("employeeId", "method");

CREATE TABLE IF NOT EXISTS "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "deviceType" TEXT,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WebAuthnCredential_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "WebAuthnCredential_employeeId_idx" ON "WebAuthnCredential"("employeeId");
CREATE UNIQUE INDEX IF NOT EXISTS "WebAuthnCredential_credentialId_key" ON "WebAuthnCredential"("credentialId");
