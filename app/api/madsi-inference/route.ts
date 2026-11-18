export const runtime = 'nodejs';
export const maxDuration = 60;

type RequestShape = {
  kind: 'chat' | 'task';
  prompt: string;
  conversationId: string | null;
  build: boolean;
};

type InferenceBody = {
  requestKey: string;
  request: RequestShape;
  history?: Array<{ role: string; content: string }>;
  context?: string;
  account?: { name?: string; role?: string };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function workerUrl() {
  return process.env.MADSI_CLOUDFLARE_WORKER_URL?.replace(/\/+$/, '');
}

export async function GET() {
  const endpoint = workerUrl();
  if (!endpoint) return json(503, { status: 'not-configured', service: 'MADSI Cloudflare inference' });
  try {
    const response = await fetch(endpoint + '/health', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    const health = await response.json().catch(() => null) as
      | { status?: string; provider?: string; model?: string }
      | null;
    if (!response.ok || health?.status !== 'ready') {
      return json(503, { status: 'unavailable', service: 'MADSI Cloudflare inference' });
    }
    return json(200, {
      status: 'ready',
      service: 'MADSI managed inference',
      provider: health.provider,
      model: health.model,
    });
  } catch {
    return json(503, { status: 'unavailable', service: 'MADSI Cloudflare inference' });
  }
}

export async function POST(request: Request) {
  // This endpoint is a server-to-server hop from the authenticated MADSI API.
  // Browser-origin requests are not accepted.
  if (request.headers.get('origin')) return json(403, { error: 'Forbidden' });

  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/i.test(authorization)) {
    return json(401, { error: 'Authentication required' });
  }

  const length = Number(request.headers.get('content-length') || 0);
  if (length > 100_000) return json(413, { error: 'Request too large' });

  let body: InferenceBody;
  try {
    body = await request.json() as InferenceBody;
  } catch {
    return json(400, { error: 'Invalid request' });
  }

  const item = body?.request;
  if (!UUID.test(body?.requestKey || '') || !item || !['chat', 'task'].includes(item.kind) ||
      typeof item.prompt !== 'string' || !item.prompt.trim() || item.prompt.length > 16_000 ||
      (item.conversationId !== null && typeof item.conversationId !== 'string') ||
      typeof item.build !== 'boolean' || (item.kind === 'chat' && item.build)) {
    return json(400, { error: 'Invalid request' });
  }

  const normalized: RequestShape = {
    kind: item.kind,
    prompt: item.prompt.trim(),
    conversationId: item.conversationId ?? null,
    build: item.build === true,
  };
  const requestHash = await sha256(JSON.stringify(normalized));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const endpoint = workerUrl();
  if (!supabaseUrl || !supabaseKey) return json(503, { error: 'MADSI authentication service unavailable' });
  if (!endpoint) return json(503, { error: 'MADSI Cloudflare intelligence is not configured' });

  // Confirm the UUID belongs to a live, server-created usage reservation and
  // that its hash exactly matches the original request.
  let reservationResponse: Response;
  try {
    reservationResponse = await fetch(
      `${supabaseUrl}/functions/v1/madsi-api/api/ai/reservation?id=${encodeURIComponent(body.requestKey)}`,
      {
        method: 'GET',
        headers: { apikey: supabaseKey, Authorization: authorization, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      },
    );
  } catch {
    return json(503, { error: 'MADSI could not verify this request' });
  }
  if (!reservationResponse.ok) return json(reservationResponse.status === 404 ? 403 : 503, { error: 'MADSI request authorization failed' });

  const reservation = await reservationResponse.json().catch(() => null) as
    | { reservation?: { kind?: string; requestHash?: string; buildRequested?: boolean } }
    | null;
  if (reservation?.reservation?.kind !== normalized.kind ||
      reservation.reservation.requestHash !== requestHash ||
      reservation.reservation.buildRequested !== normalized.build) {
    return json(403, { error: 'MADSI request authorization failed' });
  }

  const history = Array.isArray(body.history)
    ? body.history.slice(-10).filter(message =>
        message && ['user', 'assistant'].includes(message.role) &&
        typeof message.content === 'string' && message.content.length <= 40_000)
    : [];
  const context = typeof body.context === 'string' ? body.context.slice(0, 12_000) : '';
  const displayName = typeof body.account?.name === 'string' ? body.account.name.slice(0, 120) : '';
  const role = body.account?.role === 'OWNER' ? 'OWNER' : 'USER';

  try {
    const response = await fetch(endpoint + '/v1/inference', {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        requestKey: body.requestKey,
        request: normalized,
        history,
        context,
        account: { name: displayName, role },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(50_000),
    });
    const payload = await response.json().catch(() => null) as { answer?: unknown; error?: unknown } | null;
    if (!response.ok) {
      const status = [400, 401, 403, 413].includes(response.status) ? response.status : 503;
      return json(status, {
        error: typeof payload?.error === 'string' ? payload.error : 'MADSI Cloudflare intelligence is temporarily unavailable',
      });
    }
    if (typeof payload?.answer !== 'string' || !payload.answer.trim()) {
      return json(502, { error: 'MADSI received an empty intelligence response' });
    }
    return json(200, { answer: payload.answer.trim() });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    console.error('MADSI_CLOUDFLARE_INFERENCE_FAILED', { errorName: error instanceof Error ? error.name : 'Error' });
    return json(timedOut ? 504 : 503, {
      error: timedOut ? 'MADSI Cloudflare inference timed out' : 'MADSI Cloudflare intelligence is temporarily unavailable',
    });
  }
}
