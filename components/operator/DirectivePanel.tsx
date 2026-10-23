export default function DirectivePanel() {
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
      <h2
        className="
        text-2xl
        font-bold
        text-cyan-300
        mb-6
        "
      >
        ACTIVE DIRECTIVE
      </h2>

      <div className="space-y-4">

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <div className="text-cyan-600 text-sm">
            CURRENT GOAL
          </div>

          <div className="text-cyan-300 mt-1">
            Develop MADSI Platform
          </div>
        </div>

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <div className="text-cyan-600 text-sm">
            PRIORITY LEVEL
          </div>

          <div className="text-yellow-400 mt-1 font-bold">
            HIGH
          </div>
        </div>

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <div className="text-cyan-600 text-sm">
            EXECUTION STATE
          </div>

          <div className="text-green-400 mt-1 font-bold">
            ACTIVE
          </div>
        </div>

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <div className="text-cyan-600 text-sm">
            LAST UPDATE
          </div>

          <div className="text-cyan-300 mt-1">
            Awaiting Live Backend Connection
          </div>
        </div>

      </div>
    </div>
  );
}
