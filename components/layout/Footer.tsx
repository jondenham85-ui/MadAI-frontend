export default function Footer() {
  return (
    <footer
      className="
      border-t
      border-cyan-500/20
      mt-auto
      py-6
      px-6
      bg-black
      "
    >
      <div
        className="
        flex
        flex-col
        md:flex-row
        justify-between
        items-center
        gap-4
        "
      >
        <div>
          <h3
            className="
            text-cyan-300
            font-bold
            "
          >
            MADSI
          </h3>

          <p
            className="
            text-cyan-600
            text-sm
            "
          >
            Madison Synthetic Intelligence
          </p>
        </div>

        <div
          className="
          text-cyan-500
          text-sm
          "
        >
          Memory • Operations • Revenue • Automation
        </div>

        <div
          className="
          text-cyan-700
          text-xs
          "
        >
          Version 1.0.0
        </div>
      </div>
    </footer>
  );
}
