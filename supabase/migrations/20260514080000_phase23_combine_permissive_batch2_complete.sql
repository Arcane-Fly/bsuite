-- Phase 2.3 batch 2 (FINAL) — combine all remaining PERMISSIVE policy overlaps
-- Per bsuite#963 epic. Applied to prod via Supabase MCP apply_migration on 2026-05-14
-- across 6 sub-batches (2a-2f). This file is the consolidated source-of-truth.
--
-- Result: multiple_permissive_policies advisor: 56 → 0 (verified post-application).
-- Workflow auto-apply still broken per bsuite#961, hence MCP application + this
-- source-parity commit.
--
-- Pattern: split FOR ALL policies (which span SELECT) into separate INSERT/
-- UPDATE/DELETE policies, then combine the SELECT-overlapping policies into
-- ONE policy per role with OR-merged predicates. Service-role policies
-- untouched throughout (different role, no overlap with authenticated).

-- ─── Pattern B (hierarchy + tenant_read) — 4 tables ────────────────────────
DROP POLICY IF EXISTS "apprentices_hierarchy_select" ON public.apprentices;
DROP POLICY IF EXISTS "tenant_read_apprentices" ON public.apprentices;
CREATE POLICY "apprentices_select" ON public.apprentices FOR SELECT TO authenticated
  USING ((tenant_id IS NOT NULL AND has_parent_admin_access(tenant_id)) OR (tenant_id IN (SELECT auth_tenant_id())));

DROP POLICY IF EXISTS "clients_hierarchy_select" ON public.clients;
DROP POLICY IF EXISTS "tenant_read_clients" ON public.clients;
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated
  USING ((tenant_id IS NOT NULL AND has_parent_admin_access(tenant_id)) OR (tenant_id IN (SELECT auth_tenant_id())));

DROP POLICY IF EXISTS "contacts_hierarchy_select" ON public.contacts;
DROP POLICY IF EXISTS "tenant_read_contacts" ON public.contacts;
CREATE POLICY "contacts_select" ON public.contacts FOR SELECT TO authenticated
  USING ((tenant_id IS NOT NULL AND has_parent_admin_access(tenant_id)) OR (tenant_id IN (SELECT auth_tenant_id())));

DROP POLICY IF EXISTS "financial_records_hierarchy_select" ON public.financial_records;
DROP POLICY IF EXISTS "tenant_read_financial_records" ON public.financial_records;
CREATE POLICY "financial_records_select" ON public.financial_records FOR SELECT TO authenticated
  USING ((tenant_id IS NOT NULL AND has_parent_admin_access(tenant_id)) OR (tenant_id IN (SELECT auth_tenant_id())));

-- ─── Pattern A (gto_staff_all + tenant_read [+ host/apprentice variants]) ──
-- credit_notes
DROP POLICY IF EXISTS "credit_notes_gto_staff_all" ON public.credit_notes;
DROP POLICY IF EXISTS "credit_notes_tenant_read" ON public.credit_notes;
CREATE POLICY "credit_notes_select" ON public.credit_notes FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid())));
CREATE POLICY "credit_notes_gto_staff_insert" ON public.credit_notes FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "credit_notes_gto_staff_update" ON public.credit_notes FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "credit_notes_gto_staff_delete" ON public.credit_notes FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- invoices
DROP POLICY IF EXISTS "invoices_gto_staff_all" ON public.invoices;
DROP POLICY IF EXISTS "invoices_host_supervisor_read" ON public.invoices;
DROP POLICY IF EXISTS "invoices_tenant_read" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR host_employer_id = get_user_host_employer_id() OR tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid())));
CREATE POLICY "invoices_gto_staff_insert" ON public.invoices FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "invoices_gto_staff_update" ON public.invoices FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "invoices_gto_staff_delete" ON public.invoices FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- invoice_batches
DROP POLICY IF EXISTS "invoice_batches_gto_staff_all" ON public.invoice_batches;
DROP POLICY IF EXISTS "invoice_batches_tenant_read" ON public.invoice_batches;
CREATE POLICY "invoice_batches_select" ON public.invoice_batches FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid())));
CREATE POLICY "invoice_batches_gto_staff_insert" ON public.invoice_batches FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "invoice_batches_gto_staff_update" ON public.invoice_batches FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "invoice_batches_gto_staff_delete" ON public.invoice_batches FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- invoice_line_items
DROP POLICY IF EXISTS "invoice_lines_gto_staff_all" ON public.invoice_line_items;
DROP POLICY IF EXISTS "invoice_lines_host_supervisor_read" ON public.invoice_line_items;
DROP POLICY IF EXISTS "invoice_lines_tenant_read" ON public.invoice_line_items;
CREATE POLICY "invoice_lines_select" ON public.invoice_line_items FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_line_items.invoice_id AND i.host_employer_id = get_user_host_employer_id()) OR tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid())));
CREATE POLICY "invoice_lines_gto_staff_insert" ON public.invoice_line_items FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "invoice_lines_gto_staff_update" ON public.invoice_line_items FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "invoice_lines_gto_staff_delete" ON public.invoice_line_items FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- invoice_batch_items
DROP POLICY IF EXISTS "invoice_batch_items_gto_staff_all" ON public.invoice_batch_items;
DROP POLICY IF EXISTS "invoice_batch_items_tenant_read" ON public.invoice_batch_items;
CREATE POLICY "invoice_batch_items_select" ON public.invoice_batch_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_batch_items.invoice_id AND is_gto_staff(i.tenant_id))
    OR invoice_id IN (SELECT i.id FROM invoices i WHERE i.tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()))));
