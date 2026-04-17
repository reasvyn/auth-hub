import type { MFASetupData, TwoFactorMethod } from '@reasvyn/auth-types';
import type { HttpClient } from '../http/HttpClient';

export interface BackupCodesResponse {
  codes: string[];
}

export class MFAModule {
  constructor(private http: HttpClient) {}

  setup(method: TwoFactorMethod): Promise<MFASetupData> {
    return this.http.post<MFASetupData>('/mfa/setup', { method });
  }

  verify(code: string, method: TwoFactorMethod): Promise<void> {
    return this.http.post<void>('/mfa/verify', { code, method });
  }

  disable(method: TwoFactorMethod, code: string): Promise<void> {
    return this.http.post<void>('/mfa/disable', { method, code });
  }

  regenerateBackupCodes(code: string): Promise<BackupCodesResponse> {
    return this.http.post<BackupCodesResponse>('/mfa/backup-codes', { code });
  }

  listMethods(): Promise<{ enabled: TwoFactorMethod[]; primary?: TwoFactorMethod }> {
    return this.http.get<{ enabled: TwoFactorMethod[]; primary?: TwoFactorMethod }>('/mfa');
  }
}
