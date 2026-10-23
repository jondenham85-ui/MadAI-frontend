export default function ShopMADDashboard() {
  return (
    <div
      className="
      border
      border-cyan-500/30
      rounded-xl
      p-6
      "
    >
      <h2
        className="
        text-2xl
        font-bold
        text-cyan-300
        mb-6
        "
      >
        SHOPMAD COMMAND CENTER
      </h2>

      <div className="space-y-4">

        <div className="border border-cyan-500/20 p-4 rounded-lg">
          Inventory Management
        </div>

        <div className="border border-cyan-500/20 p-4 rounded-lg">
          Product Catalog
        </div>

        <div className="border border-cyan-500/20 p-4 rounded-lg">
          Orders
        </div>

        <div className="border border-cyan-500/20 p-4 rounded-lg">
          Revenue Integration
        </div>

      </div>
    </div>
  );
}