CREATE POLICY "invoice_batch_items_gto_staff_insert" ON public.invoice_batch_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_batch_items.invoice_id AND is_gto_staff(i.tenant_id)));
CREATE POLICY "invoice_batch_items_gto_staff_update" ON public.invoice_batch_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_batch_items.invoice_id AND is_gto_staff(i.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_batch_items.invoice_id AND is_gto_staff(i.tenant_id)));
CREATE POLICY "invoice_batch_items_gto_staff_delete" ON public.invoice_batch_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_batch_items.invoice_id AND is_gto_staff(i.tenant_id)));

-- lln_assessments
DROP POLICY IF EXISTS "lln_gto_staff_all" ON public.lln_assessments;
DROP POLICY IF EXISTS "lln_apprentice_read" ON public.lln_assessments;
CREATE POLICY "lln_select" ON public.lln_assessments FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR apprentice_id = get_user_apprentice_id());
CREATE POLICY "lln_gto_staff_insert" ON public.lln_assessments FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "lln_gto_staff_update" ON public.lln_assessments FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "lln_gto_staff_delete" ON public.lln_assessments FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- payments
DROP POLICY IF EXISTS "payments_gto_staff_all" ON public.payments;
DROP POLICY IF EXISTS "payments_host_supervisor_read" ON public.payments;
DROP POLICY IF EXISTS "payments_tenant_read" ON public.payments;
CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR EXISTS (SELECT 1 FROM invoices i WHERE i.id = payments.invoice_id AND i.host_employer_id = get_user_host_employer_id()) OR tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid())));
CREATE POLICY "payments_gto_staff_insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "payments_gto_staff_update" ON public.payments FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "payments_gto_staff_delete" ON public.payments FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- whs_audits
DROP POLICY IF EXISTS "whs_audits_gto_staff_all" ON public.whs_audits;
DROP POLICY IF EXISTS "whs_audits_host_read" ON public.whs_audits;
CREATE POLICY "whs_audits_select" ON public.whs_audits FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR host_employer_id = get_user_host_employer_id());
CREATE POLICY "whs_audits_gto_staff_insert" ON public.whs_audits FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "whs_audits_gto_staff_update" ON public.whs_audits FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "whs_audits_gto_staff_delete" ON public.whs_audits FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- ─── apprentice_placements (manage subset of view) ─────────────────────────
DROP POLICY IF EXISTS "Users can view placements for their tenant's apprentices" ON public.apprentice_placements;

