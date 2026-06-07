import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "(not set)";

  // Parse host/port without exposing password
  let host = "(parse error)";
  try {
    const parsed = new URL(url);
    host = `${parsed.hostname}:${parsed.port}`;
  } catch {}

  try {
    const pool = new Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    await pool.end();
    return NextResponse.json({ ok: true, host });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, host, error: msg }, { status: 500 });
  }
}
