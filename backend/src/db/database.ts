import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(__dirname, '../../data/knowledge.db');
const dataDir = path.dirname(dbPath);

let db: SqlJsDatabase | null = null;

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  return db;
}

export function saveDatabase(): void {
  if (!db) return;

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Helper to run a query and get all results
export function queryAll<T>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();

  return results;
}

// Helper to run a query and get one result
export function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  const results = queryAll<T>(sql, params);
  return results[0];
}

// Helper to run a statement (INSERT, UPDATE, DELETE)
export function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!db) throw new Error('Database not initialized');

  db.run(sql, params);

  // Get last insert rowid
  const lastId = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
  const changes = queryOne<{ c: number }>('SELECT changes() as c');

  return {
    lastInsertRowid: lastId?.id || 0,
    changes: changes?.c || 0
  };
}

// Helper to execute raw SQL (for schema creation)
export function exec(sql: string): void {
  if (!db) throw new Error('Database not initialized');
  db.exec(sql);
}
