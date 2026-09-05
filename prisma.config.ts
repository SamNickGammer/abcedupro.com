import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env on its own, and no longer takes the connection
// URL from the schema — both live here.
//
// Migrations run DDL, which Neon's connection pooler cannot proxy, so the CLI
// gets the direct (unpooled) URL while the app keeps using the pooled one.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  },
});
