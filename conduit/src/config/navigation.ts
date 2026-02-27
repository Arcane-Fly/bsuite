import type { NavConfig } from '@bsuite/nav-core';
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderOpen,
  KanbanSquare,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Conduit ATS — data-driven navigation config using @bsuite/nav-core types
// ---------------------------------------------------------------------------

export const NAV_CONFIG: NavConfig = {
  app: {
    name: 'Conduit',
    shortName: 'CD',
    homeHref: '/candidates',
  },
  sections: [
    {
      label: 'Talent',
      icon: Users,
      groups: [
        [
          { label: 'Candidates', href: '/candidates', icon: Users },
          { label: 'Talent Pools', href: '/talent-pools', icon: FolderOpen },
          { label: 'Jobs', href: '/jobs', icon: Briefcase },
        ],
      ],
      defaultOpen: true,
    },
    {
      label: 'Pipeline',
      icon: KanbanSquare,
      groups: [
        [
          { label: 'Pipeline', href: '/pipeline', icon: KanbanSquare },
          { label: 'Offers', href: '/offers', icon: FileText },
          { label: 'Interviews', href: '/interviews', icon: CalendarDays },
        ],
      ],
    },
    {
      label: 'Operations',
      icon: ClipboardCheck,
      groups: [
        [
          { label: 'Onboarding', href: '/onboarding', icon: ClipboardCheck },
          { label: 'Compliance', href: '/compliance', icon: ShieldCheck },
        ],
      ],
    },
    {
      label: 'Insights',
      icon: BarChart3,
      href: '/analytics',
      groups: [
        [{ label: 'Analytics', href: '/analytics', icon: BarChart3 }],
      ],
    },
    {
      label: 'Admin',
      icon: Settings,
      href: '/settings',
      groups: [
        [{ label: 'Settings', href: '/settings', icon: Settings }],
      ],
    },
  ],
  suiteLinks: [
    { label: 'BSuite Portal', href: 'https://suite.crm7.app', external: true },
    { label: 'CRM7', href: 'https://crm7.app', external: true },
    { label: 'R80 Calculator', href: 'https://r80.crm7.app', external: true },
  ],
};
