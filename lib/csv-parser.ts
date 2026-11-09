export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): ParseResult {
  const fields: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\r' && text[i + 1] === '\n') {
        row.push(field.trim());
        field = '';
        fields.push(row);
        row = [];
        i += 2;
        continue;
      } else if (ch === '\n') {
        row.push(field.trim());
        field = '';
        fields.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
    i++;
  }

  if (field !== '' || row.length > 0) {
    row.push(field.trim());
    if (row.some(f => f !== '')) fields.push(row);
  }

  if (fields.length === 0) return { headers: [], rows: [] };

  const headers = fields[0];
  const rows = fields.slice(1)
    .map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = r[idx] ?? ''; });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v !== ''));

  return { headers, rows };
}
