export default function AIStatusBar() {
  return (
    <div
      className="
      flex
      flex-wrap
      justify-between
      gap-4
      border
      border-cyan-500/30
      rounded-xl
      p-4
      bg-black/60
      "
    >
      <div>
        <div className="text-cyan-600 text-xs">
          SYNTH CORE
        </div>

        <div className="text-green-400">
          ACTIVE
        </div>
      </div>

      <div>
        <div className="text-cyan-600 text-xs">
          MEMORY
        </div>

        <div className="text-green-400">
          ONLINE
        </div>
      </div>

      <div>
        <div className="text-cyan-600 text-xs">
          VOICE
        </div>

        <div className="text-green-400">
          READY
        </div>
      </div>

      <div>
        <div className="text-cyan-600 text-xs">
          OPERATIONS
        </div>

        <div className="text-green-400">
          STANDBY
        </div>
      </div>
    </div>
  );
}
