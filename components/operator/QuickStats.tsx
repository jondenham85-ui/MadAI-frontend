export default function QuickStats() {
  const stats = [
    { label: "Cognition", value: "94%" },
    { label: "Latency", value: "42ms" },
    { label: "Throughput", value: "1.8M" },
    { label: "Accuracy", value: "99.1%" },
  ];

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-black/60 p-6 backdrop-blur-sm">
      <h2 className="mb-4 text-2xl font-bold uppercase tracking-wide text-cyan-300">
        Quick Stats
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-cyan-500/20 bg-slate-950/60 p-4"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-600">
              {stat.label}
            </div>
            <div className="mt-3 text-2xl font-bold text-cyan-300">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
