"use client";

import Link from "next/link";

export default function Sidebar() {
  const links = [
    {
      name: "SYNTH",
      href: "/synth",
    },
    {
      name: "VOICE",
      href: "/voice",
    },
    {
      name: "MEMORY",
      href: "/memory",
    },
    {
      name: "OPERATIONS",
      href: "/operations",
    },
    {
      name: "SHOPMAD",
      href: "/shopmad",
    },
    {
      name: "REVENUE",
      href: "/revenue",
    },
    {
      name: "ANALYTICS",
      href: "/analytics",
    },
    {
      name: "SYSTEM",
      href: "/system",
    },
    {
      name: "ADMIN",
      href: "/admin",
    },
  ];

  return (
    <aside
      className="
      w-64
      min-h-screen
      bg-black
      border-r
      border-cyan-500/20
      p-6
      "
    >
      <div className="mb-10">
        <h2
          className="
          text-3xl
          font-bold
          text-cyan-300
          "
        >
          MADSI
        </h2>

        <p
          className="
          text-sm
          text-cyan-500
          mt-2
          "
        >
          Synthetic Intelligence
        </p>
      </div>

      <nav className="flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link.name}
            href={link.href}
            className="
            px-4
            py-3
            rounded-lg
            border
            border-transparent
            text-cyan-300
            hover:border-cyan-500/50
            hover:bg-cyan-500/10
            transition
            "
          >
            {link.name}
          </Link>
        ))}
      </nav>

      <div
        className="
        mt-10
        p-4
        border
        border-cyan-500/20
        rounded-xl
        "
      >
        <div className="text-sm text-cyan-500">
          STATUS
        </div>

        <div
          className="
          text-green-400
          font-bold
          mt-2
          "
        >
          ONLINE
        </div>
      </div>
    </aside>
  );
}
