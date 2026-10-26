export default function NotificationCenter() {
  const notifications = [
    "System initialized",
    "Memory engine active",
    "Revenue monitor connected",
    "No critical alerts detected",
  ];

  return (
    <div className="border border-cyan-500/30 rounded-xl p-6 bg-black/60">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
        NOTIFICATION CENTER
      </h2>

      <div className="space-y-3">
        {notifications.map((item, index) => (
          <div
            key={index}
            className="border border-cyan-500/20 rounded-lg p-3 text-cyan-400"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
