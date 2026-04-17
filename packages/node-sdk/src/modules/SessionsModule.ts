import type { ActiveSession } from '@reasvyn/auth-types';

import type { HttpClient } from '../http/HttpClient';

export class SessionsModule {
  constructor(private http: HttpClient) {}

  list(): Promise<ActiveSession[]> {
    return this.http.get<ActiveSession[]>('/sessions');
  }

  revoke(sessionId: string): Promise<void> {
    return this.http.delete<void>(`/sessions/${sessionId}`);
  }

  revokeAll(): Promise<void> {
    return this.http.delete<void>('/sessions');
  }

  current(): Promise<ActiveSession> {
    return this.http.get<ActiveSession>('/sessions/current');
  }
}
