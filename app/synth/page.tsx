import SynthConsole from "@/components/synth/SynthConsole";

export default function SynthPage() {
  return (
    <main className="min-h-screen bg-black p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-8 text-4xl font-bold text-cyan-300">SYNTH CORE</h1>
        <SynthConsole />
      </div>
    </main>
  );
}
