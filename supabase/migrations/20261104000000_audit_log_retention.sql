-- =====================================================================
-- Audit-log retention: the log holds personal data (emails, IP addresses),
-- so entries older than 180 days are deleted automatically on the 1st of
-- every month at 03:00 UTC, using Postgres' built-in scheduler (pg_cron).
-- purge_old_audit_logs() is service-role only (see security_hardening);
-- the scheduler runs as the database owner.
-- =====================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- Re-running this migration replaces the job instead of adding a second one.
select cron.unschedule(jobid) from cron.job where jobname = 'purge-old-audit-logs';

select cron.schedule(
  'purge-old-audit-logs',
  '0 3 1 * *',
  $$select public.purge_old_audit_logs(180)$$
);
