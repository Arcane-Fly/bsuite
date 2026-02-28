import type { Session, User } from '@supabase/supabase-js';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

export type AuthStore = AuthState & AuthActions;

// ─── Apprentice ──────────────────────────────────────────────────────────────

export type ApprenticeStatus = 'active' | 'inactive' | 'suspended' | 'completed';

export interface Apprentice {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  status: ApprenticeStatus;
  qualification: string;
  startDate: string;
  expectedEndDate: string;
  hostEmployer: HostEmployer;
  emergencyContact: EmergencyContact;
}

export interface HostEmployer {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// ─── Timesheet ───────────────────────────────────────────────────────────────

export type TimesheetStatus = 'pending' | 'approved' | 'rejected';

export interface Timesheet {
  id: string;
  apprenticeId: string;
  apprenticeName: string;
  weekStarting: string;
  weekEnding: string;
  totalHours: number;
  ordinaryHours: number;
  overtimeHours: number;
  status: TimesheetStatus;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
}

// ─── WHS Incident ────────────────────────────────────────────────────────────

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'investigating' | 'resolved' | 'closed';
export type IncidentType =
  | 'near_miss'
  | 'injury'
  | 'hazard'
  | 'property_damage'
  | 'environmental';

export interface WHSIncident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  location: string;
  reportedBy: string;
  reportedAt: string;
  apprenticeId: string | null;
  apprenticeName: string | null;
  resolvedAt: string | null;
  photos: string[];
}

// ─── Documents ───────────────────────────────────────────────────────────────

export type DocumentStatus = 'current' | 'expiring_soon' | 'expired';

export interface ApprenticeDocument {
  id: string;
  name: string;
  type: string;
  expiryDate: string | null;
  status: DocumentStatus;
  fileUrl: string;
  uploadedAt: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardMetric {
  label: string;
  value: number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

// ─── App State ───────────────────────────────────────────────────────────────

export interface AppState {
  isOnline: boolean;
  lastSyncAt: string | null;
  notificationCount: number;
}

export interface AppActions {
  setOnline: (online: boolean) => void;
  setLastSync: (date: string) => void;
  setNotificationCount: (count: number) => void;
  incrementNotifications: () => void;
  clearNotifications: () => void;
}

export type AppStore = AppState & AppActions;
