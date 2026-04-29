import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const installTimeDatabaseUrl =
  "postgresql://prisma:prisma@localhost:5432/myformsvault?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl || installTimeDatabaseUrl,
  },
});
