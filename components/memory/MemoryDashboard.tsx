export default function MemoryDashboard() {
  const memories = [
    "Owner: Jon Denham",
    "Co-Owner: Alison Denham",
    "ShopMAD Ecosystem",
    "MADSI Core Active",
  ];

  return (
    <div
      className="
      bg-black
      border
      border-cyan-500/30
      rounded-xl
      p-6
      "
    >
      <h2
        className="
        text-2xl
        font-bold
        text-cyan-300
        mb-6
        "
      >
        MEMORY DASHBOARD
      </h2>

      <div className="space-y-3">
        {memories.map((memory, index) => (
          <div
            key={index}
            className="
            border
            border-cyan-500/20
            rounded-lg
            p-4
            text-cyan-300
            "
          >
            {memory}
          </div>
        ))}
      </div>
    </div>
  );
}
