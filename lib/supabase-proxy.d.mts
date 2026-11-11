export function hasSessionCookie(header: string | null): boolean;
export function createApiProxy(kind?: 'main' | 'agents', fetcher?: typeof fetch): (request: Request, segments: string[]) => Promise<Response>;
