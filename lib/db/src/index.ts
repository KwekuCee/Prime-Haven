import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

const noOp = {
  findMany: async () => [],
  findFirst: async () => null,
  findUnique: async () => null,
  create: async (d: any) => d?.data ?? {},
  update: async (d: any) => d?.data ?? {},
  delete: async () => ({}),
};

const mockDb: any = new Proxy({}, {
  get: (_, prop) =>
    prop === "query"
      ? new Proxy({}, { get: () => noOp })
      : async () => [],
});

const mockPool: any = {
  query: async () => ({ rows: [] }),
  connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
  on: () => {},
  end: async () => {},
};

export function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      console.warn("[AI Studio] DATABASE_URL not set — using mock pool");
      return mockPool as pg.Pool;
    }
    try {
      _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    } catch {
      console.warn("[AI Studio] Database not connected — using mock pool");
      return mockPool as pg.Pool;
    }
  }
  return _pool;
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      console.warn("[AI Studio] DATABASE_URL not set — using mock db");
      return mockDb as ReturnType<typeof drizzle>;
    }
    try {
      const p = getPool();
      _db = drizzle(p, { schema });
    } catch {
      console.warn("[AI Studio] Database not connected — using mock db");
      return mockDb as ReturnType<typeof drizzle>;
    }
  }
  return _db;
}

export const pool: pg.Pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    const p = getPool();
    const val = (p as any)[prop];
    return typeof val === "function" ? val.bind(p) : val;
  },
});

export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const d = getDb();
    const val = (d as any)[prop];
    return typeof val === "function" ? val.bind(d) : val;
  },
});

export * from "./schema";
