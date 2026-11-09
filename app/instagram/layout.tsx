export const dynamic = 'force-dynamic';

import { SubNav } from "@/components/nav/sub-nav";

const TABS = [
  { label: "Overview", href: "/instagram/overview" },
  { label: "Audience", href: "/instagram/audience" },
  { label: "Content Matrix", href: "/instagram/matrix" },
  { label: "Pillars", href: "/instagram/pillars" },
  { label: "Strategy", href: "/instagram/strategy" },
];

export default function InstagramLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav platform="Instagram" tabs={TABS} accentColor="#E1306C" />
      <div className="px-6 py-8">{children}</div>
    </>
  );
}
