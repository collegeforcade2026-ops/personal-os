"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { label: "HOME",    href: "/" },
  { label: "CRM",     href: "/crm" },
  { label: "BRAIN",   href: "/brain" },
  { label: "FINANCE", href: "/finance" },
  { label: "JOURNAL", href: "/journal" },
  { label: "HEALTH",  href: "/health" },
];

function Clock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
      setDate(now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).toUpperCase());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-xs text-[var(--ink-1)] tabular">
      {date} &nbsp; {time}
    </span>
  );
}

export function TopRail() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between px-5 h-10 border-b border-[var(--border)] bg-[var(--ink-4)] shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="font-mono text-xs tracking-widest text-[var(--ink-0)]">
          MILES OS <span className="text-[var(--ink-3)]">// V3.1</span>
        </span>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1 text-[11px] font-mono tracking-wider transition-colors ${
                active
                  ? "text-[var(--ink-0)] border-b border-[var(--accent)]"
                  : "text-[var(--ink-2)] hover:text-[var(--ink-1)]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Right: clock + avatar */}
      <div className="flex items-center gap-3 shrink-0">
        <Clock />
        <div className="w-6 h-6 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[10px] font-mono text-[var(--ink-4)] font-bold">
          CM
        </div>
      </div>
    </header>
  );
}
