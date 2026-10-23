import Header from "@/components/layout/Header";
import SystemStatus from "@/components/system/SystemStatus";

export default function SystemPage() {
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
          SYSTEM HEALTH
        </h1>

        <SystemStatus />
      </main>
    </>
  );
}
