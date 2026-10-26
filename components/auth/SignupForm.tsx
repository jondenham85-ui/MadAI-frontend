"use client";

import { useState } from "react";

export default function SignupForm() {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    console.log({
      name,
      email,
      password,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="
      w-full
      max-w-md
      border
      border-cyan-500/30
      rounded-xl
      p-8
      bg-black/60
      "
    >
      <h1
        className="
        text-3xl
        font-bold
        text-cyan-300
        mb-6
        "
      >
        CREATE ACCOUNT
      </h1>

      <input
        placeholder="Name"
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
        className="
        w-full
        p-3
        mb-4
        bg-black
        border
        border-cyan-500/20
        rounded-lg
        "
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        className="
        w-full
        p-3
        mb-4
        bg-black
        border
        border-cyan-500/20
        rounded-lg
        "
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        className="
        w-full
        p-3
        mb-4
        bg-black
        border
        border-cyan-500/20
        rounded-lg
        "
      />

      <button
        type="submit"
        className="
        w-full
        p-3
        bg-cyan-500
        text-black
        rounded-lg
        font-bold
        "
      >
        CREATE ACCOUNT
      </button>
    </form>
  );
}
