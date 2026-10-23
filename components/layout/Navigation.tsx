"use client";

import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="flex gap-6 flex-wrap items-center">

      <Link
        href="/"
        className="hover:text-cyan-300"
      >
        HOME
      </Link>

      <Link
        href="/synth"
        className="hover:text-cyan-300"
      >
        SYNTH
      </Link>

      <Link
        href="/memory"
        className="hover:text-cyan-300"
      >
        MEMORY
      </Link>

      <Link
        href="/operations"
        className="hover:text-cyan-300"
      >
        OPERATIONS
      </Link>

      <Link
        href="/shopmad"
        className="hover:text-cyan-300"
      >
        SHOPMAD
      </Link>

      <Link
        href="/revenue"
        className="hover:text-cyan-300"
      >
        REVENUE
      </Link>

      <Link
        href="/analytics"
        className="hover:text-cyan-300"
      >
        ANALYTICS
      </Link>

      <Link
        href="/admin"
        className="hover:text-cyan-300"
      >
        ADMIN
      </Link>

    </nav>
  );
}
