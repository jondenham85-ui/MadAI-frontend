import { neon } from "@neondatabase/serverless";

type JsonRecord = Record<string, unknown>;
type Env = Record<string, string | undefined>;

const env = (): Env => typeof process !== "undefined" ? process.env as Env : {};
const value = (key: string) => env()[key]?.trim() || "";
const allowedColumns: Record<string, string[]> = {
  madsi_facebook_oauth_states: ["state_hash", "owner_user_id", "expires_at", "created_at"],
  madsi_facebook_connections: ["owner_user_id", "page_id", "page_name", "page_access_token_ciphertext", "granted_scopes", "page_tasks", "status", "token_expires_at", "last_verified_at", "created_at", "updated_at"],
  madsi_facebook_publish_approvals: ["id", "owner_user_id", "message", "status", "expires_at", "consumed_at", "created_at"],
};
const filters = new Set(["state_hash", "owner_user_id", "status", "id", "expires_at", "consumed_at"]);

function selectedColumns(table: string, requested: string | null) {
  const allowed = allowedColumns[table];
  if (!allowed) throw new Error("DATABASE_REQUEST_FAILED");
  const columns = requested ? requested.split(",") : allowed;
  if (!columns.length || columns.some(column => !allowed.includes(column))) throw new Error("DATABASE_REQUEST_FAILED");
  return columns.map(column => '"' + column + '"').join(", ");
}

async function run<T extends JsonRecord>(statement: string, params: unknown[] = []): Promise<T[]> {
  const url = value("MADSI_DATABASE_URL");
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) throw new Error("DATABASE_NOT_CONFIGURED");
  try {
    const sql = neon(url);
    return await sql.query(statement, params) as T[];
  } catch {
    throw new Error("DATABASE_REQUEST_FAILED");
  }
}

/**
 * Facebook integration storage adapter.
 * When MADSI_DATABASE_URL is set, integration records are stored in Neon.
 * Without it, the existing Supabase REST store remains the production default.
 */
export async function facebookStorage(
  path: string,
  init: RequestInit,
  supabaseFallback: (path: string, init?: RequestInit) => Promise<any>,
): Promise<any> {
  const backend = value("MADSI_FACEBOOK_STORAGE_BACKEND") || "supabase";
  if (backend === "supabase") return supabaseFallback(path, init);
  if (backend !== "neon" || !value("MADSI_DATABASE_URL")) throw new Error("DATABASE_NOT_CONFIGURED");
  const [table, rawQuery = ""] = path.split("?");
  if (!allowedColumns[table]) {
    // Supabase is used only for the authenticated owner-profile read. Never
    // silently fall back to production for an unknown Facebook storage table.
    if (table === "profiles" && method === "GET") return supabaseFallback(path, init);
    throw new Error("DATABASE_REQUEST_FAILED");
  }
  const params = new URLSearchParams(rawQuery);
  const method = (init.method || "GET").toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) as JsonRecord : {};
  // PostgREST control parameters are not SQL filters. Validate each explicitly,
  // then translate only the supported filter subset into parameterized SQL.
  const requestedColumns = params.get("select");
  const limitRaw = params.get("limit");
  const conflictTarget = params.get("on_conflict");
  if (requestedColumns) selectedColumns(table, requestedColumns);
  const limit = limitRaw === null ? 1 : Number(limitRaw);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("DATABASE_REQUEST_FAILED");
  if (conflictTarget && !(table === "madsi_facebook_connections" && conflictTarget === "owner_user_id")) {
    throw new Error("DATABASE_REQUEST_FAILED");
  }
  const where: string[] = [];
  const values: unknown[] = [];
  for (const [key, raw] of params.entries()) {
    if (["select", "limit", "on_conflict"].includes(key)) continue;
    if (!filters.has(key)) throw new Error("DATABASE_REQUEST_FAILED");
    const operator = raw.startsWith("eq.") ? "=" : raw.startsWith("gt.") ? ">" : raw === "is.null" ? "IS NULL" : "";
    if (!operator) throw new Error("DATABASE_REQUEST_FAILED");
    if (operator === "IS NULL") where.push('"' + key + '" IS NULL');
    else {
      values.push(raw.slice(3));
      where.push('"' + key + '" ' + operator + " $" + values.length);
    }
  }
  const clause = where.length ? " WHERE " + where.join(" AND ") : "";
  const limitClause = " LIMIT " + limit;

  if (table === "madsi_facebook_oauth_states" && method === "POST") {
    await run("INSERT INTO public.madsi_facebook_oauth_states (state_hash, owner_user_id, expires_at) VALUES ($1, $2, $3)", [body.state_hash, body.owner_user_id, body.expires_at]);
    return null;
  }
  if (table === "madsi_facebook_oauth_states" && method === "GET") {
    return run("SELECT " + selectedColumns(table, params.get("select")) + " FROM public." + table + clause + limitClause, values);
  }
  if (table === "madsi_facebook_oauth_states" && method === "DELETE") {
    return run("DELETE FROM public." + table + clause + " RETURNING owner_user_id, expires_at", values);
  }

  if (table === "madsi_facebook_connections" && method === "POST") {
    const columns = ["owner_user_id", "page_id", "page_name", "page_access_token_ciphertext", "granted_scopes", "page_tasks", "status", "token_expires_at", "last_verified_at", "updated_at"];
    const insertValues = columns.map(column => body[column] ?? null);
    const placeholders = columns.map((_, index) => "$" + (index + 1));
    const updates = columns.filter(column => column !== "owner_user_id").map(column => '"' + column + '" = EXCLUDED."' + column + '"');
    await run("INSERT INTO public.madsi_facebook_connections (" + columns.map(column => '"' + column + '"').join(", ") + ") VALUES (" + placeholders.join(", ") + ") ON CONFLICT (owner_user_id) DO UPDATE SET " + updates.join(", "), insertValues);
    return null;
  }
  if (table === "madsi_facebook_connections" && method === "GET") {
    return run("SELECT " + selectedColumns(table, params.get("select")) + " FROM public." + table + clause + limitClause, values);
  }

  if (table === "madsi_facebook_publish_approvals" && method === "POST") {
    return run("INSERT INTO public.madsi_facebook_publish_approvals (owner_user_id, message, status, expires_at) VALUES ($1, $2, $3, $4) RETURNING id, expires_at", [body.owner_user_id, body.message, body.status, body.expires_at]);
  }
  if (table === "madsi_facebook_publish_approvals" && method === "GET") {
    return run("SELECT " + selectedColumns(table, params.get("select")) + " FROM public." + table + clause + limitClause, values);
  }
  if (table === "madsi_facebook_publish_approvals" && method === "PATCH") {
    const updates = body as JsonRecord;
    const keys = Object.keys(updates);
    if (!keys.length || keys.some(key => !["status", "consumed_at"].includes(key))) throw new Error("DATABASE_REQUEST_FAILED");
    const assignments = keys.map(key => '"' + key + '" = $' + (values.length + keys.indexOf(key) + 1));
    values.push(...keys.map(key => updates[key]));
    return run("UPDATE public." + table + " SET " + assignments.join(", ") + clause + " RETURNING id", values);
  }
  throw new Error("DATABASE_REQUEST_FAILED");
}
