"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://madai-backend-clean.onrender.com";

type SynthMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function SynthConsole() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<SynthMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || isLoading) {
      return;
    }

    const userMessage: SynthMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmedPrompt,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/synth`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error || payload.message || "The synth service could not process your request."
        );
      }

      const answer = payload.answer || payload.response || "No response was returned.";

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to reach the synth service right now.";

      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          content: `Error: ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-black border border-cyan-500/30 rounded-xl p-6">
      <h2 className="text-xl font-bold text-cyan-300 mb-4">SYNTH CONSOLE</h2>

      <div className="h-80 overflow-y-auto border border-cyan-500/20 rounded-lg p-4 mb-4 bg-black/50">
        {messages.length === 0 && !error && (
          <div className="text-cyan-600">Awaiting Directive...</div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="mb-4 font-mono text-sm">
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-cyan-400">
              {message.role === "user" ? "USER" : "MADSI"}
            </div>
            <div className="whitespace-pre-wrap text-cyan-200">{message.content}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter Directive..."
          className="flex-1 bg-black border border-cyan-500/30 px-4 py-3 rounded-lg text-cyan-200"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 rounded-lg bg-cyan-500 text-black font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "PROCESSING..." : "EXECUTE"}
        </button>
      </form>
    </div>
  );
}
