/**
 * Unified Permission Constants for Conduit ATS
 *
 * Single source of truth for all permission strings.
 * Permissions are grouped by ATS domain and exported as typed string
 * literal unions (not enums) for tree-shaking and JSON compatibility.
 *
 * Domains: candidates, jobs, pipeline, offers, interviews,
 * onboarding, compliance, analytics, settings, ai, communications
 */

// ---------------------------------------------------------------------------
// Candidate permissions
// ---------------------------------------------------------------------------
export const CANDIDATE_PERMISSIONS = [
  'view_candidates',
  'manage_candidates',
  'create_candidate',
  'edit_candidate',
  'delete_candidate',
] as const

export type CandidatePermission = (typeof CANDIDATE_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Job permissions
// ---------------------------------------------------------------------------
export const JOB_PERMISSIONS = [
  'view_jobs',
  'manage_jobs',
  'create_job',
  'edit_job',
  'delete_job',
  'distribute_job',
] as const

export type JobPermission = (typeof JOB_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Pipeline permissions
// ---------------------------------------------------------------------------
export const PIPELINE_PERMISSIONS = [
  'view_pipeline',
  'manage_pipeline',
  'move_candidates',
] as const

export type PipelinePermission = (typeof PIPELINE_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Offer permissions
// ---------------------------------------------------------------------------
export const OFFER_PERMISSIONS = [
  'view_offers',
  'manage_offers',
  'create_offer',
  'approve_offer',
] as const

export type OfferPermission = (typeof OFFER_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Interview permissions
// ---------------------------------------------------------------------------
export const INTERVIEW_PERMISSIONS = [
  'view_interviews',
  'manage_interviews',
  'schedule_interview',
] as const

export type InterviewPermission = (typeof INTERVIEW_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Onboarding permissions
// ---------------------------------------------------------------------------
export const ONBOARDING_PERMISSIONS = [
  'view_onboarding',
  'manage_onboarding',
  'create_onboarding_template',
] as const

export type OnboardingPermission = (typeof ONBOARDING_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Compliance permissions
// ---------------------------------------------------------------------------
export const COMPLIANCE_PERMISSIONS = [
  'view_compliance',
  'manage_compliance',
] as const

export type CompliancePermission = (typeof COMPLIANCE_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Analytics permissions
// ---------------------------------------------------------------------------
export const ANALYTICS_PERMISSIONS = [
  'view_analytics',
  'export_analytics',
] as const

export type AnalyticsPermission = (typeof ANALYTICS_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Talent pool permissions
// ---------------------------------------------------------------------------
export const TALENT_POOL_PERMISSIONS = [
  'view_talent_pools',
  'manage_talent_pools',
] as const

export type TalentPoolPermission = (typeof TALENT_POOL_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Communication permissions
// ---------------------------------------------------------------------------
export const COMMUNICATION_PERMISSIONS = [
  'view_communications',
  'manage_communications',
] as const

export type CommunicationPermission = (typeof COMMUNICATION_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// AI permissions
// ---------------------------------------------------------------------------
export const AI_PERMISSIONS = [
  'use_ai_assistant',
] as const

export type AIPermission = (typeof AI_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Settings / Admin permissions
// ---------------------------------------------------------------------------
export const SETTINGS_PERMISSIONS = [
  'view_settings',
  'manage_settings',
  'manage_users',
  'manage_roles',
] as const

export type SettingsPermission = (typeof SETTINGS_PERMISSIONS)[number]

// ---------------------------------------------------------------------------
// Unified Permission type
// ---------------------------------------------------------------------------
export const ALL_PERMISSIONS = [
  ...CANDIDATE_PERMISSIONS,
  ...JOB_PERMISSIONS,
  ...PIPELINE_PERMISSIONS,
  ...OFFER_PERMISSIONS,
  ...INTERVIEW_PERMISSIONS,
  ...ONBOARDING_PERMISSIONS,
  ...COMPLIANCE_PERMISSIONS,
  ...ANALYTICS_PERMISSIONS,
  ...TALENT_POOL_PERMISSIONS,
  ...COMMUNICATION_PERMISSIONS,
  ...AI_PERMISSIONS,
  ...SETTINGS_PERMISSIONS,
] as const

export type Permission = (typeof ALL_PERMISSIONS)[number]
