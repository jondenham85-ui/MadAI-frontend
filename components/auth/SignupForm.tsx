"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/hooks/useAuth";

export default function SignupForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const safeName = name.trim();
    const safeEmail = email.trim();
    const safePassword = password;

    if (!safeName || !safeEmail || !safePassword) {
      setError("Please complete all fields before creating your account.");
      return;
    }

    if (safePassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await register(safeName, safeEmail, safePassword);

      if (result?.user) {
        router.push("/");
        return;
      }

      throw new Error("Account creation failed. Please try again.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Signup failed. Please verify your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md border border-cyan-500/30 rounded-xl p-8 bg-black/60"
    >
      <h1 className="text-3xl font-bold text-cyan-300 mb-6">CREATE ACCOUNT</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-3 mb-4 bg-black border border-cyan-500/20 rounded-lg text-cyan-100"
        autoComplete="name"
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 mb-4 bg-black border border-cyan-500/20 rounded-lg text-cyan-100"
        autoComplete="email"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 mb-4 bg-black border border-cyan-500/20 rounded-lg text-cyan-100"
        autoComplete="new-password"
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full p-3 bg-cyan-500 text-black rounded-lg font-bold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
      </button>
    </form>
  );
}
