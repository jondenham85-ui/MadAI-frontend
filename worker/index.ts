import handler from "vinext/server/fetch-handler";

type WorkerEnv = {
  MADSI_FACEBOOK_PROCESSOR_SECRET?: string;
};

type ScheduledController = {
  cron: string;
  scheduledTime: number;
};

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

/**
 * Custom Worker entry: preserve Vinext's HTTP handler and add a scheduled
 * invocation for the protected Facebook inbox processor.
 */
export default {
  fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext): Promise<Response> {
    return handler.fetch(request, env, ctx);
  },

  async scheduled(
    controller: ScheduledController,
    env: WorkerEnv,
    ctx: WorkerExecutionContext,
  ): Promise<void> {
    const secret = env.MADSI_FACEBOOK_PROCESSOR_SECRET;
    if (!secret) {
      console.warn("MADSI Facebook processor skipped: processor secret is not configured.");
      return;
    }

    const request = new Request("https://madsi-internal.invalid/api/facebook/process", {
      method: "POST",
      headers: { Authorization: "Bearer " + secret },
    });
    const response = await handler.fetch(request, env, ctx);
    if (!response.ok) {
      throw new Error("MADSI Facebook event processor returned HTTP " + response.status);
    }

    const result = await response.json().catch(() => ({})) as {
      processed?: number;
      skipped?: number;
      failed?: number;
      mode?: string;
    };
    console.log("MADSI Facebook event processor completed", {
      cron: controller.cron,
      scheduled_at: new Date(controller.scheduledTime).toISOString(),
      processed: Number(result.processed || 0),
      skipped: Number(result.skipped || 0),
      failed: Number(result.failed || 0),
      mode: result.mode || "unknown",
    });
  },
};
