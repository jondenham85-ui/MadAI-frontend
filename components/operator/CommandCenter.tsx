"use client";

export default function CommandCenter() {
  const actions = [
    "Synth Core Initialized",
    "Memory Engine Active",
    "Revenue Monitor Running",
    "ShopMAD Connected",
  ];

  const notifications = [
    "No critical alerts",
    "System operating normally",
    "Awaiting backend connection",
  ];

  return (
    <div
      className="
      border
      border-cyan-500/30
      rounded-xl
      bg-black/60
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
        COMMAND CENTER
      </h2>

      <div
        className="
        grid
        grid-cols-1
        lg:grid-cols-3
        gap-6
        "
      >
        {/* Synth Console */}

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <h3
            className="
            text-cyan-300
            font-bold
            mb-3
            "
          >
            SYNTH CORE
          </h3>

          <div
            className="
            text-cyan-500
            text-sm
            "
          >
            Ready for directives.
          </div>

          <input
            placeholder="Enter directive..."
            className="
            w-full
            mt-4
            p-3
            bg-black
            border
            border-cyan-500/20
            rounded-lg
            text-cyan-300
            "
          />
        </div>

        {/* Recent Activity */}

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <h3
            className="
            text-cyan-300
            font-bold
            mb-3
            "
          >
            RECENT ACTIVITY
          </h3>

          <div className="space-y-2">
            {actions.map((item) => (
              <div
                key={item}
                className="text-cyan-500"
              >
                • {item}
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <h3
            className="
            text-cyan-300
            font-bold
            mb-3
            "
          >
            SYSTEM ALERTS
          </h3>

          <div className="space-y-2">
            {notifications.map((item) => (
              <div
                key={item}
                className="text-cyan-500"
              >
                • {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
