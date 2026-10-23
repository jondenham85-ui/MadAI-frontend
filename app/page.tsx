import Header from "@/components/layout/Header";
import SynthConsole from "@/components/synth/SynthConsole";

export default function SynthPage() {
  return (
    <>
      <Header />

      <main className="p-8">
        <h1
          className="
          text-4xl
          font-bold
          mb-8
          "
        >
          SYNTH CORE
        </h1>

        <SynthConsole />
      </main>
    </>
  );
}

