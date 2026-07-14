import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read Next's env files on its own; load them explicitly.
// .env.local wins over .env if both exist.
config({ path: ".env.local" });
config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
