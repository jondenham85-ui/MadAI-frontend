export default function OperatorStatus() {
  return (
    <div className="border border-cyan-500/30 rounded-xl p-6 bg-black/60">
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
        OPERATOR STATUS
      </h2>

      <div className="space-y-3">

        <div className="flex justify-between">
          <span className="text-cyan-500">
            MADSI Core
          </span>

          <span className="text-green-400">
            ONLINE
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-cyan-500">
            Voice Core
          </span>

          <span className="text-green-400">
            READY
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-cyan-500">
            Memory Engine
          </span>

          <span className="text-green-400">
            ACTIVE
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-cyan-500">
            Operations
          </span>

          <span className="text-green-400">
            STANDBY
          </span>
        </div>

      </div>
    </div>
  );
}
