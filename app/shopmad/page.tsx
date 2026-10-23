import Header from "@/components/layout/Header";
import ShopMADDashboard from "@/components/shopmad/ShopMADDashboard";

export default function ShopMADPage() {
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
          SHOPMAD COMMAND CENTER
        </h1>

        <ShopMADDashboard />
      </main>
    </>
  );
}

