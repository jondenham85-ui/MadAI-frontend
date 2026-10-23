"use client";

import { useState } from "react";

export default function SynthConsole() {

  const [prompt, setPrompt] =
    useState("");

  const [responses, setResponses] =
    useState<string[]>([]);

  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!prompt.trim()) return;

    setResponses((prev) => [
      ...prev,
      `> ${prompt}`,
    ]);

    setPrompt("");
  }

  return (
    <div
      className="
      bg-black
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
        SYNTH CONSOLE
      </h2>

      <div
        className="
        h-80
        overflow-y-auto
        border
        border-cyan-500/20
        rounded-lg
        p-4
        mb-4
        "
      >
        {responses.length === 0 && (
          <div className="text-cyan-600">
            Awaiting Directive...
          </div>
        )}

        {responses.map(
          (response, index) => (
            <div
              key={index}
              className="
              text-cyan-300
              mb-2
              font-mono
              "
            >
              {response}
            </div>
          )
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2"
      >
        <input
          value={prompt}
          onChange={(e) =>
            setPrompt(e.target.value)
          }
          placeholder="Enter Directive..."
          className="
          flex-1
          bg-black
          border
          border-cyan-500/30
          px-4
          py-3
          rounded-lg
          text-cyan-200
          "
        />

        <button
          type="submit"
          className="
          px-6
          py-3
          rounded-lg
          bg-cyan-500
          text-black
          font-bold
          "
        >
          EXECUTE
        </button>
      </form>
    </div>
  );
}
