import Header from "@/components/layout/Header";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
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
          ADMIN CONTROL CENTER
        </h1>

        <AdminDashboard />
      </main>
    </>
  );
}
