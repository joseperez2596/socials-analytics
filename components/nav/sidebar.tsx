"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PLATFORMS = [
  { label: "Dashboard", short: "SA", href: "/",                   color: "#1a1814" },
  { label: "YouTube",   short: "YT", href: "/youtube/funnel",     color: "#FF0000" },
  { label: "Instagram", short: "IG", href: "/instagram/overview", color: "#E1306C" },
  { label: "Facebook",  short: "FB", href: "/facebook/overview",  color: "#1877F2" },
  { label: "TikTok",    short: "TK", href: "/tiktok/overview",    color: "#FF0050" },
];

const UTILITIES = [
  { label: "Connections", short: "⇄", href: "/connections", color: "#6B7280" },
  { label: "Import", short: "↑", href: "/import", color: "#6B7280" },
  { label: "Pillars", short: "#", href: "/pillars", color: "#6B7280" },
];

export function Sidebar() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-open");
    // Read after mount on purpose: reading during render would mismatch the server HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved !== null) setOpen(saved === "true");
  }, []);

  const toggle = () =>
    setOpen((v) => {
      localStorage.setItem("sidebar-open", String(!v));
      return !v;
    });

  return (
    <nav
      className={`${
        open ? "w-56" : "w-[60px]"
      } transition-all duration-200 ease-in-out flex-shrink-0 flex flex-col border-r border-ink/10 bg-paper h-screen sticky top-0 overflow-hidden`}
    >
      {/* Toggle */}
      <button
        onClick={toggle}
        className="flex items-center justify-end p-3 text-ink/30 hover:text-ink transition-colors"
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        {open ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
      </button>

      {/* Platform links */}
      <div className="flex flex-col gap-0.5 px-2">
        {PLATFORMS.map(({ label, short, href, color }) => {
          const segment = href.split("/")[1];
          const isActive =
            segment === "" ? pathname === "/" : pathname.startsWith(`/${segment}`);
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-ink/10"
                  : "text-ink/50 hover:text-ink hover:bg-ink/5"
              }`}
              style={isActive ? { color } : undefined}
            >
              <span
                className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center font-mono text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {short}
              </span>
              {open && <span className="truncate font-medium">{label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Utility links */}
      <div className="mt-auto flex flex-col gap-0.5 px-2 pb-3 border-t border-ink/10 pt-3">
        {UTILITIES.map(({ label, short, href, color }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-ink/10"
                  : "text-ink/50 hover:text-ink hover:bg-ink/5"
              }`}
              style={isActive ? { color } : undefined}
            >
              <span
                className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center font-mono text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {short}
              </span>
              {open && <span className="truncate font-medium">{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
