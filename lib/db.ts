import { Pool, types } from "pg";

// Return DATE/TIMESTAMP columns as strings instead of JS Date objects
types.setTypeParser(1082, (val: string) => val);   // DATE
types.setTypeParser(1114, (val: string) => val);   // TIMESTAMP
// Return numeric types as JS numbers instead of strings
types.setTypeParser(20,   (val: string) => parseInt(val, 10));  // INT8/BIGINT
types.setTypeParser(23,   (val: string) => parseInt(val, 10));  // INT4
types.setTypeParser(1700, (val: string) => parseFloat(val));    // NUMERIC/DECIMAL

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}
