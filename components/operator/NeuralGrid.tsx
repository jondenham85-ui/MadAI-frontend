export default function NeuralGrid() {
  return (
    <div
      className="
      absolute
      inset-0
      overflow-hidden
      pointer-events-none
      "
    >
      <div
        className="
        absolute
        inset-0
        opacity-20
        "
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(0,255,255,0.15) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(0,255,255,0.15) 1px,
              transparent 1px
            )
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <div
        className="
        absolute
        inset-0
        bg-gradient-to-t
        from-cyan-500/5
        via-transparent
        to-transparent
        "
      />

      <div
        className="
        absolute
        left-1/2
        top-1/2
        w-[800px]
        h-[800px]
        -translate-x-1/2
        -translate-y-1/2
        rounded-full
        bg-cyan-500/5
        blur-3xl
        animate-pulse
        "
      />
    </div>
  );
}
