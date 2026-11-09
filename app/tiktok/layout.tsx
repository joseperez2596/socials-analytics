export const dynamic = 'force-dynamic';

import { SubNav } from "@/components/nav/sub-nav";

const TABS = [
  { label: "Overview", href: "/tiktok/overview" },
  { label: "Content Matrix", href: "/tiktok/matrix" },
  { label: "Pillars", href: "/tiktok/pillars" },
  { label: "Strategy", href: "/tiktok/strategy" },
];

export default function TiktokLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav platform="TikTok" tabs={TABS} accentColor="#FF0050" />
      <div className="px-6 py-8">{children}</div>
    </>
  );
}
