-- 20260512154500_page_layouts_responsive_styles.sql
-- Normalize page_layouts.styles from a flat style object to:
--   { desktop: StyleObj, tablet?: Partial<StyleObj>, mobile?: Partial<StyleObj> }
-- Existing rows are wrapped as { desktop: <existing-flat-style-object> }.

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
    SET styles = jsonb_build_object('desktop', COALESCE(styles, '{}'::jsonb))
    WHERE styles IS NULL
       OR (
         jsonb_typeof(styles) = 'object'
         AND NOT (styles ? 'desktop')
       );
  END IF;
END $$;

COMMIT;

