import { NextRequest, NextResponse } from 'next/server';
import { parseCsv } from '@/lib/csv-parser';
import { CSV_TYPES, RowMapping, PivotMapping } from '@/lib/csv-mappings';
import { pool } from '@/lib/db';

const TABLES_WITH_SYNCED_AT = new Set(['tiktok_videos', 'yt_videos', 'ig_media', 'fb_posts']);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const text = await file.text();
  const { headers, rows } = parseCsv(text);

  if (headers.length === 0) {
    return NextResponse.json({ error: 'CSV has no headers' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  type TableResult = {
    mapping: string;
    label: string;
    table: string;
    rowsImported: number;
    rowsSkipped: number;
    fieldsUsed: string[];
    fieldsSkipped: string[];
    errors: string[];
  };

  const tables: TableResult[] = [];

  for (const config of CSV_TYPES) {
    if (config.mapping.handler === 'rows') {
      const m = config.mapping as RowMapping;
      const csvCols = Object.keys(m.fieldMap).filter(c => headers.includes(c));
      if (csvCols.length === 0) continue;

      const dbCols = csvCols.map(c => m.fieldMap[c]);
      const hasSyncedAt = TABLES_WITH_SYNCED_AT.has(m.table);
      const allDbCols = hasSyncedAt ? [...dbCols, 'synced_at'] : dbCols;
      const setClauses = dbCols
        .filter(col => col !== m.conflictColumn)
        .map(col => `${col} = EXCLUDED.${col}`)
        .join(', ');
      const syncedAtClause = hasSyncedAt
        ? (setClauses ? ', synced_at = CURRENT_DATE' : 'synced_at = CURRENT_DATE')
        : '';
      const upsertSuffix = (setClauses || syncedAtClause)
        ? `DO UPDATE SET ${setClauses}${syncedAtClause}`
        : 'DO NOTHING';

      let rowsImported = 0;
      let rowsSkipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const values = csvCols.map(c => {
          const v = row[c];
          return v === '' || v === undefined ? null : v;
        });
        if (hasSyncedAt) values.push(today);

        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
        const sql = `
          INSERT INTO ${m.table} (${allDbCols.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (${m.conflictColumn}) ${upsertSuffix}
        `;

        try {
          await pool.query(sql, values);
          rowsImported++;
        } catch (err) {
          rowsSkipped++;
          if (errors.length < 10) {
            errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }

      tables.push({
        mapping: config.key,
        label: config.label,
        table: m.table,
        rowsImported,
        rowsSkipped,
        fieldsUsed: csvCols,
        fieldsSkipped: Object.keys(m.fieldMap).filter(c => !headers.includes(c)),
        errors,
      });
    }

    if (config.mapping.handler === 'pivot') {
      const m = config.mapping as PivotMapping;
      if (!headers.includes(m.pivotKeyCol) || !headers.includes(m.pivotValueCol)) continue;

      const keyValues: Record<string, string> = {};
      for (const row of rows) {
        const k = row[m.pivotKeyCol];
        const v = row[m.pivotValueCol];
        if (k && v !== undefined) keyValues[k] = v;
      }

      for (const target of m.targets) {
        const matched = Object.keys(target.keyMap).filter(k => k in keyValues);
        if (matched.length === 0) continue;

        const unmatched = Object.keys(keyValues).filter(
          k => !m.targets.some(t => k in t.keyMap),
        );

        const dbCols = matched.map(k => target.keyMap[k]);
        const values: (string | number | null)[] = matched.map(k => {
          const v = keyValues[k];
          const num = Number(v);
          return isNaN(num) ? v : num;
        });
        const allCols = ['synced_date', ...dbCols];
        const allVals = [today, ...values];
        const placeholders = allVals.map((_, idx) => `$${idx + 1}`).join(', ');
        const setClauses = dbCols.map(col => `${col} = EXCLUDED.${col}`).join(', ');

        const sql = `
          INSERT INTO ${target.table} (${allCols.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (${target.conflictColumn}) DO UPDATE SET ${setClauses}
        `;

        let rowsImported = 0;
        let rowsSkipped = 0;
        const errors: string[] = [];

        try {
          await pool.query(sql, allVals);
          rowsImported = 1;
        } catch (err) {
          rowsSkipped = 1;
          errors.push(`${target.table}: ${err instanceof Error ? err.message : String(err)}`);
        }

        tables.push({
          mapping: config.key,
          label: config.label,
          table: target.table,
          rowsImported,
          rowsSkipped,
          fieldsUsed: matched,
          fieldsSkipped: unmatched,
          errors,
        });
      }
    }
  }

  return NextResponse.json({ tables });
}
