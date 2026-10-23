import Header from "@/components/layout/Header";
import SyntheticOperator from "@/components/operator/SyntheticOperator";

export default function Home() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-black text-cyan-300">
        <SyntheticOperator />
      </main>
    </>
  );
}
