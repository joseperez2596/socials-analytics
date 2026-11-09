"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { classifyByKeywords, suggestKeywords, toMap, type Pillar } from "@/lib/pillars/classify";
import { resetList, saveList } from "@/app/pillars/actions";

const SCOPES = [
  { id: "default", label: "All platforms", color: "#6B7280" },
  { id: "youtube", label: "YouTube", color: "#FF0000" },
  { id: "instagram", label: "Instagram", color: "#E1306C" },
  { id: "facebook", label: "Facebook", color: "#1877F2" },
  { id: "tiktok", label: "TikTok", color: "#FF0050" },
] as const;

interface Props {
  scope: string;
  /** null = this platform has no list of its own and uses the All platforms list */
  ownList: Pillar[] | null;
  defaultList: Pillar[];
  customised: string[];
  posts: string[];
}

export function PillarEditor({ scope, ownList, defaultList, customised, posts }: Props) {
  const router = useRouter();
  const [list, setList] = useState<Pillar[]>(ownList ?? defaultList);
  const [inherits, setInherits] = useState(ownList === null);
  const [dirty, setDirty] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const label = SCOPES.find((s) => s.id === scope)?.label ?? scope;

  // Live re-classification of the loaded posts against the list being edited.
  const { counts, unmatched } = useMemo(() => {
    const map = toMap(list);
    const counts: Record<string, number> = {};
    const unmatched: string[] = [];
    for (const t of posts) {
      const p = classifyByKeywords(t, map);
      counts[p] = (counts[p] ?? 0) + 1;
      if (p === "Other") unmatched.push(t);
    }
    return { counts, unmatched };
  }, [list, posts]);
  const suggestions = useMemo(() => suggestKeywords(unmatched), [unmatched]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(next: Pillar[], note?: string) {
    setList(next);
    setDirty(true);
    setMessage(note ? { text: note } : null);
  }

  function addKeyword(pillar: string, raw: string) {
    const kw = raw.trim().toLowerCase();
    if (!kw) return;
    const exists = list.some((p) => p.name === pillar);
    const next = exists
      ? list.map((p) => (p.name === pillar && !p.keywords.includes(kw) ? { ...p, keywords: [...p.keywords, kw] } : p))
      : [...list, { name: pillar, keywords: [kw] }];
    setFresh(new Set(fresh).add(`${pillar}|${kw}`));
    update(next, `Added “${kw}” to ${pillar}`);
  }

  function save() {
    startTransition(async () => {
      const res = await saveList(scope, list);
      if (res.error) return setMessage({ text: res.error, error: true });
      setDirty(false);
      setInherits(false);
      setFresh(new Set());
      setMessage({ text: "Saved. Pillar pages now use these keywords." });
      router.refresh();
    });
  }

  function switchToDefault() {
    startTransition(async () => {
      const res = await resetList(scope);
      if (res.error) return setMessage({ text: res.error, error: true });
      setList(defaultList);
      setInherits(true);
      setDirty(false);
      setMessage({ text: `${label} now uses the All platforms list.` });
      router.refresh();
    });
  }

  const readOnly = inherits;

  return (
    <div className="flex flex-col gap-5 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Pillar keywords</h1>
          <p className="text-sm text-ink/60 max-w-[62ch] mt-1">
            A post joins the first pillar whose keyword appears in its title or caption. Posts with no match count
            as Other.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs ${message?.error ? "text-neg" : "text-ink/40"}`} role="status">
            {message?.text ?? (dirty ? "Unsaved changes" : "All changes saved")}
          </span>
          <button
            onClick={save}
            disabled={!dirty || pending}
            className="rounded-lg bg-ink text-paper px-4 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1.5" aria-label="Which list to edit">
        {SCOPES.map((s) => (
          <Link
            key={s.id}
            href={s.id === "default" ? "/pillars" : `/pillars?platform=${s.id}`}
            aria-current={s.id === scope ? "page" : undefined}
            onClick={(e) => {
              if (dirty && !window.confirm("Discard unsaved changes?")) e.preventDefault();
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm ${
              s.id === scope ? "border-ink/40 bg-card" : "border-ink/10 text-ink/60 hover:text-ink"
            }`}
          >
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            {customised.includes(s.id) && <span className="font-mono text-[10px] text-ink/40">own list</span>}
          </Link>
        ))}
      </nav>

      {scope !== "default" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink/5 px-4 py-2.5 text-sm text-ink/60">
          {inherits ? (
            <>
              {label} uses the All platforms list.
              <button
                className="rounded-lg border border-ink/10 bg-card px-3 py-1 text-ink"
                onClick={() => {
                  setInherits(false);
                  update(defaultList.map((p) => ({ ...p, keywords: [...p.keywords] })), `Editing a copy for ${label}. Save to keep it.`);
                }}
              >
                Customise for {label}
              </button>
            </>
          ) : (
            <>
              {label} has its own list.
              <button
                className="rounded-lg border border-ink/10 bg-card px-3 py-1 text-ink disabled:opacity-40"
                disabled={pending || !customised.includes(scope)}
                onClick={switchToDefault}
              >
                Use All platforms list
              </button>
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
        <div className="rounded-2xl border border-ink/10 bg-card overflow-hidden">
          {list.map((p, i) => (
            <PillarRow
              key={i}
              pillar={p}
              count={counts[p.name] ?? 0}
              fresh={fresh}
              readOnly={readOnly}
              onRename={(name) => update(list.map((x, j) => (j === i ? { ...x, name } : x)))}
              onAdd={(kw) => addKeyword(p.name, kw)}
              onRemove={(kw) =>
                update(
                  list.map((x, j) => (j === i ? { ...x, keywords: x.keywords.filter((k) => k !== kw) } : x)),
                  `Removed “${kw}”`
                )
              }
              onDelete={() => update(list.filter((_, j) => j !== i), `Deleted ${p.name}. Its posts move to Other.`)}
            />
          ))}
          <div className="grid grid-cols-[minmax(0,1fr)_70px] sm:grid-cols-[160px_minmax(0,1fr)_70px_28px] gap-3 items-center border-t border-ink/10 bg-neg/5 px-4 py-3.5">
            <span className="font-bold px-1.5">Other</span>
            <span className="hidden sm:block text-sm text-ink/40">No keyword matched</span>
            <span className="font-mono text-xs text-ink/40 tabular-nums">{unmatched.length} posts</span>
          </div>
          {!readOnly && (
            <div className="border-t border-ink/10 px-4 py-3">
              <button
                className="rounded-lg border border-ink/10 bg-paper px-3 py-1.5 text-sm"
                onClick={() => update([...list, { name: `Pillar ${list.length + 1}`, keywords: [] }])}
              >
                + Add pillar
              </button>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-ink/10 bg-card p-4 flex flex-col gap-3 lg:sticky lg:top-4">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink/40">Suggested keywords</span>
          <p className="text-sm text-ink/60">
            {posts.length === 0
              ? "No posts imported yet. Suggestions appear once there is data."
              : `Most common words in the ${unmatched.length} uncategorised posts. Click one to add it to a pillar.`}
          </p>
          {readOnly ? (
            <p className="text-sm text-ink/40">Customise this platform to add keywords.</p>
          ) : suggestions.length === 0 && posts.length > 0 ? (
            <p className="text-sm text-ink/40">Every post is categorised.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(([w, n]) => (
                <Suggestion
                  key={w}
                  word={w}
                  count={n}
                  pillars={list.map((p) => p.name)}
                  examples={unmatched.filter((t) => t.toLowerCase().includes(w)).slice(0, 3)}
                  onPick={(pillar) => addKeyword(pillar, w)}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function PillarRow({
  pillar,
  count,
  fresh,
  readOnly,
  onRename,
  onAdd,
  onRemove,
  onDelete,
}: {
  pillar: Pillar;
  count: number;
  fresh: Set<string>;
  readOnly: boolean;
  onRename: (name: string) => void;
  onAdd: (kw: string) => void;
  onRemove: (kw: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState("");
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
      e.preventDefault();
      onAdd(draft);
      setDraft("");
    }
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_70px_28px] sm:grid-cols-[160px_minmax(0,1fr)_70px_28px] gap-3 items-start border-t border-ink/10 first:border-t-0 px-4 py-3.5">
      <input
        value={pillar.name}
        onChange={(e) => onRename(e.target.value)}
        disabled={readOnly}
        aria-label="Pillar name"
        className="font-bold rounded-md border border-transparent bg-transparent px-1.5 py-0.5 hover:border-ink/10 focus:border-ink/20 disabled:hover:border-transparent min-w-0"
      />
      <div className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto flex flex-wrap gap-1.5">
        {pillar.keywords.map((k) => (
          <span
            key={k}
            className={`inline-flex items-center gap-1 rounded-md pl-2 pr-1 py-0.5 font-mono text-xs ${
              fresh.has(`${pillar.name}|${k}`) ? "bg-pos/10 text-pos" : "bg-ink/5"
            }`}
          >
            {k}
            {!readOnly && (
              <button aria-label={`Remove ${k}`} onClick={() => onRemove(k)} className="px-1 text-ink/40 hover:text-neg">
                ×
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => {
              if (draft.trim()) onAdd(draft);
              setDraft("");
            }}
            placeholder="+ keyword"
            aria-label={`Add keyword to ${pillar.name}`}
            className="w-28 rounded-md border border-dashed border-ink/15 bg-transparent px-2 py-0.5 font-mono text-xs"
          />
        )}
      </div>
      <span className="font-mono text-xs text-ink/40 tabular-nums pt-1">{count} posts</span>
      {!readOnly ? (
        <button aria-label={`Delete ${pillar.name}`} onClick={onDelete} className="text-ink/40 hover:text-neg pt-0.5">
          ✕
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

function Suggestion({
  word,
  count,
  pillars,
  examples,
  onPick,
}: {
  word: string;
  count: number;
  pillars: string[];
  examples: string[];
  onPick: (pillar: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  function pick(pillar: string) {
    setOpen(false);
    onPick(pillar);
  }

  return (
    <div ref={ref} className="relative">
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-mono text-xs ${
          open ? "border-pos text-pos" : "border-ink/10 hover:border-pos hover:text-pos"
        }`}
      >
        {word} <span className="text-ink/40">{count}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1.5 w-64 rounded-xl border border-ink/30 bg-card p-1.5 shadow-lg flex flex-col"
        >
          <span className="px-2 pt-1 pb-1.5 font-mono text-[11px] text-ink/40">Add “{word}” to</span>
          {pillars.map((p) => (
            <button
              key={p}
              role="menuitem"
              onClick={() => pick(p)}
              className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-ink/5 focus:bg-ink/5"
            >
              {p}
            </button>
          ))}
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && pick(newName.trim())}
            placeholder="New pillar name…"
            aria-label="New pillar name"
            className="m-1 rounded-md border border-ink/10 bg-paper px-2 py-1.5 text-sm"
          />
          {examples.length > 0 && (
            <div className="mt-1 border-t border-ink/10 px-2 pt-2 pb-1">
              <span className="font-mono text-[11px] text-ink/40">Would categorise</span>
              <ul className="mt-1 flex flex-col gap-1 text-xs text-ink/60">
                {examples.map((t) => (
                  <li key={t} className="line-clamp-2">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
