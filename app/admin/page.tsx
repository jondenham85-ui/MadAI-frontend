"use client";

import Header from "@/components/layout/Header";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { useUser } from "@/context/UserContext";

export default function AdminPage() {
  const { user, loading } = useUser();

  return (
    <>
      <Header />

      <main className="p-8">
        <h1 className="mb-8 text-4xl font-bold">
          ADMIN CONTROL CENTER
        </h1>

        {loading ? (
          <div className="rounded-xl border border-cyan-500/30 bg-slate-950/70 p-6 text-cyan-300">
            Restoring your session...
          </div>
        ) : (
          <AdminDashboard currentUser={user} />
        )}
      </main>
    </>
  );
}
