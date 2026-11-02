"use client";

import { useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://madai-backend-clean.onrender.com").replace(/\/+$/, "");

type SynthMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function getApiError(payload: any, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return payload.error || payload.message || payload.details || fallback;
}

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

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${API_URL}/api/synth`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: trimmedPrompt }),
        signal: controller.signal,
      });

      let payload: any = {};
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        payload = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => "");
        payload = text ? { message: text } : {};
      }

      if (!response.ok) {
        const message = getApiError(payload, "The synth service could not process your request.");

        if (response.status === 401) {
          throw new Error("Authentication required. Please sign in to use the synth console.");
        }

        if (response.status === 403) {
          throw new Error("Access denied. Your session is not allowed to use SYNTH CORE.");
        }

        if (response.status >= 500) {
          throw new Error(`Backend error (${response.status}): ${message}`);
        }

        throw new Error(message);
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
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-black/90 p-4 shadow-[0_0_40px_rgba(34,211,238,0.15)] sm:p-6">
      <h2 className="mb-4 text-xl font-bold tracking-[0.2em] text-cyan-300">SYNTH CONSOLE</h2>

      <div className="mb-4 h-80 overflow-y-auto rounded-xl border border-cyan-500/20 bg-black/60 p-3 sm:p-4">
        {messages.length === 0 && !error && (
          <div className="text-sm text-cyan-600">Awaiting Directive...</div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="mb-4 font-mono text-sm">
            <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-cyan-400">
              {message.role === "user" ? "USER" : "MADSI"}
            </div>
            <div className="whitespace-pre-wrap break-words text-cyan-100">{message.content}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter Directive..."
          className="min-w-0 flex-1 rounded-lg border border-cyan-500/30 bg-black px-4 py-3 text-cyan-100 outline-none ring-0 placeholder:text-cyan-700 focus:border-cyan-400"
          disabled={isLoading}
          aria-label="Directive input"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="shrink-0 rounded-lg bg-cyan-400 px-6 py-3 font-bold text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "PROCESSING..." : "EXECUTE"}
        </button>
      </form>
    </div>
  );
}
