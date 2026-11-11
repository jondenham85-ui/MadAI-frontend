export type Agent = 'core' | 'revenue' | 'funnel' | 'task';
export type Run = { id: string; agent: string; status: string; prompt?: string; result?: unknown; error?: string; created_at?: string };
export const OWNER_COMMANDS: ReadonlyArray<Readonly<{id: string; title: string; agent: Agent; prompt: string}>>;
export class AgentApiError extends Error { status: number; constructor(status: number, message: string); }
export function requestAgents<T = Record<string, unknown>>(path: string, options?: RequestInit, fetcher?: typeof fetch): Promise<T>;
export function readRun(value: unknown): Run;
