import { HttpClient } from './http/HttpClient';
import { AuthModule } from './modules/AuthModule';
import { UsersModule } from './modules/UsersModule';
import { SessionsModule } from './modules/SessionsModule';
import { MFAModule } from './modules/MFAModule';

export interface AuthHubClientConfig {
  /** Base URL of your auth server. Example: 'https://auth.myapp.com' */
  baseUrl: string;
  /** Optional default headers (e.g. x-client-id) */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds. Default: 10000 */
  timeout?: number;
}

export class AuthHubClient {
  private http: HttpClient;

  readonly auth: AuthModule;
  readonly users: UsersModule;
  readonly sessions: SessionsModule;
  readonly mfa: MFAModule;

  constructor(config: AuthHubClientConfig) {
    this.http = new HttpClient({
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      headers: config.headers,
    });

    this.auth = new AuthModule(this.http);
    this.users = new UsersModule(this.http);
    this.sessions = new SessionsModule(this.http);
    this.mfa = new MFAModule(this.http);
  }

  /**
   * Set the access token used for authenticated requests.
   * Call this after login / token refresh.
   */
  setAccessToken(token: string | null) {
    this.http.setAccessToken(token);
    return this;
  }
}
