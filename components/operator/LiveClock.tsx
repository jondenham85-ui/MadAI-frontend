"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleString()
      );
    };

    updateTime();

    const interval = setInterval(
      updateTime,
      1000
    );

    return () =>
      clearInterval(interval);
  }, []);

  return (
    <div
      className="
      border
      border-cyan-500/30
      rounded-xl
      p-4
      bg-black/60
      "
    >
      <div className="text-cyan-600 text-sm">
        SYSTEM TIME
      </div>

      <div className="text-cyan-300 text-xl font-bold">
        {time}
      </div>
    </div>
  );
}
