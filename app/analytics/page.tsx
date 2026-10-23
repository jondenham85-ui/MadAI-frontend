import Header from "@/components/layout/Header";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
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
          ANALYTICS CENTER
        </h1>

        <AnalyticsDashboard />
      </main>
    </>
  );
}
