import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "mad-ai-frontend",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-28",
    compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
    // Required by Cloudflare Workers Builds when its preview command is
    // "npx wrangler preview". Keep preview resources isolated from production.
    previews: {},
    observability: {
      enabled: true,
      headSamplingRate: 1,
      redactQueryString: true,
      logs: { enabled: true, headSamplingRate: 1 },
      traces: { enabled: true, headSamplingRate: 0.1 },
    },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
