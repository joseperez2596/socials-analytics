"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface TableResult {
  mapping: string;
  label: string;
  table: string;
  rowsImported: number;
  rowsSkipped: number;
  fieldsUsed: string[];
  fieldsSkipped: string[];
  errors: string[];
}

interface FileResult {
  filename: string;
  tables: TableResult[];
  error?: string;
}

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FileResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fs: File[]) {
    setFiles(fs);
    setResults([]);
    setErrorMsg(null);
    setShowSkipped(new Set());
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const fs = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith(".csv") || f.type === "text/csv"
    );
    if (fs.length) handleFiles(fs);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const fs = Array.from(e.target.files ?? []);
    if (fs.length) handleFiles(fs);
  }

  async function submit() {
    if (files.length === 0) return;
    setLoading(true);
    setResults([]);
    setErrorMsg(null);

    const acc: FileResult[] = [];
    for (const f of files) {
      try {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/import", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) {
          acc.push({ filename: f.name, tables: [], error: json.error ?? "Import failed" });
        } else {
          acc.push({ filename: f.name, tables: json.tables ?? [] });
        }
      } catch {
        acc.push({ filename: f.name, tables: [], error: "Network error" });
      }
      setResults([...acc]);
    }

    setLoading(false);
  }

  function reset() {
    setFiles([]);
    setResults([]);
    setErrorMsg(null);
    setShowSkipped(new Set());
    if (inputRef.current) inputRef.current.value = "";
  }

  function toggleSkipped(key: string) {
    setShowSkipped(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const fmtBytes = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="px-6 py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Import CSV</h1>
      <p className="text-sm text-ink/50 mb-8">
        Drop one or more CSV exports from YouTube, TikTok, or Meta. All matching data is written
        to the database.
      </p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors select-none ${
          dragging
            ? "border-ink/40 bg-ink/5"
            : files.length > 0
            ? "border-ink/20 bg-ink/[0.03]"
            : "border-ink/15 hover:border-ink/30 hover:bg-ink/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
        {files.length > 0 ? (
          <div>
            {files.length === 1 ? (
              <>
                <p className="font-medium text-sm">{files[0].name}</p>
                <p className="text-xs text-ink/40 mt-1">{fmtBytes(files[0].size)}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-sm">{files.length} files selected</p>
                <p className="text-xs text-ink/40 mt-1">{fmtBytes(totalSize)} total</p>
                <ul className="mt-2 space-y-0.5">
                  {files.map(f => (
                    <li key={f.name} className="text-xs text-ink/50">{f.name}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-ink/50">Drop CSVs here or click to browse</p>
            <p className="text-xs text-ink/30 mt-1">YouTube · TikTok · Instagram · Facebook · multiple files ok</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={submit}
          disabled={files.length === 0 || loading}
          className="px-5 py-2 rounded-lg bg-ink text-paper text-sm font-medium disabled:opacity-30 hover:bg-ink/80 transition-colors"
        >
          {loading ? `Importing… (${results.length}/${files.length})` : "Upload & Import"}
        </button>
        {(files.length > 0 || results.length > 0) && (
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm text-ink/50 hover:text-ink hover:bg-ink/5 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <p className="text-sm font-medium text-red-600">{errorMsg}</p>
        </div>
      )}

      {/* Results — one card per file */}
      {results.length > 0 && (
        <div className="mt-6 space-y-4">
          {results.map((r, fi) => (
            <div key={r.filename} className="rounded-xl border border-ink/10 bg-card p-5 space-y-4">
              {/* File header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{r.filename}</p>
                </div>
                {r.error ? (
                  <p className="text-xs text-red-500 flex-shrink-0">{r.error}</p>
                ) : (
                  <div className="flex gap-4 text-right flex-shrink-0">
                    <div>
                      <p className="text-xl font-bold tabular-nums text-emerald-600">
                        {r.tables.reduce((s, t) => s + t.rowsImported, 0)}
                      </p>
                      <p className="text-xs text-ink/40">imported</p>
                    </div>
                    {r.tables.some(t => t.rowsSkipped > 0) && (
                      <div>
                        <p className="text-xl font-bold tabular-nums text-amber-500">
                          {r.tables.reduce((s, t) => s + t.rowsSkipped, 0)}
                        </p>
                        <p className="text-xs text-ink/40">skipped</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Per-table breakdown */}
              {r.tables.map((t, ti) => {
                const key = `${fi}-${ti}`;
                return (
                  <div key={key} className="border-t border-ink/5 pt-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{t.label}</span>
                      <span className="text-xs font-mono text-ink/40">{t.table}</span>
                    </div>

                    {/* Fields used */}
                    {t.fieldsUsed.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.fieldsUsed.map(f => (
                          <span key={f} className="px-2 py-0.5 rounded bg-ink/10 text-xs font-mono">{f}</span>
                        ))}
                      </div>
                    )}

                    {/* Fields skipped (collapsible) */}
                    {t.fieldsSkipped.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleSkipped(key)}
                          className="text-xs text-ink/40 hover:text-ink/60 transition-colors"
                        >
                          {showSkipped.has(key) ? "▾" : "▸"} {t.fieldsSkipped.length} field
                          {t.fieldsSkipped.length !== 1 ? "s" : ""} not in schema
                        </button>
                        {showSkipped.has(key) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {t.fieldsSkipped.map(f => (
                              <span key={f} className="px-2 py-0.5 rounded bg-ink/5 text-xs font-mono text-ink/40">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Per-row errors */}
                    {t.errors.length > 0 && (
                      <ul className="space-y-1">
                        {t.errors.map((e, i) => (
                          <li key={i} className="text-xs text-amber-700 font-mono">{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              {/* File had no DB matches at all */}
              {!r.error && r.tables.length === 0 && (
                <p className="text-xs text-ink/40 border-t border-ink/5 pt-3">
                  No matching database schema — nothing imported.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
