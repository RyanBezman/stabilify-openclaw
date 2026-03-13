import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  __dirname,
  "20260313103000_account_lifecycle.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");

describe("account lifecycle migration SQL", () => {
  it("keeps profile directory sync as a security definer trigger function", () => {
    expect(migrationSql).toMatch(
      /create or replace function public\.sync_profile_directory_from_profiles\(\)\s+returns trigger\s+language plpgsql\s+security definer\s+set search_path = public\s+as \$\$/i,
    );
  });

  it("keeps audience read policies gated to active accounts", () => {
    expect(migrationSql).toContain(
      "profiles.account_status = 'active'::public.account_lifecycle_status",
    );
    expect(migrationSql).toContain(
      "p.account_status = 'active'::public.account_lifecycle_status",
    );
  });
});
