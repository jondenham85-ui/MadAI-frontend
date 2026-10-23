import Header from "@/components/layout/Header";
import VoiceCore from "@/components/operator/VoiceCore";

export default function VoicePage() {
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
          VOICE CORE
        </h1>

        <VoiceCore />
      </main>
    </>
  );
}
