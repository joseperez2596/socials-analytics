export const dynamic = 'force-dynamic';

import { SubNav } from "@/components/nav/sub-nav";

const TABS = [
  { label: "Funnel", href: "/youtube/funnel" },
  { label: "Content Matrix", href: "/youtube/matrix" },
  { label: "Monetization", href: "/youtube/monetization" },
  { label: "Pillars", href: "/youtube/pillars" },
  { label: "Strategy", href: "/youtube/strategy" },
];

export default function YoutubeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav platform="YouTube" tabs={TABS} accentColor="#FF0000" />
      <div className="px-6 py-8">{children}</div>
    </>
  );
}
