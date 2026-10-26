export default function QuickActions() {
  const buttons = [
    "OPEN SYNTH",
    "OPEN MEMORY",
    "OPEN REVENUE",
    "OPEN SHOPMAD",
    "SYSTEM HEALTH",
    "ADMIN PANEL",
  ];

  return (
    <div className="border border-cyan-500/30 rounded-xl p-6 bg-black/60">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
        QUICK ACTIONS
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {buttons.map((label) => (
          <button
            key={label}
            className="
            border
            border-cyan-500/30
            rounded-lg
            p-4
            text-cyan-300
            hover:bg-cyan-500/10
            transition
            "
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
