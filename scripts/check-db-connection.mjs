import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const { Client } = pg;

async function checkConnection(name, connectionString) {
  if (!connectionString) {
    console.error(`${name}: missing`);
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 8000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    const result = await client.query(
      "select current_database() as database, current_user as user_name, current_schema() as schema_name"
    );
    const row = result.rows[0];
    console.log(
      `${name}: ok (database=${row.database}, user=${row.user_name}, schema=${row.schema_name ?? "null"})`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${name}: failed (${message})`);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

await checkConnection("DATABASE_URL", process.env.DATABASE_URL);
await checkConnection("DIRECT_URL", process.env.DIRECT_URL);
