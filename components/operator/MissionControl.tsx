export default function MissionControl() {
  return (
    <div
      className="
      border
      border-cyan-500/30
      rounded-xl
      p-6
      bg-black/60
      "
    >
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
        MISSION CONTROL
      </h2>

      <div className="space-y-4">

        <div>
          <span className="text-cyan-600">
            PRIMARY OBJECTIVE:
          </span>

          <div className="text-cyan-300">
            Build MADSI Ecosystem
          </div>
        </div>

        <div>
          <span className="text-cyan-600">
            CURRENT MODE:
          </span>

          <div className="text-green-400">
            DEVELOPMENT
          </div>
        </div>

        <div>
          <span className="text-cyan-600">
            PRIORITY:
          </span>

          <div className="text-yellow-400">
            HIGH
          </div>
        </div>

      </div>
    </div>
  );
}
