"use client";

import Link from "next/link";

export default function Navigation() {
  return (
    <nav
      className="
      flex
      flex-wrap
      gap-6
      items-center
      text-cyan-300
      font-medium
      "
    >
      <Link
        href="/"
        className="hover:text-cyan-100 transition"
      >
        HOME
      </Link>

      <Link
        href="/synth"
        className="hover:text-cyan-100 transition"
      >
        SYNTH
      </Link>

      <Link
        href="/memory"
        className="hover:text-cyan-100 transition"
      >
        MEMORY
      </Link>

      <Link
        href="/operations"
        className="hover:text-cyan-100 transition"
      >
        OPERATIONS
      </Link>

      <Link
        href="/shopmad"
        className="hover:text-cyan-100 transition"
      >
        SHOPMAD
      </Link>

      <Link
        href="/revenue"
        className="hover:text-cyan-100 transition"
      >
        REVENUE
      </Link>

      <Link
        href="/analytics"
        className="hover:text-cyan-100 transition"
      >
        ANALYTICS
      </Link>

      <Link
        href="/system"
        className="hover:text-cyan-100 transition"
      >
        SYSTEM
      </Link>

      <Link
        href="/admin"
        className="hover:text-cyan-100 transition"
      >
        ADMIN
      </Link>
    </nav>
  );
}

