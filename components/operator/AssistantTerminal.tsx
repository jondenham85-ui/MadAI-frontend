"use client";

import { useState } from "react";

export default function AssistantTerminal() {
  const [logs, setLogs] = useState([
    "MADSI Initialized",
    "Waiting for directives",
  ]);

  return (
    <div
      className="
      border
      border-cyan-500/30
      rounded-xl
      p-6
      bg-black/60
      "
    >
      <h2 className="text-2xl font-bold text-cyan-300 mb-4">
        TERMINAL
      </h2>

      <div
        className="
        space-y-2
        font-mono
        "
      >
        {logs.map((log, index) => (
          <div
            key={index}
            className="text-cyan-400"
          >
            {">"} {log}
          </div>
        ))}
      </div>
    </div>
  );
}
