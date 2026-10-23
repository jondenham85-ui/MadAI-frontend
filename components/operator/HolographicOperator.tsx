"use client";

export default function HolographicOperator() {
  return (
    <div
      className="
      relative
      flex
      flex-col
      items-center
      justify-center
      py-20
      "
    >
      {/* Outer Ring */}

      <div
        className="
        absolute
        w-96
        h-96
        rounded-full
        border
        border-cyan-500/20
        animate-spin
        "
        style={{
          animationDuration: "25s",
        }}
      />

      {/* Middle Ring */}

      <div
        className="
        absolute
        w-72
        h-72
        rounded-full
        border
        border-cyan-400/30
        animate-spin
        "
        style={{
          animationDuration: "15s",
          animationDirection: "reverse",
        }}
      />

      {/* Core */}

      <div
        className="
        relative
        flex
        items-center
        justify-center
        w-56
        h-56
        rounded-full
        bg-cyan-500/10
        border
        border-cyan-300
        shadow-[0_0_100px_#00ffff]
        animate-pulse
        "
      >
        <div
          className="
          text-center
          "
        >
          <h2
            className="
            text-3xl
            font-bold
            text-cyan-200
            "
          >
            MADSI
          </h2>

          <p
            className="
            text-xs
            text-cyan-500
            mt-2
            "
          >
            SYNTH CORE
          </p>
        </div>
      </div>

      {/* Status Panel */}

      <div
        className="
        mt-12
        border
        border-cyan-500/20
        rounded-xl
        px-6
        py-4
        bg-black/50
        "
      >
        <div className="text-cyan-400">
          STATUS: ONLINE
        </div>

        <div className="text-cyan-600 text-sm mt-1">
          Memory • Planning • Operations
        </div>
      </div>
    </div>
  );
}
