export default function RevenueDashboard() {
  const metrics = [
    {
      title: "Daily Revenue",
      value: "$0.00",
    },
    {
      title: "Weekly Revenue",
      value: "$0.00",
    },
    {
      title: "Monthly Revenue",
      value: "$0.00",
    },
    {
      title: "System Status",
      value: "ONLINE",
    },
  ];

  return (
    <div className="space-y-6">

      <div
        className="
        grid
        grid-cols-1
        md:grid-cols-2
        lg:grid-cols-4
        gap-4
        "
      >
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="
            border
            border-cyan-500/30
            rounded-xl
            bg-black
            p-6
            "
          >
            <div
              className="
              text-cyan-500
              text-sm
              "
            >
              {metric.title}
            </div>

            <div
              className="
              mt-2
              text-3xl
              font-bold
              text-cyan-300
              "
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>

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
          text-xl
          font-bold
          text-cyan-300
          mb-4
          "
        >
          Revenue Intelligence
        </h2>

        <p className="text-cyan-500">
          Revenue forecasting, sales monitoring,
          and ecosystem financial reporting
          will appear here.
        </p>
      </div>
    </div>
  );
}
