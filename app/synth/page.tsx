import SynthConsole from "@/components/synth/SynthConsole";

export default function SynthPage() {
  return (
    <main className="min-h-screen bg-black p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-4xl font-bold text-cyan-300">SYNTH CORE</h1>
        <p className="mb-8 text-cyan-100"><a href="/agents" className="underline">Open the Owner Agent Command Center</a> for agent directives, saved execution state and logs.</p>
        <SynthConsole />
      </div>
    </main>
  );
}
