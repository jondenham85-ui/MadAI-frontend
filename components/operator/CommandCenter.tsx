"use client";

import { useState } from "react";

export default function CommandCenter() {
  const [directive, setDirective] =
    useState("");

  const [history, setHistory] =
    useState<string[]>([]);

  function executeDirective() {
    if (!directive.trim()) return;

    setHistory((prev) => [
      `DIRECTIVE: ${directive}`,
      ...prev,
    ]);

    setDirective("");
  }

  const notifications = [
    "No critical alerts",
    "System operating normally",
    "Awaiting backend connection",
  ];

  return (
    <div
      className="
      border
      border-cyan-500/30
      rounded-xl
      bg-black/60
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
        COMMAND CENTER
      </h2>

      <div
        className="
        grid
        grid-cols-1
        lg:grid-cols-3
        gap-6
        "
      >
        {/* Directive Input */}

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <h3
            className="
            text-cyan-300
            font-bold
            mb-3
            "
          >
            SYNTH CORE
          </h3>

          <input
            value={directive}
            onChange={(e) =>
              setDirective(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                executeDirective();
              }
            }}
            placeholder="Enter directive..."
            className="
            w-full
            p-3
            bg-black
            border
            border-cyan-500/20
            rounded-lg
            text-cyan-300
            "
          />

          <button
            onClick={executeDirective}
            className="
            mt-3
            w-full
            py-3
            bg-cyan-500
            text-black
            font-bold
            rounded-lg
            "
          >
            EXECUTE
          </button>
        </div>

        {/* Directive History */}

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <h3
            className="
            text-cyan-300
            font-bold
            mb-3
            "
          >
            RECENT DIRECTIVES
          </h3>

          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-cyan-600">
                No directives executed
              </div>
            ) : (
              history.map((item, index) => (
                <div
                  key={index}
                  className="text-cyan-400"
                >
                  {item}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alerts */}

        <div
          className="
          border
          border-cyan-500/20
          rounded-lg
          p-4
          "
        >
          <h3
            className="
            text-cyan-300
            font-bold
            mb-3
            "
          >
            SYSTEM ALERTS
          </h3>

          <div className="space-y-2">
            {notifications.map((item) => (
              <div
                key={item}
                className="text-cyan-500"
              >
                • {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
