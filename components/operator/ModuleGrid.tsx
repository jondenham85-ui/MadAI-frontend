export default function ModuleGrid() {
  const modules = [
    "Synth",
    "Memory",
    "Voice",
    "Operations",
    "Revenue",
    "Analytics",
    "ShopMAD",
    "System",
  ];

  return (
    <div
      className="
      grid
      grid-cols-2
      md:grid-cols-4
      gap-4
      "
    >
      {modules.map((module) => (
        <div
          key={module}
          className="
          p-6
          rounded-xl
          border
          border-cyan-500/30
          bg-black/60
          text-center
          "
        >
          <div className="text-cyan-300">
            {module}
          </div>
        </div>
      ))}
    </div>
  );
}
