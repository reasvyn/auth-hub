/**
 * Minimal stub of next/server for Jest tests (non-edge environment).
 * Provides NextResponse and NextRequest compatible shapes.
 */

export class NextResponse extends Response {
  static json(body: unknown, init?: ResponseInit): NextResponse {
    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  }

  static redirect(url: URL | string, init?: ResponseInit): NextResponse {
    return new NextResponse(null, {
      ...init,
      status: 302,
      headers: { location: url.toString(), ...(init?.headers ?? {}) },
    });
  }

  static next(init?: ResponseInit): NextResponse {
    return new NextResponse(null, { ...init, status: 200 });
  }
}

export class NextRequest extends Request {
  public nextUrl: URL;
  public cookies: { get: (name: string) => { value: string } | undefined };

  constructor(input: string | URL, init?: RequestInit & { cookies?: Record<string, string> }) {
    super(input, init);
    this.nextUrl = new URL(input.toString());
    const cookieMap: Record<string, string> = (init as { cookies?: Record<string, string> })?.cookies ?? {};
    this.cookies = {
      get: (name: string) => (cookieMap[name] ? { value: cookieMap[name] } : undefined),
    };
  }
}
