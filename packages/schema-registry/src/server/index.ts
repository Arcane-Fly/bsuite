// Server entry point for @bsuite/schema-registry.
//
// Note: prefetchTenantPageLayout was removed in 0.3.0 along with
// TenantLayoutSlot/useTenantPageLayout — the underlying tenant_page_layouts
// table was atomically dropped 2026-04-29 per ADR-0001. Page-builder
// responsibility moved to CRM7's custom_pages; consumer apps render via
// per-app `CustomPageRenderer` components per ADR-0003 (no shared package
// for the renderer).
export {};