-- ─── guardian_consents ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "gc_gto_staff_all" ON public.guardian_consents;
DROP POLICY IF EXISTS "gc_apprentice_read" ON public.guardian_consents;
CREATE POLICY "gc_select" ON public.guardian_consents FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR apprentice_id = get_user_apprentice_id());
CREATE POLICY "gc_gto_staff_insert" ON public.guardian_consents FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "gc_gto_staff_update" ON public.guardian_consents FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "gc_gto_staff_delete" ON public.guardian_consents FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- ─── induction_records (3-class: staff + apprentice + host) ────────────────
DROP POLICY IF EXISTS "induction_gto_staff_all" ON public.induction_records;
DROP POLICY IF EXISTS "induction_apprentice_read" ON public.induction_records;
DROP POLICY IF EXISTS "induction_host_read" ON public.induction_records;
CREATE POLICY "induction_select" ON public.induction_records FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR apprentice_id = get_user_apprentice_id() OR host_employer_id = get_user_host_employer_id());
CREATE POLICY "induction_gto_staff_insert" ON public.induction_records FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "induction_gto_staff_update" ON public.induction_records FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "induction_gto_staff_delete" ON public.induction_records FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- ─── payroll_records ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "payroll_records_gto_staff_all" ON public.payroll_records;
DROP POLICY IF EXISTS "payroll_records_apprentice_own" ON public.payroll_records;
CREATE POLICY "payroll_records_select" ON public.payroll_records FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR apprentice_id = (SELECT get_user_apprentice_id()));
CREATE POLICY "payroll_records_gto_staff_insert" ON public.payroll_records FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "payroll_records_gto_staff_update" ON public.payroll_records FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "payroll_records_gto_staff_delete" ON public.payroll_records FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- ─── r7_applications, r7_candidates, r7_documents (PUBLIC ALL + portal_self_select) ─
DROP POLICY IF EXISTS "r7_applications_tenant_isolation" ON public.r7_applications;
DROP POLICY IF EXISTS "r7_applications_portal_self_select" ON public.r7_applications;
CREATE POLICY "r7_applications_select" ON public.r7_applications FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active') OR candidate_id = r7_candidate_id_for_auth_user());
CREATE POLICY "r7_applications_tenant_insert" ON public.r7_applications FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));
CREATE POLICY "r7_applications_tenant_update" ON public.r7_applications FOR UPDATE TO authenticated USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active')) WITH CHECK (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));
CREATE POLICY "r7_applications_tenant_delete" ON public.r7_applications FOR DELETE TO authenticated USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));

DROP POLICY IF EXISTS "r7_candidates_tenant_isolation" ON public.r7_candidates;
DROP POLICY IF EXISTS "r7_candidates_portal_self_select" ON public.r7_candidates;
CREATE POLICY "r7_candidates_select" ON public.r7_candidates FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active') OR id = r7_candidate_id_for_auth_user());
CREATE POLICY "r7_candidates_tenant_insert" ON public.r7_candidates FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));
CREATE POLICY "r7_candidates_tenant_update" ON public.r7_candidates FOR UPDATE TO authenticated USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active')) WITH CHECK (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));
CREATE POLICY "r7_candidates_tenant_delete" ON public.r7_candidates FOR DELETE TO authenticated USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));

DROP POLICY IF EXISTS "r7_documents_tenant_isolation" ON public.r7_documents;
DROP POLICY IF EXISTS "r7_documents_portal_self_select" ON public.r7_documents;
CREATE POLICY "r7_documents_select" ON public.r7_documents FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active') OR (entity_type = 'candidate' AND entity_id = r7_candidate_id_for_auth_user()));
CREATE POLICY "r7_documents_tenant_insert" ON public.r7_documents FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));
CREATE POLICY "r7_documents_tenant_update" ON public.r7_documents FOR UPDATE TO authenticated USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active')) WITH CHECK (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));
CREATE POLICY "r7_documents_tenant_delete" ON public.r7_documents FOR DELETE TO authenticated USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));

-- ─── r7_interviews + r7_offers (drop redundant SELECT, keep tenant_view + portal_self) ─
DROP POLICY IF EXISTS "Tenant members can view interviews" ON public.r7_interviews;
DROP POLICY IF EXISTS "r7_interviews_portal_self_select" ON public.r7_interviews;
CREATE POLICY "r7_interviews_select" ON public.r7_interviews FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid())) OR candidate_id = r7_candidate_id_for_auth_user());

DROP POLICY IF EXISTS "Tenant members can view offers" ON public.r7_offers;
DROP POLICY IF EXISTS "r7_offers_portal_self_select" ON public.r7_offers;
CREATE POLICY "r7_offers_select" ON public.r7_offers FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid())) OR candidate_id = r7_candidate_id_for_auth_user());

-- ─── r7_jobs (3-way SELECT: tenant + applied + public published, with anon support) ─
DROP POLICY IF EXISTS "r7_jobs_tenant_isolation" ON public.r7_jobs;
DROP POLICY IF EXISTS "r7_jobs_portal_applied_select" ON public.r7_jobs;
DROP POLICY IF EXISTS "r7_jobs_public_published_select" ON public.r7_jobs;
CREATE POLICY "r7_jobs_select_anon" ON public.r7_jobs FOR SELECT TO anon
  USING (status = 'open' AND published_at IS NOT NULL);
