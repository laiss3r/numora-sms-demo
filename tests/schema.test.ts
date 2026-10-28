import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222";
beforeAll(async () => {
  // Minimal Supabase auth/role scaffolding for a local PostgreSQL-compatible test.
  // This does not configure, deploy to, or certify a real Supabase project.
  await db.exec(
    `create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public,auth to anon,authenticated,service_role;create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202610280001_initial.sql", "utf8"),
  );
  await db.exec(
    `insert into auth.users values('${alice}'),('${bob}');insert into profiles(id,display_name) values('${alice}','Alice'),('${bob}','Bob');insert into wallets(id,user_id) values('${alice}','${alice}'),('${bob}','${bob}');insert into user_roles(user_id,role) values('${alice}','customer'),('${bob}','admin');`,
  );
}, 30000);
afterAll(() => db.close());
describe("future SQL foundation (local PostgreSQL engine, mock auth)", () => {
  it("creates all 12 required RLS-enabled tables", async () => {
    const result = await db.query<{ count: number }>(
      `select count(*)::int as count from pg_tables t join pg_class c on c.relname=t.tablename join pg_namespace n on n.oid=c.relnamespace and n.nspname=t.schemaname where t.schemaname='public' and c.relrowsecurity`,
    );
    expect(result.rows[0].count).toBe(12);
  });
  it("restricts customer reads to own profiles, roles and wallets", async () => {
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${alice}',false);`,
    );
    try {
      for (const table of ["profiles", "wallets", "user_roles"]) {
        const result = await db.query(`select * from ${table}`);
        expect(result.rows).toHaveLength(1);
      }
      const role = await db.query<{ role: string }>(
        `select role from user_roles`,
      );
      expect(role.rows[0].role).toBe("customer");
    } finally {
      await db.exec("reset role");
    }
  });
  it("denies browser role assignment, ledger writes and privileged ledger RPC", async () => {
    await db.exec(
      `set role authenticated;select set_config('request.jwt.claim.sub','${alice}',false);`,
    );
    try {
      await expect(
        db.exec(
          `insert into user_roles(user_id,role) values('${alice}','admin')`,
        ),
      ).rejects.toThrow("permission denied");
      await expect(
        db.exec(
          `select post_ledger_entry('${alice}','forged',100,'credit','bad')`,
        ),
      ).rejects.toThrow("permission denied");
    } finally {
      await db.exec("reset role");
    }
  });
  it("serializes a ledger source of truth and rejects conflicting replays and overdrafts", async () => {
    await db.exec("set role service_role");
    try {
      await db.exec(
        `select post_ledger_entry('${alice}','seed',10000,'credit','opening');select post_ledger_entry('${alice}','seed',10000,'credit','opening');`,
      );
      const r = await db.query<{ total: string }>(
        `select sum(amount_minor)::text as total from transactions where wallet_id='${alice}'`,
      );
      expect(r.rows[0].total).toBe("10000");
      await expect(
        db.exec(
          `select post_ledger_entry('${alice}','seed',999,'credit','conflict')`,
        ),
      ).rejects.toThrow("Idempotency conflict");
      await expect(
        db.exec(
          `select post_ledger_entry('${alice}','overdraft',-20000,'rental','bad')`,
        ),
      ).rejects.toThrow("Insufficient balance");
    } finally {
      await db.exec("reset role");
    }
  });
});
