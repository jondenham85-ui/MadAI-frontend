import Header from "@/components/layout/Header";
import SynthConsole from "@/components/synth/SynthConsole";

export default function SynthPage() {
  return (
    <>
      <Header />

      <main className="relative px-4 py-8 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_38%)]" />

        <div className="relative mx-auto max-w-6xl space-y-8">
          <section className="rounded-3xl border border-cyan-500/20 bg-black/60 p-6 shadow-[0_0_40px_rgba(34,211,238,0.12)] backdrop-blur-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
                  MADSI // SYSTEM ONLINE
                </div>

                <h1 className="text-4xl font-black tracking-tight text-cyan-300 sm:text-5xl lg:text-6xl">
                  SYNTH CORE
                </h1>

                <p className="max-w-xl text-sm text-cyan-100/80 sm:text-base">
                  Directives, system actions, and autonomous operator workflows routed through the MADSI command layer.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-left sm:gap-4">
                {[
                  ["STATUS", "READY"],
                  ["LATENCY", "12ms"],
                  ["CORE", "MADSI"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-3 sm:px-4"
                  >
                    <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/80">{label}</div>
                    <div className="mt-2 text-sm font-bold text-cyan-100">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <SynthConsole />
        </div>
      </main>
    </>
  );
}