CREATE POLICY "r7_jobs_select_authenticated" ON public.r7_jobs FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active')
    OR id IN (SELECT r7_applications.job_id FROM r7_applications WHERE r7_applications.candidate_id = r7_candidate_id_for_auth_user())
    OR (status = 'open' AND published_at IS NOT NULL));
CREATE POLICY "r7_jobs_tenant_insert" ON public.r7_jobs FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));
CREATE POLICY "r7_jobs_tenant_update" ON public.r7_jobs FOR UPDATE TO authenticated USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active')) WITH CHECK (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));
CREATE POLICY "r7_jobs_tenant_delete" ON public.r7_jobs FOR DELETE TO authenticated USING (tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.status = 'active'));

-- ─── timesheet_events ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "timesheet_events_gto_staff_insert" ON public.timesheet_events;
DROP POLICY IF EXISTS "timesheet_events_gto_staff_all" ON public.timesheet_events;
DROP POLICY IF EXISTS "timesheet_events_authenticated_select" ON public.timesheet_events;
CREATE POLICY "timesheet_events_select" ON public.timesheet_events FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR EXISTS (SELECT 1 FROM timesheets t WHERE t.id = timesheet_events.timesheet_id));
CREATE POLICY "timesheet_events_gto_staff_insert" ON public.timesheet_events FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "timesheet_events_gto_staff_update" ON public.timesheet_events FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "timesheet_events_gto_staff_delete" ON public.timesheet_events FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- ─── wage_calculation_snapshots ────────────────────────────────────────────
DROP POLICY IF EXISTS "wage_calc_snapshots_platform_admin" ON public.wage_calculation_snapshots;
DROP POLICY IF EXISTS "wage_calc_snapshots_staff_insert" ON public.wage_calculation_snapshots;
DROP POLICY IF EXISTS "wage_calc_snapshots_apprentice_self_select" ON public.wage_calculation_snapshots;
DROP POLICY IF EXISTS "wage_calc_snapshots_tenant_select" ON public.wage_calculation_snapshots;
CREATE POLICY "wage_calc_snapshots_select" ON public.wage_calculation_snapshots FOR SELECT TO authenticated
  USING (is_platform_admin() OR apprentice_id = get_user_apprentice_id() OR tenant_id IN (SELECT auth_tenant_id()));
CREATE POLICY "wage_calc_snapshots_insert" ON public.wage_calculation_snapshots FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin() OR (is_gto_staff() AND tenant_id IN (SELECT auth_tenant_id())));
CREATE POLICY "wage_calc_snapshots_update" ON public.wage_calculation_snapshots FOR UPDATE TO authenticated USING (is_platform_admin()) WITH CHECK (is_platform_admin());
CREATE POLICY "wage_calc_snapshots_delete" ON public.wage_calculation_snapshots FOR DELETE TO authenticated USING (is_platform_admin());

-- ─── report_deliveries ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "report_deliveries_gto_staff_all" ON public.report_deliveries;
DROP POLICY IF EXISTS "report_deliveries_requester_read" ON public.report_deliveries;
CREATE POLICY "report_deliveries_select" ON public.report_deliveries FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR requested_by = (SELECT auth.uid()));
CREATE POLICY "report_deliveries_gto_staff_insert" ON public.report_deliveries FOR INSERT TO authenticated WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "report_deliveries_gto_staff_update" ON public.report_deliveries FOR UPDATE TO authenticated USING (is_gto_staff(tenant_id)) WITH CHECK (is_gto_staff(tenant_id));
CREATE POLICY "report_deliveries_gto_staff_delete" ON public.report_deliveries FOR DELETE TO authenticated USING (is_gto_staff(tenant_id));

-- ─── report_templates ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "report_templates_gto_staff_write" ON public.report_templates;
DROP POLICY IF EXISTS "report_templates_system_read" ON public.report_templates;
DROP POLICY IF EXISTS "report_templates_tenant_read" ON public.report_templates;
CREATE POLICY "report_templates_select" ON public.report_templates FOR SELECT TO authenticated
  USING (is_system = true OR (is_gto_staff(tenant_id) AND is_system = false) OR (is_system = false AND tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()))));
