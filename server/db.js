// Database connection.
// On Vercel we use Neon Postgres (DATABASE_URL is added by the Neon integration).
// When running locally without DATABASE_URL we use PGlite, a real Postgres that runs in-process,
// so the same SQL works in both places.

let queryFn = null;

// Vercel's Neon integration may add a prefix to the variable names (e.g. Mangao_DATABASE_URL).
function databaseUrl() {
  const env = process.env;
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (env.POSTGRES_URL) return env.POSTGRES_URL;
  const key = Object.keys(env).find((k) => k.endsWith('_DATABASE_URL'))
    || Object.keys(env).find((k) => k.endsWith('_POSTGRES_URL'));
  return key ? env[key] : '';
}

export async function getQuery() {
  if (queryFn) return queryFn;
  const url = databaseUrl();
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    queryFn = (text, params = []) => sql.query(text, params);
  } else {
    if (process.env.VERCEL) {
      throw new Error('DATABASE_URL is not set. Connect a Neon database to this Vercel project.');
    }
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite(process.env.PGLITE_DIR || undefined);
    queryFn = async (text, params = []) => (await db.query(text, params)).rows;
  }
  return queryFn;
}

export async function q(text, params) {
  const run = await getQuery();
  return run(text, params);
}

export async function one(text, params) {
  const rows = await q(text, params);
  return rows[0] || null;
}
