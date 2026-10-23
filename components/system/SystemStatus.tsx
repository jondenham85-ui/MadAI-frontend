export default function SystemStatus() {
  const systems = [
    {
      name: "Frontend",
      status: "ONLINE",
    },
    {
      name: "Backend",
      status: "OFFLINE",
    },
    {
      name: "Database",
      status: "OFFLINE",
    },
    {
      name: "Memory Engine",
      status: "OFFLINE",
    },
    {
      name: "ShopMAD",
      status: "OFFLINE",
    },
    {
      name: "Revenue Engine",
      status: "OFFLINE",
    },
  ];

  return (
    <div
      className="
      border
      border-cyan-500/30
      rounded-xl
      p-6
      bg-black
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
        SYSTEM STATUS
      </h2>

      <div className="space-y-3">
        {systems.map((system) => (
          <div
            key={system.name}
            className="
            flex
            justify-between
            items-center
            border
            border-cyan-500/20
            rounded-lg
            p-4
            "
          >
            <span className="text-cyan-300">
              {system.name}
            </span>

            <span
              className={
                system.status === "ONLINE"
                  ? "text-green-400 font-bold"
                  : "text-red-400 font-bold"
              }
            >
              {system.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
