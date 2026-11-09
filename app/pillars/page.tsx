import { PillarEditor } from "@/components/pillars/pillar-editor";
import { getAllLists, getPostTexts, PLATFORMS, type Scope } from "@/lib/pillars/store";

export default async function PillarsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const { platform } = await searchParams;
  const scope: Scope = PLATFORMS.includes(platform as Scope) ? (platform as Scope) : "default";
  const [lists, posts] = await Promise.all([getAllLists(), getPostTexts(scope)]);

  return (
    <div className="p-6 max-sm:p-4">
      <PillarEditor
        key={scope}
        scope={scope}
        ownList={scope === "default" ? lists.default ?? [] : lists[scope] ?? null}
        defaultList={lists.default ?? []}
        customised={PLATFORMS.filter((p) => p !== "default" && lists[p])}
        posts={posts.map((p) => p.text)}
      />
    </div>
  );
}
