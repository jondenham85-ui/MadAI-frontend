export default function MemorySnapshot() {
  const memoryBlocks = [
    { label: "Active Context", value: "14.8 GB" },
    { label: "Vector Store", value: "6.3 GB" },
    { label: "Session Cache", value: "2.9 GB" },
    { label: "Free Pool", value: "61%" },
  ];

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-black/60 p-6 backdrop-blur-sm">
      <h2 className="mb-4 text-2xl font-bold uppercase tracking-wide text-cyan-300">
        Memory Snapshot
      </h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {memoryBlocks.map((block) => (
          <div
            key={block.label}
            className="rounded-lg border border-cyan-500/20 bg-slate-950/60 p-4"
          >
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-600">
              {block.label}
            </div>
            <div className="mt-3 text-xl font-bold text-cyan-300">{block.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
