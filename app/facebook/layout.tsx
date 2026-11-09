export const dynamic = 'force-dynamic';

import { SubNav } from "@/components/nav/sub-nav";

const TABS = [
  { label: "Overview", href: "/facebook/overview" },
  { label: "Audience", href: "/facebook/audience" },
  { label: "Content Matrix", href: "/facebook/matrix" },
  { label: "Pillars", href: "/facebook/pillars" },
  { label: "Strategy", href: "/facebook/strategy" },
];

export default function FacebookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav platform="Facebook" tabs={TABS} accentColor="#1877F2" />
      <div className="px-6 py-8">{children}</div>
    </>
  );
}
