import Header from "@/components/layout/Header";
import SynthConsole from "@/components/synth/SynthConsole";

export default function SynthPage() {
  return (
    <>
      <Header />

      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-3xl font-bold text-cyan-300 sm:text-4xl">SYNTH CORE</h1>
          <SynthConsole />
        </div>
      </main>
    </>
  );
}
