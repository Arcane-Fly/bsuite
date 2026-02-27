// Conduit entity types — prefixed conduit_ in database

export interface BaseEntity {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
  custom_fields?: Record<string, unknown>
}

// ─── Candidate Sourcing ───────────────────────────────────────────────

export interface Candidate extends BaseEntity {
  contact_id?: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string
  address_line1?: string
  address_line2?: string
  suburb?: string
  state?: string
  postcode?: string
  country?: string
  status: CandidateStatus
  source?: string
  source_detail?: string
  resume_url?: string
  avatar_url?: string
  skills?: string[]
  qualifications?: string[]
  preferred_locations?: string[]
  availability?: string
  notes?: string
  rating?: number
  // Joined fields
  pools?: TalentPool[]
}

export type CandidateStatus =
  | 'new'
  | 'screening'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'hired'
  | 'placed'
  | 'rejected'
  | 'withdrawn'
  | 'pooled'

export interface TalentPool extends BaseEntity {
  name: string
  description?: string
  qualification_area?: string
  trade?: string
  region?: string
  status: 'active' | 'archived'
  candidate_count?: number
  color?: string
  icon?: string
}

export interface CandidatePoolMembership {
  id: string
  candidate_id: string
  pool_id: string
  added_at: string
  added_by?: string
  notes?: string
}

// ─── Job Posting ──────────────────────────────────────────────────────

export interface Job extends BaseEntity {
  title: string
  description?: string
  short_description?: string
  employer_id?: string
  qualification_id?: string
  location?: string
  employment_type?: 'full_time' | 'part_time' | 'casual' | 'contract' | 'apprenticeship' | 'traineeship'
  award_code?: string
  salary_min?: number
  salary_max?: number
  salary_type?: 'hourly' | 'weekly' | 'annual'
  closing_date?: string
  status: JobStatus
  published_at?: string
  template_id?: string
  application_count?: number
  // Joined
  employer?: { id: string; business_name: string; trading_name?: string }
}

export type JobStatus = 'draft' | 'open' | 'closed' | 'filled' | 'cancelled'

export interface JobDistribution extends BaseEntity {
  job_id: string
  channel: string
  external_id?: string
  posted_at?: string
  expires_at?: string
  url?: string
  status: 'pending' | 'posted' | 'expired' | 'failed'
  impressions?: number
  clicks?: number
  applications?: number
}

// ─── Applications & Pipeline ──────────────────────────────────────────

export interface Application extends BaseEntity {
  candidate_id: string
  job_id: string
  applied_at: string
  source?: string
  cover_letter?: string
  resume_url?: string
  status: ApplicationStatus
  score?: number
  notes?: string
  // Joined
  candidate?: Pick<Candidate, 'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'avatar_url'>
  job?: Pick<Job, 'id' | 'title' | 'location' | 'employment_type'>
}

export type ApplicationStatus =
  | 'received'
  | 'screening'
  | 'shortlisted'
  | 'interviewing'
  | 'assessment'
  | 'reference_check'
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export interface PipelineStage extends BaseEntity {
  name: string
  order: number
  color?: string
  is_terminal: boolean
  auto_actions?: Record<string, unknown>
}

export interface PipelineEntry extends BaseEntity {
  candidate_id: string
  job_id?: string
  stage_id: string
  entered_at: string
  moved_by?: string
  notes?: string
  // Joined
  candidate?: Pick<Candidate, 'id' | 'first_name' | 'last_name' | 'email' | 'avatar_url' | 'rating'>
  stage?: Pick<PipelineStage, 'id' | 'name' | 'color' | 'order'>
}

// ─── Onboarding ───────────────────────────────────────────────────────

export interface OnboardingTemplate extends BaseEntity {
  name: string
  description?: string
  entity_type: 'candidate' | 'employer'
  qualification_area?: string
  tasks: OnboardingTaskTemplate[]
}

export interface OnboardingTaskTemplate {
  key: string
  title: string
  description?: string
  category: string
  required: boolean
  order: number
  document_type?: string
}

export interface OnboardingInstance extends BaseEntity {
  template_id: string
  candidate_id?: string
  employer_id?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled'
  started_at?: string
  completed_at?: string
  progress_percent: number
}

export interface OnboardingTask extends BaseEntity {
  instance_id: string
  task_key: string
  title: string
  category: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked'
  required: boolean
  completed_at?: string
  completed_by?: string
  document_id?: string
  notes?: string
}

// ─── Documents ────────────────────────────────────────────────────────

export interface Document extends BaseEntity {
  entity_type: 'candidate' | 'employer'
  entity_id: string
  document_type: string
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  expires_at?: string
  verified: boolean
  verified_at?: string
  verified_by?: string
}

// ─── Communications ───────────────────────────────────────────────────

export interface Communication extends BaseEntity {
  candidate_id?: string
  employer_id?: string
  channel: 'email' | 'sms' | 'phone' | 'note'
  direction: 'inbound' | 'outbound'
  subject?: string
  body: string
  sent_at?: string
  delivered_at?: string
  read_at?: string
  template_id?: string
  sent_by?: string
}

// ─── Compliance ───────────────────────────────────────────────────────

export interface ComplianceCheck extends BaseEntity {
  candidate_id?: string
  employer_id?: string
  check_type: 'vevo' | 'usi' | 'police_check' | 'wwcc' | 'medical' | 'abn' | 'insurance' | 'whs'
  status: 'pending' | 'passed' | 'failed' | 'expired' | 'not_required'
  checked_at?: string
  expires_at?: string
  reference_number?: string
  result_data?: Record<string, unknown>
  notes?: string
}
