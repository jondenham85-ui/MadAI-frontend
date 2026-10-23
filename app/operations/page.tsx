import Header from "@/components/layout/Header";
import OperationsDashboard from "@/components/operations/OperationsDashboard";

export default function OperationsPage() {
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
          OPERATIONS CENTER
        </h1>

        <OperationsDashboard />
      </main>
    </>
  );
}
