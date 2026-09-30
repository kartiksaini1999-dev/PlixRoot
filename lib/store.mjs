import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
let connection;
export async function database() {
  if (connection) return connection;
  connection = (async () => {
    const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
    if (process.env.DATABASE_URL) {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      const query = (text, params = []) => sql.query(text, params);
      for (const statement of schema.split(';').map(x => x.trim()).filter(Boolean)) await query(statement);
      return { query, mode: 'postgres' };
    }
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw Object.assign(new Error('Database is not connected. Set DATABASE_URL to your Neon connection string in Vercel and redeploy.'), { status: 503 });
    const { DatabaseSync } = await import('node:sqlite');
    const dir = resolve(process.env.LOCAL_DATA_DIR || '.data');
    await mkdir(dir, { recursive: true });
    const db = new DatabaseSync(resolve(dir, 'root.sqlite'));
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec(schema);
    return { mode: 'sqlite-development', async query(text, params = []) {
      const statement = db.prepare(text.replace(/\$\d+/g, '?'));
      return /^\s*(SELECT|INSERT.*RETURNING)/is.test(text) || /\bRETURNING\b/i.test(text) ? statement.all(...params) : (statement.run(...params), []);
    }};
  })();
  try { return await connection; } catch (error) { connection = null; throw error; }
}
export async function put(kind, id, owner, value) {
  const { query } = await database();
  await query('INSERT INTO root_records(kind,id,owner_id,payload,created_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload', [kind,id,owner,JSON.stringify(value),value.createdAt||Date.now()]);
  return value;
}
export async function get(kind, id, owner) {
  const { query } = await database();
  const rows = owner ? await query('SELECT payload FROM root_records WHERE kind=$1 AND id=$2 AND owner_id=$3', [kind,id,owner]) : await query('SELECT payload FROM root_records WHERE kind=$1 AND id=$2',[kind,id]);
  return rows[0] ? JSON.parse(rows[0].payload) : null;
}
export async function list(kind, owner) {
  const { query } = await database();
  const rows = owner ? await query('SELECT payload FROM root_records WHERE kind=$1 AND owner_id=$2 ORDER BY created_at',[kind,owner]) : await query('SELECT payload FROM root_records WHERE kind=$1 ORDER BY created_at',[kind]);
  return rows.map(x => JSON.parse(x.payload));
}
export async function remove(kind,id,owner) {
  const { query } = await database();
  await query('DELETE FROM root_records WHERE kind=$1 AND id=$2 AND owner_id=$3',[kind,id,owner]);
}
export async function removeOwner(owner) {
  const { query } = await database();
  await query('DELETE FROM root_records WHERE owner_id=$1',[owner]);
}
export async function rateLimit(key,max,windowMs=900000) {
  const { query } = await database();
  const bucket = `${key}:${Math.floor(Date.now()/windowMs)}`;
  const rows=await query('INSERT INTO root_rate_limits(bucket_key,hit_count,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket_key) DO UPDATE SET hit_count=root_rate_limits.hit_count+1 RETURNING hit_count',[bucket,Date.now()+windowMs]);
  await query('DELETE FROM root_rate_limits WHERE expires_at < $1',[Date.now()]);
  return Number(rows[0].hit_count) <= max;
}
