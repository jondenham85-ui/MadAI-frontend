export default function AnalyticsDashboard() {
  const analytics = [
    {
      title: "Active Users",
      value: "0",
    },
    {
      title: "Directives Processed",
      value: "0",
    },
    {
      title: "Memory Records",
      value: "0",
    },
    {
      title: "Automation Jobs",
      value: "0",
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
        {analytics.map((item) => (
          <div
            key={item.title}
            className="
            border
            border-cyan-500/30
            rounded-xl
            p-6
            bg-black
            "
          >
            <p
              className="
              text-cyan-500
              text-sm
              "
            >
              {item.title}
            </p>

            <h3
              className="
              text-3xl
              font-bold
              mt-2
              text-cyan-300
              "
            >
              {item.value}
            </h3>
          </div>
        ))}
      </div>

      <div
        className="
        border
        border-cyan-500/30
        rounded-xl
        p-6
        bg-black
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
          Intelligence Metrics
        </h2>

        <div className="space-y-4">

          <div
            className="
            border
            border-cyan-500/20
            rounded-lg
            p-4
            "
          >
            User Growth Tracking
          </div>

          <div
            className="
            border
            border-cyan-500/20
            rounded-lg
            p-4
            "
          >
            Directive Performance
          </div>

          <div
            className="
            border
            border-cyan-500/20
            rounded-lg
            p-4
            "
          >
            Memory Utilization
          </div>

          <div
            className="
            border
            border-cyan-500/20
            rounded-lg
            p-4
            "
          >
            Revenue Forecast Insights
          </div>

        </div>
      </div>
    </div>
  );
}
