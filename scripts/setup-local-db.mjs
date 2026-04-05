import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";

if (!databaseUrl.startsWith("file:")) {
  throw new Error("Local setup only supports SQLite file DATABASE_URL values.");
}

const relativePath = databaseUrl.replace(/^file:/, "");
const resolvedPath = path.isAbsolute(relativePath)
  ? relativePath
  : path.resolve(process.cwd(), relativePath);

fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  create table if not exists "Lead" (
    "id" text not null primary key,
    "name" text not null,
    "email" text not null,
    "company" text,
    "teamSize" text,
    "message" text not null,
    "createdAt" datetime not null default current_timestamp
  );

  create table if not exists "Form" (
    "id" text not null primary key,
    "name" text not null,
    "slug" text not null,
    "headline" text not null,
    "description" text not null,
    "accent" text not null default '#ff7a00',
    "status" text not null default 'DRAFT',
    "fields" text not null,
    "createdAt" datetime not null default current_timestamp,
    "updatedAt" datetime not null default current_timestamp
  );

  create unique index if not exists "Form_slug_key" on "Form"("slug");

  create table if not exists "FormSubmission" (
    "id" text not null primary key,
    "formId" text not null,
    "fullName" text not null,
    "email" text not null,
    "company" text,
    "website" text,
    "goals" text not null,
    "createdAt" datetime not null default current_timestamp,
    foreign key ("formId") references "Form"("id") on delete cascade
  );

  create index if not exists "FormSubmission_formId_createdAt_idx"
    on "FormSubmission"("formId", "createdAt" desc);
`);

db.close();

console.log(`Local SQLite database ready at ${resolvedPath}`);
