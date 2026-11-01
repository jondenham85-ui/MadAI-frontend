export default function SystemPulse() {
  const bars = [42, 68, 58, 82, 74, 90, 62, 88];

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-black/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
          System Pulse
        </div>
        <div className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_12px_rgba(34,197,94,0.9)]" />
      </div>

      <div className="flex h-16 items-end gap-2">
        {bars.map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-md bg-gradient-to-t from-cyan-500/70 to-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
            style={{
              height: `${height}%`,
              animationDelay: `${index * 120}ms`,
              animationDuration: "1.2s",
              animationName: "pulse",
              animationIterationCount: "infinite",
            }}
          />
        ))}
      </div>
    </div>
  );
}