CREATE POLICY "report_templates_gto_staff_insert" ON public.report_templates FOR INSERT TO authenticated WITH CHECK (is_system = false AND is_gto_staff(tenant_id));
CREATE POLICY "report_templates_gto_staff_update" ON public.report_templates FOR UPDATE TO authenticated USING (is_system = false AND is_gto_staff(tenant_id)) WITH CHECK (is_system = false AND is_gto_staff(tenant_id));
CREATE POLICY "report_templates_gto_staff_delete" ON public.report_templates FOR DELETE TO authenticated USING (is_system = false AND is_gto_staff(tenant_id));

-- ─── role_capabilities ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_admins_write_role_capabilities" ON public.role_capabilities;
DROP POLICY IF EXISTS "tenant_members_read_role_capabilities" ON public.role_capabilities;
CREATE POLICY "role_capabilities_select" ON public.role_capabilities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.tenant_id = role_capabilities.tenant_id));
CREATE POLICY "role_capabilities_admin_insert" ON public.role_capabilities FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.tenant_id = role_capabilities.tenant_id AND ut.role = ANY(ARRAY['tenant_admin','platform_admin','owner','admin'])));
CREATE POLICY "role_capabilities_admin_update" ON public.role_capabilities FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.tenant_id = role_capabilities.tenant_id AND ut.role = ANY(ARRAY['tenant_admin','platform_admin','owner','admin'])))
  WITH CHECK (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.tenant_id = role_capabilities.tenant_id AND ut.role = ANY(ARRAY['tenant_admin','platform_admin','owner','admin'])));
CREATE POLICY "role_capabilities_admin_delete" ON public.role_capabilities FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.tenant_id = role_capabilities.tenant_id AND ut.role = ANY(ARRAY['tenant_admin','platform_admin','owner','admin'])));

-- ─── org_members ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "org_members_authenticated_write" ON public.org_members;
DROP POLICY IF EXISTS "org_members_self_select" ON public.org_members;
CREATE POLICY "org_members_select" ON public.org_members FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (is_gto_admin() AND tenant_id IN (SELECT auth_tenant_id())) OR is_platform_admin());
CREATE POLICY "org_members_admin_insert" ON public.org_members FOR INSERT TO authenticated
  WITH CHECK ((is_gto_admin() AND tenant_id IN (SELECT auth_tenant_id())) OR is_platform_admin());
CREATE POLICY "org_members_admin_update" ON public.org_members FOR UPDATE TO authenticated
  USING ((is_gto_admin() AND tenant_id IN (SELECT auth_tenant_id())) OR is_platform_admin())
  WITH CHECK ((is_gto_admin() AND tenant_id IN (SELECT auth_tenant_id())) OR is_platform_admin());
CREATE POLICY "org_members_admin_delete" ON public.org_members FOR DELETE TO authenticated
  USING ((is_gto_admin() AND tenant_id IN (SELECT auth_tenant_id())) OR is_platform_admin());

-- ─── apprentice_rate_configs (3-way: public + tenant + write) ──────────────
DROP POLICY IF EXISTS "arc_tenant_write" ON public.apprentice_rate_configs;
DROP POLICY IF EXISTS "arc_public_read" ON public.apprentice_rate_configs;
DROP POLICY IF EXISTS "arc_tenant_read" ON public.apprentice_rate_configs;
CREATE POLICY "arc_select_anon" ON public.apprentice_rate_configs FOR SELECT TO anon USING (tenant_id IS NULL);
CREATE POLICY "arc_select_authenticated" ON public.apprentice_rate_configs FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT user_tenants.tenant_id FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()))));
CREATE POLICY "arc_tenant_admin_insert" ON public.apprentice_rate_configs FOR INSERT TO authenticated
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.role = ANY(ARRAY['admin','manager','gto_officer'])));
CREATE POLICY "arc_tenant_admin_update" ON public.apprentice_rate_configs FOR UPDATE TO authenticated
  USING (tenant_id IS NOT NULL AND tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.role = ANY(ARRAY['admin','manager','gto_officer'])))
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.role = ANY(ARRAY['admin','manager','gto_officer'])));
CREATE POLICY "arc_tenant_admin_delete" ON public.apprentice_rate_configs FOR DELETE TO authenticated
  USING (tenant_id IS NOT NULL AND tenant_id IN (SELECT ut.tenant_id FROM user_tenants ut WHERE ut.user_id = (SELECT auth.uid()) AND ut.role = ANY(ARRAY['admin','manager','gto_officer'])));

