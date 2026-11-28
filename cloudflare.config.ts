import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

export default defineConfig(({ isPreview }) => ({
  worker: defineWorker({
    entrypoint: "./worker/index.ts",
    triggers: isPreview ? [] : [triggers.scheduled({ schedule: "*/5 * * * *" })],
    name: "mad-ai-frontend",
    compatibilityDate: "2026-11-28",
    compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
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
}));
