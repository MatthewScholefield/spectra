import type { DataTable, Column } from './types';

export function createTableFromHeaders(headers: string[]): DataTable {
  const columns: Column[] = headers.map((h) => ({
    key: h,
    header: h,
    type: 'numeric',
    values: [],
  }));
  return { columns, rowCount: 0, indexColumnKey: headers[0] ?? null };
}

export function rowToValues(row: Record<string, unknown>): Map<string, string | number | null> {
  const values = new Map<string, string | number | null>();
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('_')) continue;
    values.set(key, value as string | number | null);
  }
  return values;
}
