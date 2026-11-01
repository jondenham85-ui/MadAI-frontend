export default function AdminDashboard() {
  const authorityChain = [
    "Jon Denham",
    "Alison Denham",
    "Family Authority",
    "Administrator",
    "User",
  ];

  return (
    <section
      aria-labelledby="authority-chain-heading"
      className="space-y-6"
    >
      <div className="rounded-xl border border-cyan-500/30 bg-slate-950/70 p-6 shadow-lg shadow-cyan-950/20">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Governance
          </p>

          <h2
            id="authority-chain-heading"
            className="mt-2 text-xl font-bold tracking-wide text-white"
          >
            AUTHORITY CHAIN
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            The configured authority order for the MADAI admin control center.
          </p>
        </div>

        <ol className="space-y-3">
          {authorityChain.map((role, index) => (
            <li
              key={role}
              className="flex items-center gap-4 rounded-lg border border-cyan-500/20 bg-slate-900/80 p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-bold text-cyan-300">
                {index + 1}
              </span>

              <span className="font-medium text-slate-100">{role}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
