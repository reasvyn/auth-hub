/**
 * Session-related type definitions
 */

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  device?: SessionDevice;
  metadata?: SessionMetadata;
}

export interface SessionDevice {
  userAgent?: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  isMobile?: boolean;
  fingerprint?: string;
}

export interface SessionMetadata {
  loginMethod: 'email' | 'oauth' | 'magic_link' | 'refresh';
  provider?: string;
  country?: string;
  city?: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  permissions?: string[];
  custom?: Record<string, unknown>;
}

export interface ActiveSession {
  id: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  device?: SessionDevice;
  isCurrent: boolean;
}
