/**
 * 2FA/TOTP utilities using speakeasy
 */

import type { MFASetupData } from '@reasvyn/auth-types';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';

import { AUTH_CONSTANTS } from '../utils/constants';

import { generateRecoveryCodes } from './credential-security';

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
  const {
    issuer,
    accountName,
    digits = AUTH_CONSTANTS.TOTP_DIGITS,
    period = AUTH_CONSTANTS.TOTP_PERIOD,
    algorithm = 'sha1',
  } = options;

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
  const {
    window = AUTH_CONSTANTS.TOTP_WINDOW,
    digits = AUTH_CONSTANTS.TOTP_DIGITS,
    period = AUTH_CONSTANTS.TOTP_PERIOD,
  } = options;

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
export function generateBackupCodes(count: number = AUTH_CONSTANTS.BACKUP_CODE_COUNT): string[] {
  return generateRecoveryCodes({
    count,
    segments: AUTH_CONSTANTS.RECOVERY_CODE_SEGMENTS,
    segmentLength: AUTH_CONSTANTS.RECOVERY_CODE_SEGMENT_LENGTH,
  });
}
