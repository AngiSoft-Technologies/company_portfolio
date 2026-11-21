import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import prisma from '../../../db';
import { newId, ts } from '../../../prisma/db';
import { consumeChallenge, createPasskeyChallenge, validPasskeyChallenge } from './mfa';

type EmployeeLike = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  twoFactorEnabled: boolean;
};

function rpConfig() {
  const production = process.env.NODE_ENV === 'production';
  return {
    rpID: process.env.WEB_AUTHN_RP_ID || (production ? 'admin.angisoft.co.ke' : 'localhost'),
    rpName: process.env.WEB_AUTHN_RP_NAME || 'AngiSoft Admin',
    origins: (process.env.WEB_AUTHN_ORIGIN || (production ? 'https://admin.angisoft.co.ke' : 'http://localhost:5174'))
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

function toBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value: string): any {
  return Uint8Array.from(Buffer.from(value, 'base64url'));
}

export async function registrationOptions(employee: EmployeeLike, preferRemote = false) {
  const { rpID, rpName, origins } = rpConfig();
  const existing = await prisma.orm.public.WebAuthnCredential.where({ employeeId: employee.id }).all();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: employee.email,
    userDisplayName: [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.email,
    attestationType: 'none',
    // `remoteDevice` makes the browser offer its cross-device QR/hybrid flow,
    // so the user can approve with a phone fingerprint or Face ID.
    ...(preferRemote ? { preferredAuthenticatorType: 'remoteDevice' as const } : {}),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    excludeCredentials: existing.map((cred) => ({
      id: cred.credentialId,
      transports: (cred.transports || []) as any,
    })),
  });
  const challenge = await createPasskeyChallenge(employee, 'PASSKEY_REGISTER', options.challenge);
  return { ...options, challengeId: challenge.challengeId, origins };
}

export async function verifyRegistration(employee: EmployeeLike, challengeId: string, response: any) {
  const challenge = await validPasskeyChallenge(challengeId, 'PASSKEY_REGISTER', employee.id);
  if (!challenge) return null;
  const { rpID, origins } = rpConfig();
  const expectedChallenge = challenge.challenge as string;
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origins,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) return null;

  const info = verification.registrationInfo;
  const credentialId = info.credential.id;
  const publicKey = toBase64Url(info.credential.publicKey);
  const transports = Array.isArray(response?.response?.transports) ? response.response.transports : [];
  await prisma.orm.public.WebAuthnCredential.create({
    id: newId(),
    employeeId: employee.id,
    credentialId,
    publicKey,
    counter: info.credential.counter,
    transports: transports as string[],
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    createdAt: ts(),
  });
  await consumeChallenge(challengeId);
  return { credentialId };
}

export async function authenticationOptions(employee: EmployeeLike) {
  const { rpID } = rpConfig();
  const credentials = await prisma.orm.public.WebAuthnCredential.where({ employeeId: employee.id }).all();
  if (!credentials.length) return null;
  const options = await generateAuthenticationOptions({
    rpID,
    timeout: 60_000,
    userVerification: 'required',
    allowCredentials: credentials.map((cred) => ({
      id: cred.credentialId,
      transports: (cred.transports || []) as any,
    })),
  });
  const challenge = await createPasskeyChallenge(employee, 'PASSKEY', options.challenge);
  return { ...options, challengeId: challenge.challengeId };
}

export async function verifyAuthentication(employee: EmployeeLike, challengeId: string, response: any) {
  const challenge = await validPasskeyChallenge(challengeId, 'PASSKEY', employee.id);
  if (!challenge || !response?.id) return null;
  const credential = await prisma.orm.public.WebAuthnCredential.where({ credentialId: String(response.id) }).first();
  if (!credential || credential.employeeId !== employee.id) return null;
  const { rpID, origins } = rpConfig();
  const expectedChallenge = challenge.challenge as string;
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origins,
    expectedRPID: rpID,
    credential: {
      id: credential.credentialId,
      publicKey: fromBase64Url(credential.publicKey),
      counter: credential.counter,
      transports: (credential.transports || []) as any,
    },
    requireUserVerification: true,
  });
  if (!verification.verified) return null;
  await prisma.orm.public.WebAuthnCredential.where({ id: credential.id }).update({
    counter: verification.authenticationInfo.newCounter,
    backedUp: verification.authenticationInfo.credentialBackedUp,
  });
  await consumeChallenge(challengeId);
  return true;
}
