-- Documents the encryption pass has already moved onto ciphertext, but whose
-- unencrypted ORIGINAL has not been confirmed removed from Storage.
--
-- Why this exists (bsuite#2664, F2): `documents_pending_encryption` only lists
-- documents whose metadata still says `is_encrypted = false`. The pass flips
-- that flag BEFORE it deletes the original, deliberately, so a failed delete
-- can never lose data. The cost is that the document leaves the view at that
-- moment: without this second measure the watch would read 0, and close its
-- issue, while an unencrypted copy is still stored. Two states mean exactly
-- that:
--
--   * status 'cleanup_pending'  - ciphertext verified and committed; removing
--                                 the original failed.
--   * status 'processing' and the document's metadata already points at THIS
--     event's ciphertext         - the metadata commit landed and the call died
--                                 before the original was removed.
--
-- Any other state is not a leftover: 'processing' with metadata still on the
-- original means nothing was committed, and succeeded/failed/skipped are final.
--
-- Both the watch's self-test and its count read THIS view, so the self-test
-- proves the same predicate the count uses. It emits ids only: no file names,
-- no storage paths, nothing about a person.
CREATE TEMP VIEW encryption_leftover_plaintext AS
SELECT DISTINCT e.tenant_id, r.document_category, e.document_id
  FROM public.document_encryption_events e
  JOIN public.document_encryption_runs r ON r.id = e.run_id
 WHERE e.status = 'cleanup_pending'
    OR (e.status = 'processing'
        AND EXISTS (SELECT 1
                      FROM public.document_metadata m
                     WHERE m.id = e.document_id
                       AND m.is_encrypted
                       AND m.storage_path = e.encrypted_storage_path));
