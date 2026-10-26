export default function ActivityFeed() {
  const activity = [
    "MADSI Core Started",
    "Directive Queue Loaded",
    "ShopMAD Module Ready",
    "Authority Chain Verified",
    "Analytics Module Active",
  ];

  return (
    <div className="border border-cyan-500/30 rounded-xl p-6 bg-black/60">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
        ACTIVITY FEED
      </h2>

      <div className="space-y-3">
        {activity.map((item, index) => (
          <div
            key={index}
            className="border-l-2 border-cyan-500 pl-3 text-cyan-400"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
