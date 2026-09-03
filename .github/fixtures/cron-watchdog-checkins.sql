-- FIXTURE: the shape public.cron_watchdog_checkins must have, stated HERE so the
-- observer's self-test can run on a pull request without reaching production.
--
-- WHY A FIXTURE AT ALL. The real table is created by crm7 migration
-- 20261117000000, and crm7 is a SUBMODULE pinned by gitlink — on a pull request
-- that does not advance that gitlink, the migration is simply not in the tree.
-- The observer's DB-backed self-test used to live in the schedule-only job and
-- therefore never ran in CI at all; the proof existed only in a local
-- transcript. This file is what lets it run on every PR instead.
--
-- WHY IT IS NOT A DRIFT HAZARD. The workflow prefers the REAL migration whenever
-- the submodule carries it, and either way asserts the resulting column set
-- against a contract written in the workflow. A rename in crm7 fails that
-- assertion the moment the gitlink advances, rather than being discovered by a
-- 3am alarm that returns null.
--
-- It deliberately does NOT create public.pg_cron_watchdog_check() or
-- public.cron_job_manifest: the observer never calls the function and never
-- reads the manifest. It reads the newest check-in row and nothing else, and a
-- fixture that supplied more than the thing under test needs would be claiming
-- to prove more than it does. The predicate itself is proven by crm7's pgTAP
-- suite 91, which runs against the real migration.

CREATE TABLE IF NOT EXISTS public.cron_watchdog_checkins (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ran_at            timestamptz NOT NULL DEFAULT now(),
  healthy           boolean     NOT NULL,
  jobs_examined     integer     NOT NULL,
  manifest_rows     integer     NOT NULL,
  unhealthy_jobs    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  expected_missing  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  http_failures     jsonb       NOT NULL DEFAULT '[]'::jsonb
);
