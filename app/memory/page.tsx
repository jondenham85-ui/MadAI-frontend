import Header from "@/components/layout/Header";
import MemoryDashboard from "@/components/memory/MemoryDashboard";

export default function MemoryPage() {
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
          MEMORY ENGINE
        </h1>

        <MemoryDashboard />
      </main>
    </>
  );
}
