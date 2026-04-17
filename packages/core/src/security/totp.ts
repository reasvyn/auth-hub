/**
 * 2FA/TOTP utilities using speakeasy
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

import type { MFASetupData } from '@reasvyn/auth-types';

export interface TOTPOptions {
  issuer: string;
  accountName: string;
  digits?: number;
  period?: number;
  algorithm?: 'sha1' | 'sha256' | 'sha512';
}

/**
 * Generate a new TOTP secret and setup data
 */
export async function generateTOTPSecret(options: TOTPOptions): Promise<MFASetupData> {
  const { issuer, accountName, digits = 6, period = 30, algorithm = 'sha1' } = options;

  const secret = speakeasy.generateSecret({
    name: `${issuer}:${accountName}`,
    issuer,
    length: 32,
  });

  const otpAuthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    label: accountName,
    issuer,
    type: 'totp',
    digits,
    period,
    algorithm,
    encoding: 'base32',
  });

  const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);
  const backupCodes = generateBackupCodes();

  return {
    method: 'totp',
    secret: secret.base32,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * Verify a TOTP code
 */
export function verifyTOTPCode(
  code: string,
  secret: string,
  options: { window?: number; digits?: number; period?: number } = {},
): boolean {
  const { window = 1, digits = 6, period = 30 } = options;

  return speakeasy.totp.verify({
    secret,
    token: code,
    encoding: 'base32',
    window,
    digits,
    step: period,
  });
}

/**
 * Generate a one-time backup codes set
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Format: XXXXX-XXXXX
    const part1 = Math.random().toString(36).substring(2, 7).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 7).toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}
