/**
 * TSV (tab-separated values) round-trip for spreadsheet clipboard interop.
 *
 * Excel/Sheets/Airtable all read and write TSV on the system clipboard for
 * cell-range copy/paste. This is the single most important "feels like
 * Excel" behaviour in the package — getting the grammar exactly right is
 * what lets a range copied here paste cleanly into a real spreadsheet, and
 * vice versa:
 *
 *  - Cells are separated by \t, rows by \n on output. Real spreadsheet
 *    software (Excel on Windows in particular) emits \r\n between rows; the
 *    parser accepts \n, \r\n and bare \r so paste-from-Excel works too.
 *  - A cell whose value contains a tab, a newline/CR, or a double quote is
 *    wrapped in double quotes with interior quotes doubled (the same
 *    RFC-4180-style escaping Excel/Sheets use for TSV, not just CSV).
 *  - A cell that needs no escaping is emitted bare. This matters: Excel does
 *    NOT quote plain cells, and quoting every cell unconditionally breaks
 *    round-trips with real spreadsheet software (a leading `"` is
 *    significant there).
 */

export function needsQuoting(value: string): boolean {
  return value.includes('\t') || value.includes('\n') || value.includes('\r') || value.includes('"');
}

export function quoteCell(value: string): string {
  if (!needsQuoting(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function serializeTsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(quoteCell).join('\t')).join('\n');
}

/**
 * Hand-rolled state machine rather than a split() — a naive `text.split('\n')`
 * followed by `line.split('\t')` corrupts any cell containing an embedded
 * tab or newline inside quotes, which is exactly the case #1 requirement
 * calls out ("values containing tabs/newlines/quotes").
 */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushCell = (): void => {
    row.push(cell);
    cell = '';
  };
  const pushRow = (): void => {
    pushCell();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }

    if (ch === '"' && cell.length === 0) {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === '\t') {
      pushCell();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') {
        pushRow();
        i += 2;
        continue;
      }
      pushRow();
      i += 1;
      continue;
    }
    if (ch === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }

  // Trailing cell/row not terminated by a delimiter.
  if (cell.length > 0 || row.length > 0 || rows.length === 0) {
    pushRow();
  }

  // A single trailing newline in the source (the common case when copying a
  // rectangular range) must not manifest as an extra, wholly-empty row.
  if (rows.length > 1 && /[\r\n]$/.test(text)) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === '') {
      rows.pop();
    }
  }

  return rows;
}
