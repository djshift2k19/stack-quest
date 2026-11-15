/**
 * Tests supabase/schema.sql on PGlite (real Postgres), with a small
 * stand-in for Supabase's login system (auth.users and auth.uid()).
 * This proves the security rules work before they ever touch the real project.
 */

import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const THANDI = "11111111-1111-1111-1111-111111111111";
const SIPHO = "22222222-2222-2222-2222-222222222222";
const AISHA = "33333333-3333-3333-3333-333333333333";

const SUPABASE_STAND_IN = `
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon nologin;
create role authenticated nologin;
grant usage on schema public, auth to anon, authenticated;
grant select on auth.users to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
`;

describe("supabase/schema.sql security rules", () => {
  let db: PGlite;

  /** Run SQL as a signed-in learner (or as a visitor who isn't signed in). */
  async function as(userId: string | null, sql: string) {
    await db.exec("reset role");
    if (userId) await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`);
    else await db.exec(`select set_config('request.jwt.claim.sub', '', false); set role anon;`);
    try {
      return await db.query(sql);
    } finally {
      await db.exec("reset role");
    }
  }

  beforeAll(async () => {
    db = await PGlite.create();
    await db.exec(SUPABASE_STAND_IN);
    await db.exec(readFileSync("supabase/schema.sql", "utf8"));
    await db.exec(readFileSync("supabase/schema.sql", "utf8")); // running twice is safe
    await db.exec(`insert into auth.users values ('${THANDI}'), ('${SIPHO}'), ('${AISHA}')`);
    await db.exec(`grant delete on auth.users to postgres`);
  }, 30_000);
  afterAll(() => db.close());

  it("lets a learner save and read their own progress", async () => {
    await as(THANDI, `insert into public.progress (user_id, data, xp) values ('${THANDI}', '{"xp": 120}', 120)`);
    const rows = await as(THANDI, "select xp from public.progress");
    expect(rows.rows).toEqual([{ xp: 120 }]);
  });

  it("hides other learners' progress", async () => {
    await as(SIPHO, `insert into public.progress (user_id, data, xp) values ('${SIPHO}', '{}', 40)`);
    const rows = await as(SIPHO, "select user_id from public.progress");
    expect(rows.rows).toEqual([{ user_id: SIPHO }]);
  });

  it("refuses to save progress under someone else's id", async () => {
    await expect(as(SIPHO, `insert into public.progress (user_id, data, xp) values ('${AISHA}', '{}', 999)`)).rejects.toThrow(
      /row-level security/,
    );
  });

  it("refuses to change someone else's progress (silently changes nothing)", async () => {
    await as(SIPHO, `update public.progress set xp = 0 where user_id = '${THANDI}'`);
    expect((await db.query(`select xp from public.progress where user_id = '${THANDI}'`)).rows).toEqual([{ xp: 120 }]);
  });

  it("shows nothing to visitors who aren't signed in", async () => {
    await expect(as(null, "select * from public.progress")).resolves.toMatchObject({ rows: [] });
    await expect(as(null, "select * from public.get_leaderboard()")).rejects.toThrow(/permission denied/);
  });

  it("only puts opted-in learners on the leaderboard, with just a name and XP", async () => {
    await as(THANDI, `insert into public.leaderboard_profiles values ('${THANDI}', 'Thandi K', true)`);
    await as(SIPHO, `insert into public.leaderboard_profiles values ('${SIPHO}', 'Sipho', false)`);
    const board = await as(SIPHO, "select * from public.get_leaderboard()");
    expect(board.rows).toEqual([{ display_name: "Thandi K", xp: 120 }]);
  });

  it("rejects display names that are too short or too long", async () => {
    await expect(as(AISHA, `insert into public.leaderboard_profiles values ('${AISHA}', 'A', true)`)).rejects.toThrow(/check/);
  });

  it("'delete my account' removes the learner and all their data, and nobody else's", async () => {
    await as(THANDI, "select public.delete_my_account()");
    expect((await db.query(`select count(*)::int as n from auth.users where id = '${THANDI}'`)).rows).toEqual([{ n: 0 }]);
    expect((await db.query(`select count(*)::int as n from public.progress where user_id = '${THANDI}'`)).rows).toEqual([{ n: 0 }]);
    expect((await db.query(`select count(*)::int as n from public.leaderboard_profiles`)).rows).toEqual([{ n: 1 }]);
    expect((await db.query(`select count(*)::int as n from auth.users`)).rows).toEqual([{ n: 2 }]);
  });
});
