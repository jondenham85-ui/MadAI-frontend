export default function OperationsDashboard() {
  const tasks = [
    "Monitor Revenue",
    "Track Inventory",
    "System Health Check",
    "User Management",
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
        OPERATIONS CENTER
      </h2>

      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div
            key={index}
            className="
            border
            border-cyan-500/20
            rounded-lg
            p-4
            "
          >
            {task}
          </div>
        ))}
      </div>
    </div>
  );
}
