import { createApiProxy } from '@/lib/supabase-proxy.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;
const proxy = createApiProxy('main');
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  return proxy(request, (await context.params).path);
}
export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE, handle as OPTIONS };
