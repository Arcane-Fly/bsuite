-- 20260512154501_revert_page_layouts_responsive_styles.sql
-- Rollback twin for 20260512154500_page_layouts_responsive_styles.sql.
-- Collapses responsive style objects back to a flat object by keeping desktop.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'page_layouts'
      AND column_name = 'styles'
  ) THEN
    UPDATE public.page_layouts
    SET styles = COALESCE(styles->'desktop', '{}'::jsonb)
    WHERE jsonb_typeof(styles) = 'object'
      AND styles ? 'desktop';
  END IF;
END $$;

COMMIT;