-- ─── placements (Pattern B) ────────────────────────────────────────────────
DROP POLICY IF EXISTS "placements_hierarchy_select" ON public.placements;
DROP POLICY IF EXISTS "tenant_read_placements" ON public.placements;
CREATE POLICY "placements_select" ON public.placements FOR SELECT TO authenticated
  USING ((tenant_id IS NOT NULL AND has_parent_admin_access(tenant_id)) OR tenant_id IN (SELECT auth_tenant_id()));

-- ─── profiles_privileged_audit ────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_privileged_audit_deny_writes" ON public.profiles_privileged_audit;
DROP POLICY IF EXISTS "profiles_privileged_audit_super_admin_read" ON public.profiles_privileged_audit;
CREATE POLICY "profiles_privileged_audit_select" ON public.profiles_privileged_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.is_super_admin = true));
CREATE POLICY "profiles_privileged_audit_deny_insert" ON public.profiles_privileged_audit FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "profiles_privileged_audit_deny_update" ON public.profiles_privileged_audit FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "profiles_privileged_audit_deny_delete" ON public.profiles_privileged_audit FOR DELETE TO authenticated USING (false);

-- ─── super_admin_action_audit ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Tenant admins can view their tenant audit" ON public.super_admin_action_audit;
DROP POLICY IF EXISTS "super_admin_audit_select" ON public.super_admin_action_audit;
CREATE POLICY "super_admin_audit_select" ON public.super_admin_action_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_super_admin = true)
    OR EXISTS (SELECT 1 FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.tenant_id = super_admin_action_audit.tenant_id AND user_tenants.role = ANY(ARRAY['owner','admin','manager'])));

-- ─── tenant_navigation ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_navigation_write_owner" ON public.tenant_navigation;
DROP POLICY IF EXISTS "tenant_navigation_select" ON public.tenant_navigation;
CREATE POLICY "tenant_navigation_select" ON public.tenant_navigation FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT id FROM ancestors_of((SELECT auth_tenant_id()))));
CREATE POLICY "tenant_navigation_owner_insert" ON public.tenant_navigation FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.tenant_id = tenant_navigation.tenant_id AND user_tenants.role = 'owner'));
CREATE POLICY "tenant_navigation_owner_update" ON public.tenant_navigation FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.tenant_id = tenant_navigation.tenant_id AND user_tenants.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.tenant_id = tenant_navigation.tenant_id AND user_tenants.role = 'owner'));
CREATE POLICY "tenant_navigation_owner_delete" ON public.tenant_navigation FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_tenants WHERE user_tenants.user_id = (SELECT auth.uid()) AND user_tenants.tenant_id = tenant_navigation.tenant_id AND user_tenants.role = 'owner'));

-- ─── tenants ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Developers can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their own tenants" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT TO authenticated
  USING (is_platform_admin() OR id IN (SELECT auth_tenant_id()));

-- ─── timesheets (4-class: tenant + staff + apprentice + host_supervisor) ───
DROP POLICY IF EXISTS "tenant_isolation" ON public.timesheets;
DROP POLICY IF EXISTS "timesheets_gto_staff_all" ON public.timesheets;
DROP POLICY IF EXISTS "timesheets_apprentice_own" ON public.timesheets;
DROP POLICY IF EXISTS "timesheets_host_supervisor_select" ON public.timesheets;
CREATE POLICY "timesheets_select" ON public.timesheets FOR SELECT TO authenticated
  USING (is_gto_staff(tenant_id) OR person_id = (SELECT get_user_apprentice_id())
    OR EXISTS (SELECT 1 FROM engagements e WHERE e.worker_id = timesheets.person_id AND e.host_org_id = (SELECT get_user_host_employer_id()))
    OR tenant_id IN (SELECT auth_tenant_id()));
CREATE POLICY "timesheets_tenant_insert" ON public.timesheets FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT auth_tenant_id()));
CREATE POLICY "timesheets_tenant_update" ON public.timesheets FOR UPDATE TO authenticated USING (tenant_id IN (SELECT auth_tenant_id())) WITH CHECK (tenant_id IN (SELECT auth_tenant_id()));
CREATE POLICY "timesheets_tenant_delete" ON public.timesheets FOR DELETE TO authenticated USING (tenant_id IN (SELECT auth_tenant_id()));
