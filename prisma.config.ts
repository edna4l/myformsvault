import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

const installTimeDatabaseUrl =
  "postgresql://prisma:prisma@localhost:5432/myformsvault?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || installTimeDatabaseUrl,
  },
});
