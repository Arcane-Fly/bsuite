-- One line per document byte-sequence (storage eTag = MD5) that exists under more
-- than one tenant. Emits NO file names and NO row ids: the gate proves a shape, and
-- does not need to carry a second copy of anything identifying to do it.
--
-- The final TOTAL line is a completion marker. Without it the reader cannot tell a
-- clean estate from a query that was cut off, and treats the run as unmeasured.
with d as (
  select dm.id, dm.tenant_id, o.metadata->>'eTag' as etag
  from public.document_metadata dm
  join storage.objects o
    on o.name = dm.storage_path and o.bucket_id = dm.storage_bucket
  where o.metadata->>'eTag' is not null
),
shared as (
  select etag, count(distinct tenant_id) as tenants, count(*) as rows
  from d group by etag having count(distinct tenant_id) > 1
)
select etag, tenants, rows from shared order by tenants desc, rows desc;
select 'TOTAL', count(*), coalesce(sum(rows), 0) from (
  select count(*) as rows from public.document_metadata dm
  join storage.objects o on o.name = dm.storage_path and o.bucket_id = dm.storage_bucket
  where o.metadata->>'eTag' is not null group by o.metadata->>'eTag'
  having count(distinct dm.tenant_id) > 1) x;
