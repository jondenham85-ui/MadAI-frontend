import Navigation from "./Navigation";

export default function Header() {
  return (
    <header
      className="
      border-b
      border-cyan-500/20
      bg-black
      px-6
      py-4
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
          <h1
            className="
            text-2xl
            font-bold
            text-cyan-300
            "
          >
            MADSI
          </h1>

          <p
            className="
            text-sm
            text-cyan-500
            "
          >
            Madison Synthetic Intelligence
          </p>
        </div>

        <Navigation />
      </div>
    </header>
  );
}
