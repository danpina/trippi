// Locks the Supabase "public" schema against the auto-generated REST API.
//
// Supabase exposes every table in `public` over HTTP to anyone holding the project's
// publishable key, which is embedded in the site's JavaScript. Without Row-Level Security that
// means anyone can read or change the data directly, bypassing the app. This app never uses
// that API for data (it connects with Prisma as the database owner, which bypasses RLS), so
// the safe setup is: RLS on, no policies, and no privileges for the API roles.
//
// Idempotent. Run it after every `prisma db push` (the `db:push` script does) so newly
// created tables are covered too.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

try {
  const tables = await db.$queryRawUnsafe(`select tablename from pg_tables where schemaname = 'public'`);
  for (const { tablename } of tables) {
    await db.$executeRawUnsafe(`alter table "public"."${tablename}" enable row level security`);
  }

  // Defense in depth: even with RLS, the API roles shouldn't hold privileges on app tables.
  await db.$executeRawUnsafe(`revoke all on all tables in schema public from anon, authenticated`);
  await db.$executeRawUnsafe(`revoke all on all sequences in schema public from anon, authenticated`);
  await db.$executeRawUnsafe(
    `alter default privileges in schema public revoke all on tables from anon, authenticated`
  );

  const status = await db.$queryRawUnsafe(
    `select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`
  );
  const open = status.filter((t) => !t.rowsecurity).map((t) => t.tablename);
  console.log(`RLS enabled on ${status.length - open.length}/${status.length} public tables.`);
  if (open.length) {
    console.error("Still open:", open.join(", "));
    process.exitCode = 1;
  }
} finally {
  await db.$disconnect();
}
