"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SubNavProps {
  platform: string;
  tabs: { label: string; href: string }[];
  accentColor: string;
}

export function SubNav({ tabs, accentColor }: SubNavProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-ink/10 bg-paper/60">
      <div className="px-6">
        <div className="flex items-center gap-1 h-10">
          {tabs.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  isActive ? "text-white" : "text-ink/50 hover:text-ink hover:bg-ink/5"
                )}
                style={isActive ? { backgroundColor: accentColor } : undefined}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
