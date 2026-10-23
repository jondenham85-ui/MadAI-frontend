"use client";

import { useState } from "react";

export default function VoiceCore() {
  const [status, setStatus] =
    useState("READY");

  function startListening() {
    setStatus("LISTENING");
  }

  function stopListening() {
    setStatus("READY");
  }

  return (
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
        text-2xl
        font-bold
        text-cyan-300
        mb-6
        "
      >
        VOICE CORE
      </h2>

      <div className="flex flex-col items-center">

        <div
          className={`
            w-40
            h-40
            rounded-full
            border-2
            flex
            items-center
            justify-center
            mb-6
            ${
              status === "LISTENING"
                ? "border-cyan-300 animate-pulse shadow-[0_0_60px_#00ffff]"
                : "border-cyan-600"
            }
          `}
        >
          <span className="text-cyan-300 text-xl">
            MIC
          </span>
        </div>

        <div
          className="
          text-xl
          font-semibold
          text-cyan-400
          mb-6
          "
        >
          {status}
        </div>

        <div className="flex gap-4">

          <button
            onClick={startListening}
            className="
            px-6
            py-3
            rounded-lg
            bg-cyan-500
            text-black
            font-bold
            "
          >
            ACTIVATE
          </button>

          <button
            onClick={stopListening}
            className="
            px-6
            py-3
            rounded-lg
            border
            border-cyan-500
            text-cyan-300
            "
          >
            STOP
          </button>

        </div>

        <p
          className="
          text-cyan-600
          mt-6
          text-center
          "
        >
          Voice interface ready for future
          microphone, speech recognition,
          and synthetic speech integration.
        </p>

      </div>
    </div>
  );
}
