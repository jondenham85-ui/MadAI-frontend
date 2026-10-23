import Header from "@/components/layout/Header";
import RevenueDashboard from "@/components/revenue/RevenueDashboard";

export default function RevenuePage() {
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
          REVENUE INTELLIGENCE
        </h1>

        <RevenueDashboard />
      </main>
    </>
  );
}
