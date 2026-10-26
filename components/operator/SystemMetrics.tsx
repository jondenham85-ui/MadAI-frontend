export default function SystemMetrics() {
  const metrics = [
    {
      label: "CPU",
      value: "12%",
    },
    {
      label: "Memory",
      value: "28%",
    },
    {
      label: "Network",
      value: "Stable",
    },
    {
      label: "Uptime",
      value: "99.9%",
    },
  ];

  return (
    <div className="border border-cyan-500/30 rounded-xl p-6 bg-black/60">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
        SYSTEM METRICS
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="border border-cyan-500/20 rounded-lg p-4"
          >
            <div className="text-cyan-600">
              {metric.label}
            </div>

            <div className="text-2xl font-bold text-cyan-300">
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
