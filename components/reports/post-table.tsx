"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PostRow {
  rank: number;
  title: string;
  type?: string;
  primary: string;
  secondary?: string;
  tertiary?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
  thumbnail?: string;
  href?: string;
}

interface PostTableProps {
  rows: PostRow[];
  accentColor?: string;
}

export function PostTable({ rows, accentColor }: PostTableProps) {
  const hasSecondary = rows.some((r) => r.secondaryLabel);
  const hasTertiary = rows.some((r) => r.tertiaryLabel);
  const hasThumbnail = rows.some((r) => r.thumbnail);

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-ink/10">
          <TableHead className="w-8 text-ink/40 text-xs">#</TableHead>
          {hasThumbnail && <TableHead className="w-16" />}
          <TableHead className="text-ink/40 text-xs">Content</TableHead>
          {rows[0]?.type !== undefined && (
            <TableHead className="text-ink/40 text-xs">Type</TableHead>
          )}
          <TableHead className="text-right text-ink/40 text-xs">
            {rows[0]?.primaryLabel ?? ""}
          </TableHead>
          {hasSecondary && (
            <TableHead className="text-right text-ink/40 text-xs">
              {rows[0]?.secondaryLabel ?? ""}
            </TableHead>
          )}
          {hasTertiary && (
            <TableHead className="text-right text-ink/40 text-xs">
              {rows[0]?.tertiaryLabel ?? ""}
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.rank}
            className={`border-ink/5 ${row.href ? "cursor-pointer hover:bg-ink/[0.03]" : ""}`}
            onClick={() => row.href && window.open(row.href, "_blank", "noopener,noreferrer")}
          >
            <TableCell
              className="font-mono text-xs"
              style={{ color: accentColor ?? "#1a1814", opacity: 0.6 }}
            >
              {row.rank}
            </TableCell>
            {hasThumbnail && (
              <TableCell className="py-1.5">
                {row.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.thumbnail}
                    alt=""
                    width={56}
                    height={36}
                    className="w-14 h-9 object-cover rounded"
                  />
                ) : (
                  <div className="w-14 h-9 rounded bg-ink/10" />
                )}
              </TableCell>
            )}
            <TableCell className="text-sm max-w-xs truncate">
              {row.title}
            </TableCell>
            {row.type !== undefined && (
              <TableCell className="text-xs font-mono text-ink/40">
                {row.type}
              </TableCell>
            )}
            <TableCell className="text-right font-mono text-sm tabular-nums">
              {row.primary}
            </TableCell>
            {hasSecondary && (
              <TableCell className="text-right font-mono text-sm tabular-nums text-ink/60">
                {row.secondary ?? "—"}
              </TableCell>
            )}
            {hasTertiary && (
              <TableCell className="text-right font-mono text-sm tabular-nums text-ink/60">
                {row.tertiary ?? "—"}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
